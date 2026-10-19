import { useEffect, useMemo, useRef, useState } from "react";
import { FONT_FAMILY } from "./CaptionOverlay.jsx";
import { boxHeight, cq, displayLines, expandLayers, layerState, layerTransform } from "../lib/textfx.js";

// Widest line of a layer in px at its font size (same font the preview draws with).
let measureCtx = null;
function measureLayer(l) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  const family = FONT_FAMILY[l.font_family] || FONT_FAMILY.montserrat;
  measureCtx.font = `${l.italic ? "italic " : ""}${l.font_weight} ${l.font_size}px ${family}`;
  return Math.max(0, ...displayLines(l).map((ln) => measureCtx.measureText(ln).width));
}

// Live preview of the title text effects, stacked inside the phone frame:
//
//   video  ->  text layers that hide behind the person  ->  person cut-out canvas
//          ->  text layers in front  ->  captions (CaptionOverlay)
//
// The cut-out canvas redraws the video's own pixels, masked by matte.mp4, only
// inside the boxes of the occluding layers, so the person appears in front of the
// text (hair, arms, hands) and the video controls stay usable everywhere else.
// Subtitle text with some words coloured in the Captions tab.
function colouredLines(l) {
  let k = 0;
  return displayLines(l).map((ln, i, all) => (
    <span key={i}>
      {ln.split(" ").map((w, j) => {
        const col = l.word_colors[k++];
        return <span key={j} style={col ? { color: col } : undefined}>{j ? " " : ""}{w}</span>;
      })}
      {i < all.length - 1 ? "\n" : ""}
    </span>
  ));
}

