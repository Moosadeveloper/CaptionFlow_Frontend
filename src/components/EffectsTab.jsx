import { useEffect, useState } from "react";
import { Group, Range, Swatch, Switch } from "./Controls.jsx";
import Icon from "./Icon.jsx";
import { ANGLES, BLENDS, FX_ANIMATIONS, newLayer } from "../lib/textfx.js";

const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const seekTo = (t, play = false) => window.dispatchEvent(new CustomEvent("autocut:seek", { detail: { t, play } }));
const TYPE_LABEL = { behind: "Behind person", wall: "3D / wall" };

// Effects tab: add and edit "Text Behind Person" and "3D Perspective / Text on Wall" layers.
export default function EffectsTab({ plan, presets, layers, setLayers, selectedId, setSelectedId, matte, onBuildMatte }) {
  const [now, setNow] = useState(0);
  const duration = plan?.cuts?.output_duration || 0;
  const fxDefaults = presets?.text_fx?.defaults;

  useEffect(() => {
    const onTime = (e) => setNow(e.detail);
    window.addEventListener("autocut:time", onTime);
    return () => window.removeEventListener("autocut:time", onTime);
  }, []);

  const update = (id, patch) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const add = (type) => {
    const l = newLayer(type, now, duration, fxDefaults);
    setLayers((ls) => [...ls, l]);
    setSelectedId(l.id);
    seekTo(Math.min(l.end - 0.05, l.start + 0.7));
  };
  const remove = (id) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const duplicate = (l) => {
    const copy = { ...l, id: Math.random().toString(36).slice(2, 10), y: Math.min(1.1, l.y + 0.05) };
    setLayers((ls) => [...ls, copy]);
    setSelectedId(copy.id);
  };
  const moveBy = (id, dir) => setLayers((ls) => {
    const i = ls.findIndex((l) => l.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= ls.length) return ls;
    const next = [...ls];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const needsMatte = layers.some((l) => l.occlude);

  return (
    <>
      <div className="fx-add">
        <button type="button" className="fx-add-tile" onClick={() => add("behind")}>
          <span className="fx-add-art is-behind" aria-hidden="true"><b>TEXT</b><i /></span>
          <span className="fx-add-name">Text behind person</span>
          <span className="fx-add-sub">Your subtitles, huge, behind you. Hair, hands and arms pass in front</span>
        </button>
        <button type="button" className="fx-add-tile" onClick={() => add("wall")}>
          <span className="fx-add-art is-wall" aria-hidden="true"><b>WALL</b></span>
          <span className="fx-add-name">3D text on wall</span>
          <span className="fx-add-sub">Your subtitles in 3D on a wall or floor</span>
        </button>
      </div>

      <MatteStatus matte={matte} needed={needsMatte} onBuild={onBuildMatte} />

      {layers.length === 0 && (
        <p className="empty">No text effects yet. Add one above: it uses your subtitles for the whole video, nothing to type. You can switch it to your own text.</p>
      )}

      <div className="fx-list">
        {layers.map((l, i) => (
          <LayerCard
            key={l.id} layer={l} index={i} count={layers.length} now={now} duration={duration}
            presets={presets} open={l.id === selectedId}
            onToggle={() => {
              const open = l.id !== selectedId;
              setSelectedId(open ? l.id : null);
              if (open && (now < l.start || now >= l.end)) seekTo(Math.min(l.end - 0.05, l.start + 0.7));
            }}
            onChange={(patch) => update(l.id, patch)}
            onRemove={() => remove(l.id)}
            onDuplicate={() => duplicate(l)}
            onMove={(dir) => moveBy(l.id, dir)}
          />
        ))}
      </div>
    </>
  );
}

function MatteStatus({ matte, needed, onBuild }) {
  const s = matte?.status || "none";
  if (!needed && s !== "ready" && s !== "processing") return null;
  let body;
  if (s === "ready") {
    body = matte.method === "approximate"
      ? <>Person cut-out ready (approximate: head &amp; shoulders only). Install MediaPipe on the server for hands and hair.</>
      : <>Person cut-out ready. Text set to “hide behind person” goes behind hair, hands and arms.</>;
  } else if (s === "processing") {
    body = <>Cutting out the person… {Math.round((matte.progress || 0) * 100)}% <span className="fx-bar"><i style={{ width: `${(matte.progress || 0) * 100}%` }} /></span></>;
  } else if (s === "error") {
    body = <>Person cut-out failed: {matte.error} <button type="button" className="btn btn-quiet" onClick={onBuild}>Try again</button></>;
  } else {
    body = <>The person cut-out is built once per video. <button type="button" className="btn btn-quiet" onClick={onBuild}>Build now</button></>;
  }
  return <p className={`fx-status is-${s}`}><Icon name={s === "ready" ? "check" : "person"} />{body}</p>;
}

function LayerCard({ layer: l, index, count, now, duration, presets, open, onToggle, onChange, onRemove, onDuplicate, onMove }) {
  const set = (k) => (v) => onChange({ [k]: v });
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const setTime = (k, v) => {
    let { start, end } = l;
    if (k === "start") start = Math.max(0, Math.min(v, end - 0.1));
    else end = Math.min(duration, Math.max(v, start + 0.1));
    onChange({ start: r3(start), end: r3(end) });
  };
  const live = now >= l.start && now < l.end;

  return (
    <section className={`fx-card ${open ? "is-open" : ""}`}>
      <button type="button" className="fx-card-head" onClick={onToggle} aria-expanded={open}>
        <span className={`fx-badge is-${l.type}`}>{TYPE_LABEL[l.type]}</span>
        <span className="fx-card-text">{l.source === "captions" ? "Subtitles (auto)" : (l.text.replace(/\n/g, " / ") || "Empty")}</span>
        <span className={`fx-card-time ${live ? "is-live" : ""}`}>{fmt(l.start)}–{fmt(l.end)}</span>
      </button>

      {open && (
        <div className="fx-card-body">
          <label className="field">Text comes from
            <span className="seg" role="group" aria-label="Text comes from">
              <button type="button" aria-pressed={l.source === "captions"} onClick={() => set("source")("captions")}>Subtitles (auto)</button>
              <button type="button" aria-pressed={l.source !== "captions"} onClick={() => set("source")("custom")}>My own text</button>
            </span>
          </label>

          {l.source === "captions" ? (
            <Group title="Subtitles" note="Each caption line appears here as it is spoken. Edit words in the Captions tab and they change here too.">
              <div style={{ display: "grid", gap: 14 }}>
                <Range label="Words per line" value={l.words_per_line ?? 2} fallback={2} min={1} max={4}
                  onChange={set("words_per_line")} />
                <Switch label="Hide normal captions while this shows" checked={l.hide_captions !== false}
                  onChange={set("hide_captions")} />
              </div>
            </Group>
          ) : (
            <label className="field">Text
              <textarea className="input fx-textarea" rows={2} dir="auto" value={l.text}
                onChange={(e) => set("text")(e.target.value)} placeholder="Type your title. Enter = new line." />
            </label>
          )}

          <Group title="Timing" note={l.source === "captions"
            ? "Subtitles show here between start and end. The animation plays for each line."
            : "Shown from start to end. The animation plays in and out."}>
            <div className="field-row">
              <TimeField label="Start" value={l.start} onChange={(v) => setTime("start", v)} onNow={() => setTime("start", now)} />
              <TimeField label="End" value={l.end} onChange={(v) => setTime("end", v)} onNow={() => setTime("end", now)} />
            </div>
            <div className="fx-row-btns">
              <button type="button" className="btn btn-quiet" onClick={() => onChange({ start: 0, end: r3(duration) })}>Whole video</button>
              <button type="button" className="btn btn-quiet" onClick={() => seekTo(l.start, true)}>Play from start</button>
            </div>
          </Group>

          <Group title="Text">
            <div style={{ display: "grid", gap: 14 }}>
              <div className="field-row">
                <label className="field">Font
                  <select className="select" value={l.font_family} onChange={(e) => set("font_family")(e.target.value)}>
                    {presets && Object.entries(presets.fonts).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
                  </select>
                </label>
                <label className="field">Weight
                  <select className="select" value={l.font_weight} onChange={(e) => set("font_weight")(Number(e.target.value))}>
                    {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </label>
              </div>
              <Range label="Size" value={l.font_size} fallback={300} min={60} max={700} onChange={set("font_size")} />
              <Range label="Line spacing" value={Math.round(l.line_height * 100)} fallback={90} min={60} max={160} unit="%"
                onChange={(v) => set("line_height")(v / 100)} />
              <div className="field-row">
                <Switch label="ALL CAPS" checked={l.uppercase} onChange={set("uppercase")} />
                <Switch label="Italic" checked={l.italic} onChange={set("italic")} />
              </div>
              <div className="field-row">
                <Swatch label="Colour" value={l.color} fallback="#FFFFFF" onChange={set("color")} />
                <Swatch label="Stroke" value={l.stroke_color} fallback="#000000" onChange={set("stroke_color")} />
              </div>
              <div className="field-row">
                <Range label="Stroke width" value={l.stroke_width} fallback={0} min={0} max={30} onChange={set("stroke_width")} />
                <Range label="Opacity" value={l.opacity} fallback={100} min={0} max={100} unit="%" onChange={set("opacity")} />
              </div>
              <label className="field">Animation
                <select className="select" value={l.animation} onChange={(e) => set("animation")(e.target.value)}>
                  {Object.entries(presets?.text_fx?.animations || FX_ANIMATIONS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </label>
            </div>
          </Group>

          <Group title="Depth" note={l.occlude ? "The person is drawn over this text." : "This text is drawn over the person."}>
            <Switch label="Hide behind person" checked={l.occlude} onChange={set("occlude")} />
          </Group>

          <Group title="Position" note="Or drag the text on the preview." action={
            <button type="button" className="btn btn-quiet" onClick={() => onChange({ x: 0.5 })}>Centre</button>
          }>
            <div className="field-row">
              <Range label="Left ↔ right" value={Math.round(l.x * 100)} fallback={50} min={-20} max={120} unit="%" onChange={(v) => set("x")(v / 100)} />
              <Range label="Up ↕ down" value={Math.round(l.y * 100)} fallback={30} min={-20} max={120} unit="%" onChange={(v) => set("y")(v / 100)} />
            </div>
          </Group>

          <Group title="3D perspective" note="Turn the text to match a wall, floor or ceiling in your shot.">
            <div className="chips fx-angles">
              {ANGLES.map((a) => {
                const on = a.rotate_x === l.rotate_x && a.rotate_y === l.rotate_y && a.rotate_z === l.rotate_z;
                return (
                  <button type="button" key={a.id} className="chip" aria-pressed={on}
                    onClick={() => onChange({ rotate_x: a.rotate_x, rotate_y: a.rotate_y, rotate_z: a.rotate_z, perspective: a.perspective })}>
                    {a.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <Range label="Turn left / right (Y)" value={Math.round(l.rotate_y)} fallback={0} min={-80} max={80} unit="°" onChange={set("rotate_y")} />
              <Range label="Tilt back / forward (X)" value={Math.round(l.rotate_x)} fallback={0} min={-80} max={80} unit="°" onChange={set("rotate_x")} />
              <Range label="Rotate (Z)" value={Math.round(l.rotate_z)} fallback={0} min={-180} max={180} unit="°" onChange={set("rotate_z")} />
              <Range label="Lens depth" value={Math.round(l.perspective)} fallback={1400} min={300} max={5000} onChange={set("perspective")} />
              <label className="field">Blend with wall
                <span className="seg" role="group" aria-label="Blend with wall">
                  {BLENDS.map(([k, label]) => (
                    <button type="button" key={k} aria-pressed={l.blend === k} onClick={() => set("blend")(k)}>{label}</button>
                  ))}
                </span>
              </label>
              <p className="group-note" style={{ margin: 0 }}>Overlay and Multiply let the wall's light and texture show through, like painted text.</p>
            </div>
          </Group>

          <div className="fx-card-actions">
            <button type="button" className="btn btn-quiet" onClick={() => onMove(-1)} disabled={index === 0} title="Send backward"><Icon name="down" />Back</button>
            <button type="button" className="btn btn-quiet" onClick={() => onMove(1)} disabled={index === count - 1} title="Bring forward"><Icon name="up" />Forward</button>
            <button type="button" className="btn btn-quiet" onClick={onDuplicate}><Icon name="copy" />Duplicate</button>
            <button type="button" className="btn btn-quiet fx-danger" onClick={onRemove}><Icon name="trash" />Delete</button>
          </div>
        </div>
      )}
    </section>
  );
}

function TimeField({ label, value, onChange, onNow }) {
  return (
    <label className="field">{label}
      <span className="fx-time">
        <input className="input" type="number" min={0} step={0.1} value={Number(value.toFixed(2))}
          onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))} />
        <button type="button" className="btn btn-quiet" onClick={onNow} title="Use the playhead time"><Icon name="clock" /></button>
      </span>
    </label>
  );
}
