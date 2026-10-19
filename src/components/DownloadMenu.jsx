import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

export const SUB_FORMATS = [
  { fmt: "srt", label: "SRT subtitles", note: "YouTube, Premiere, CapCut, VLC" },
  { fmt: "vtt", label: "VTT subtitles", note: "Web players, Vimeo, LinkedIn" },
  { fmt: "ass", label: "ASS subtitles", note: "Styled + animated, like the export" },
  { fmt: "txt", label: "Transcript (TXT)", note: "Plain text, paragraphs" },
];

// Topbar "Download" button: the MP4 plus subtitle / transcript files.
export default function DownloadMenu({ videoUrl, stale, onSubtitles, busy }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState("lines");
  const root = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="dl" ref={root}>
      <button type="button" className={`btn btn-ghost ${stale ? "is-stale" : ""}`} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        <Icon name="download" /><span className="btn-text">Download</span><Icon name="chevron" className="dl-caret" />
      </button>
      {open && (
        <div className="dl-menu" role="menu">
          <a role="menuitem" href={videoUrl} className="dl-item" onClick={() => setOpen(false)}>
            <Icon name="export" />
            <span><b>Video (MP4)</b><small>{stale ? "Your last export. Export to include new edits." : "1080×1920, captions burned in"}</small></span>
          </a>
          <div className="dl-sep" />
          <div className="dl-head">
            <span>Subtitles &amp; transcript</span>
            <span className="seg dl-seg" role="group" aria-label="Subtitle lines">
              <button type="button" aria-pressed={group === "lines"} onClick={() => setGroup("lines")} title="One cue per caption, like the video">Lines</button>
              <button type="button" aria-pressed={group === "sentences"} onClick={() => setGroup("sentences")}>Sentences</button>
            </span>
          </div>
          {SUB_FORMATS.map((f) => (
            <button key={f.fmt} type="button" role="menuitem" className="dl-item" disabled={busy}
              onClick={async () => { await onSubtitles(f.fmt, group); setOpen(false); }}>
              <Icon name="file" />
              <span><b>{f.label}</b><small>{f.note}</small></span>
              <span className="dl-ext">.{f.fmt}</span>
            </button>
          ))}
          <p className="dl-note">Times match the edited video (pauses removed). Includes your unsaved caption edits.</p>
        </div>
      )}
    </div>
  );
}
