import { useEffect, useMemo, useRef, useState } from "react";
import { captionHidden, captionWindows } from "../lib/textfx.js";
import CaptionOverlay from "./CaptionOverlay.jsx";
import FxOverlay from "./FxOverlay.jsx";
import Icon from "./Icon.jsx";

// The 9:16 frame is the constant centre of the app: it is the drop zone before
// upload, shows progress while processing, and becomes the preview afterwards.
export default function Stage({ view, file, onFile, project, captions, options, setOptions, plan, videoSrc,
  layers = [], fxEditable, selectedLayer, onSelectLayer, onMoveLayer, matte, matteSrc }) {
  // Captions shown by a "subtitles" text effect are not drawn a second time.
  const visibleCaptions = useMemo(() => {
    const win = captionWindows(layers);
    return win.length ? (captions || []).filter((c) => !captionHidden(c, win)) : captions;
  }, [captions, layers]);
  const input = useRef(null);
  const video = useRef(null);
  const [drag, setDrag] = useState(false);

  // The caption list asks the preview to jump to a caption's time.
  useEffect(() => {
    // detail: a time in seconds (seek + play), or { t, play } to choose.
    const onSeek = (e) => {
      const d = e.detail;
      const t = typeof d === "number" ? d : d?.t;
      if (video.current && Number.isFinite(t)) {
        video.current.currentTime = t;
        if (typeof d === "number" || d.play) video.current.play().catch(() => {});
        else video.current.pause();
      }
    };
    window.addEventListener("autocut:seek", onSeek);
    return () => window.removeEventListener("autocut:seek", onSeek);
  }, []);

  // Let the caption list highlight the line that is playing.
  const emitTime = () => {
    if (video.current) window.dispatchEvent(new CustomEvent("autocut:time", { detail: video.current.currentTime }));
  };

  if (view === "new") {
    return (
      <div className="stage">
        <div
          className={`phone ${drag ? "is-drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
        >
          <button onClick={() => input.current?.click()} className="drop">
            <span className="drop-icon"><Icon name={file ? "check" : "upload"} /></span>
            {file ? (
              <>
                <span className="drop-file">{file.name}</span>
                <span className="drop-sub">{(file.size / 1e6).toFixed(1)} MB</span>
                <span className="drop-link">Choose a different video</span>
              </>
            ) : (
              <>
                <p className="drop-title">Drop your talking-head video</p>
                <p className="drop-sub">or click to browse. MP4 or MOV, up to 5 minutes.</p>
              </>
            )}
          </button>
          <input
            ref={input}
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov,.m4v"
            className="sr-only"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>
        <p className="stage-hint">Exports 1080×1920 for Reels, TikTok and Shorts</p>
      </div>
    );
  }

  if (view === "processing") {
    const pct = Math.round((project?.progress || 0) * 100);
    const failed = project?.status === "error";
    const C = 2 * Math.PI * 54;
    return (
      <div className="stage">
        <div className="phone" aria-live="polite">
          <div className="proc">
            <div className="ring">
              <svg viewBox="0 0 120 120">
                <circle className="track" cx="60" cy="60" r="54" />
                <circle className="bar" cx="60" cy="60" r="54" strokeDasharray={C}
                  strokeDashoffset={C * (1 - (failed ? 0 : pct / 100))} />
              </svg>
              <span className="ring-label">{failed ? "!" : `${pct}%`}</span>
            </div>
            <span className="proc-stage">{failed ? "Processing stopped" : project?.stage || "Queued"}</span>
          </div>
        </div>
        <p className="stage-hint">This page updates by itself — you can leave it open.</p>
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="phone">
        <video
          ref={video}
          src={videoSrc}
          controls
          playsInline
          onTimeUpdate={emitTime}
          onSeeked={emitTime}
        />
        <FxOverlay videoRef={video} layers={layers} captions={captions} matteSrc={matteSrc} matteState={matte}
          editable={fxEditable} selectedId={selectedLayer} onSelect={onSelectLayer} onMove={onMoveLayer} />
        <CaptionOverlay videoRef={video} captions={visibleCaptions} options={options} language={plan?.language}
          onPositionChange={(x, y) => setOptions?.((o) => ({ ...o, caption_x: x, caption_y: y }))} />
      </div>
      <p className="stage-hint"><Icon name="move" />{fxEditable
        ? "Drag a text effect to move it. Export burns it in."
        : "Drag the caption to move it. Edits preview instantly; Export burns them in."}</p>
    </div>
  );
}