export default function FxOverlay({ videoRef, layers: rawLayers, captions, matteSrc, matteState, editable, selectedId, onSelect, onMove }) {
  const [t, setT] = useState(0);
  // Re-measure once web fonts have loaded, so subtitle text fits like the export.
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsTick((n) => n + 1)).catch(() => {});
  }, []);
  // "Subtitles" layers become one layer per caption line (text from the captions).
  const layers = useMemo(() => expandLayers(rawLayers, captions, measureLayer), [rawLayers, captions, fontsTick]);
  const canvasRef = useRef(null);
  const matteRef = useRef(null);
  const maskRef = useRef(null);
  const els = useRef(new Map());
  const lastMaskTime = useRef(-1);
  const drag = useRef(null);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  useEffect(() => {
    if (!maskRef.current) maskRef.current = document.createElement("canvas");
    let raf;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        setT(v.currentTime);
        syncMatte(v, matteRef.current);
        drawCutout(v);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, matteSrc]);

  function syncMatte(v, m) {
    if (!m || !matteSrc || m.readyState < 1) return;
    if (v.paused || v.seeking) {
      if (!m.paused) m.pause();
      if (!m.seeking && Math.abs(m.currentTime - v.currentTime) > 0.004) m.currentTime = v.currentTime;
    } else {
      if (m.paused) m.play().catch(() => {});
      if (m.playbackRate !== v.playbackRate) m.playbackRate = v.playbackRate;
      if (!m.seeking && Math.abs(m.currentTime - v.currentTime) > 0.1) m.currentTime = v.currentTime;
    }
  }

  function drawCutout(v) {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const m = matteRef.current;
    if (!matteSrc || !m || m.readyState < 2 || v.readyState < 2) return;

    const now = v.currentTime;
    const boxes = [];
    const cr = c.getBoundingClientRect();
    for (const l of layersRef.current) {
      if (!l.occlude || now < l.start || now >= l.end) continue;
      const el = els.current.get(l.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const pad = 12;
      boxes.push([(r.left - cr.left - pad) * dpr, (r.top - cr.top - pad) * dpr, (r.width + 2 * pad) * dpr, (r.height + 2 * pad) * dpr]);
    }
    if (!boxes.length) return;

    // matte frame -> alpha mask (white = person). Recomputed only when the frame changes.
    const mk = maskRef.current;
    if (lastMaskTime.current !== m.currentTime || mk.width !== m.videoWidth) {
      mk.width = m.videoWidth; mk.height = m.videoHeight;
      const mctx = mk.getContext("2d", { willReadFrequently: true });
      mctx.drawImage(m, 0, 0);
      const img = mctx.getImageData(0, 0, mk.width, mk.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) { d[i + 3] = d[i + 1]; d[i] = d[i + 1] = d[i + 2] = 255; }
      mctx.putImageData(img, 0, 0);
      lastMaskTime.current = m.currentTime;
    }

    ctx.save();
    ctx.beginPath();
    for (const [x, y, bw, bh] of boxes) ctx.rect(x, y, bw, bh);
    ctx.clip();
    ctx.drawImage(v, 0, 0, w, h);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mk, 0, 0, w, h);
    ctx.restore();
  }

  function startDrag(e, l) {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    const id = l.parent_id || l.id;          // dragging one subtitle line moves the whole effect
    onSelect?.(id);
    const host = e.currentTarget.closest(".fx-root")?.getBoundingClientRect();
    if (!host) return;
    drag.current = { id, px: e.clientX, py: e.clientY, x: l.x, y: l.y, w: host.width, h: host.height };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function moveDrag(e) {
    const d = drag.current;
    if (!d) return;
    const x = Math.min(1.2, Math.max(-0.2, d.x + (e.clientX - d.px) / d.w));
    const y = Math.min(1.2, Math.max(-0.2, d.y + (e.clientY - d.py) / d.h));
    onMove?.(d.id, Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
  }
  function endDrag(e) {
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  const render = (l) => {
    const st = layerState(l, t, boxHeight(l));
    const selected = editable && (l.parent_id || l.id) === selectedId;
    if (!st) return null;
    return (
      <div
        key={l.id}
        ref={(el) => (el ? els.current.set(l.id, el) : els.current.delete(l.id))}
        className={`fx-layer ${editable ? "is-editable" : ""} ${selected ? "is-selected" : ""}`}
        onPointerDown={(e) => startDrag(e, l)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title={editable ? "Drag to move" : undefined}
        style={{
          left: `${l.x * 100}%`, top: `${l.y * 100}%`,
          fontFamily: FONT_FAMILY[l.font_family] || FONT_FAMILY.montserrat,
          fontWeight: l.font_weight, fontStyle: l.italic ? "italic" : "normal",
          fontSize: cq(l.font_size), lineHeight: l.line_height, color: l.color,
          opacity: st.opacity, transform: layerTransform(l, st), mixBlendMode: l.blend,
          // export draws the full stroke width outside the glyph; CSS paints half of it
          ...(l.stroke_width > 0 ? { WebkitTextStroke: `${cq(2 * l.stroke_width)} ${l.stroke_color}`, paintOrder: "stroke fill" } : {}),
        }}
      >
        {l.word_colors ? colouredLines(l) : displayLines(l).join("\n")}
      </div>
    );
  };

  const behind = layers.filter((l) => l.occlude);
  const front = layers.filter((l) => !l.occlude);
  const waiting = behind.some((l) => t >= l.start && t < l.end) && matteState?.status !== "ready";

  return (
    <div className="fx-root">
      {behind.map(render)}
      <canvas ref={canvasRef} className="fx-cutout" aria-hidden="true" />
      {front.map(render)}
      {matteSrc && (
        <video ref={matteRef} key={matteSrc} src={matteSrc} className="fx-matte" muted playsInline preload="auto"
          onLoadedData={() => { lastMaskTime.current = -1; }} />
      )}
      {waiting && (
        <span className="fx-pill">
          {matteState?.status === "processing"
            ? `Cutting out the person… ${Math.round((matteState.progress || 0) * 100)}%`
            : matteState?.status === "error" ? "Person cut-out failed" : "Person cut-out not built"}
        </span>
      )}
    </div>
  );
}
