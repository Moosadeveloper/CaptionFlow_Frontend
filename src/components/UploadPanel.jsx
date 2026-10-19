import { useEffect, useState } from "react";
import { api } from "../api.js";
import { AnimationPicker, FontPicker, StylePicker, TemplateColours } from "./PresetPicker.jsx";
import { GlowControls, Group, Segmented, Switch } from "./Controls.jsx";
import Icon from "./Icon.jsx";

const INTENSITY_HINT = {
  subtle: "Removes long pauses only. Camera follows gently, rare zooms.",
  medium: "Tighter cuts, a zoom on key moments every few sentences.",
  dynamic: "Fast cuts, wide and close shots every 3 to 6 seconds, strong punch-ins.",
};

// Both are off by default: the video stays as recorded unless the user asks.
export function AutoEditGroup({ options, set, editor = false }) {
  const any = options.auto_cut || options.auto_keyframe;
  return (
    <Group title="Automatic editing" note={editor
      ? "Turning Auto cut on or off re-cuts the video and rebuilds the captions (caption text edits are reset)."
      : "Off = your video is kept exactly as recorded. Turn on only what you want."}>
      <div style={{ display: "grid", gap: 12 }}>
        <Switch label="Auto cut (remove pauses and umm/uh)" checked={options.auto_cut === true} onChange={set("auto_cut")} />
        <Switch label="Auto keyframes (camera follow, zooms, punch-ins)" checked={options.auto_keyframe === true} onChange={set("auto_keyframe")} />
        {any && (
          <Segmented
            label="Edit intensity"
            value={options.intensity}
            onChange={set("intensity")}
            options={[["subtle", "Subtle"], ["medium", "Medium"], ["dynamic", "Dynamic"]]}
            hint={editor ? "Changing this re-plans the camera, so the export takes longer." : INTENSITY_HINT[options.intensity]}
          />
        )}
      </div>
    </Group>
  );
}
const STATUS = { ready: "Ready", error: "Failed" };

export default function UploadPanel({ tab, title, sub, presets, fontStatus, file, options, setOptions, onStart, onOpen }) {
  const [music, setMusic] = useState(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState([]);
  const set = (k) => (v) => setOptions((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    api.projects().then(setRecent).catch(() => {});
  }, []);

  async function go() {
    setBusy(true);
    await onStart(music);
    setBusy(false);
  }

  return (
    <>
      <div className="panel-head">
        <h1 className="panel-title">{title}</h1>
        <p className="panel-sub">{sub}</p>
      </div>

      <div className="panel-body">
        {tab === "setup" && (
          <>
            <Segmented
              label="Spoken language"
              value={options.language}
              onChange={set("language")}
              options={[["auto", "Auto"], ["ur", "Urdu"], ["fa", "Farsi"], ["hi", "Hindi"], ["en", "English"]]}
              hint={options.language === "fa"
                ? "Persian recognition is forced and RTL captions use Persian fonts. Use the medium or large-v3 Whisper model for best accuracy."
                : null}
            />
            {(options.language === "ur" || options.language === "auto") && (
              <div style={{ marginTop: -4, paddingBottom: 14 }}>
                <Switch label="Write Urdu captions in Roman Urdu" checked={options.roman_urdu} onChange={set("roman_urdu")} />
              </div>
            )}

            <AutoEditGroup options={options} set={set} />

            <Group title="Caption glow">
              <GlowControls options={options} set={set} />
            </Group>

            <Group title="Background music" note="Optional. Ducks automatically whenever you speak.">
              <label className="file-pick">
                <span className="ico"><Icon name="music" /></span>
                <span style={{ minWidth: 0 }}>
                  <strong>{music ? music.name : "Add a music track"}</strong>
                  <small>{music ? `${(music.size / 1e6).toFixed(1)} MB · click to replace` : "MP3, WAV or M4A"}</small>
                </span>
                <input type="file" accept="audio/*" onChange={(e) => setMusic(e.target.files?.[0] || null)} />
              </label>
            </Group>

            {recent.length > 0 && (
              <Group title="Recent projects">
                <div className="recent">
                  {recent.slice(0, 6).map((r) => (
                    <button key={r.id} onClick={() => onOpen(r)} className="recent-item">
                      <span className="recent-thumb" />
                      <span className="name">{r.name}</span>
                      <span className={`status-chip ${r.status === "ready" ? "is-ok" : r.status === "error" ? "is-warn" : "is-live"}`}>
                        {STATUS[r.status] || "Processing"}
                      </span>
                    </button>
                  ))}
                </div>
              </Group>
            )}
          </>
        )}

        {tab === "style" && (
          <>
            <TemplateColours options={options} setOptions={setOptions} />
            <StylePicker styles={presets?.styles} value={options.caption_style} onChange={set("caption_style")}
              textColor={options.font_color} emphColor={options.emphasis_color} />
          </>
        )}
        {tab === "font" && <FontPicker fonts={presets?.fonts} status={fontStatus} value={options.font_family} onChange={set("font_family")} />}
        {tab === "motion" && (
          <AnimationPicker animations={presets?.animations} value={options.animation}
            onChange={set("animation")} styleKey={options.caption_style} />
        )}
      </div>

      <div className="panel-foot">
        <button disabled={!file || busy} onClick={go} className="btn btn-primary btn-lg">
          {busy ? "Uploading…" : file ? "Make my short" : "Add a video to start"}
        </button>
        {!file && <p className="hint">Drop a video on the preview, or click it to browse.</p>}
      </div>
    </>
  );
}
