import { useEffect, useRef, useState } from "react";
import { AnimationPicker, FontPicker, StylePicker, TemplateColours } from "./PresetPicker.jsx";
import { GlowControls, Group, Range, Segmented, Swatch, Switch } from "./Controls.jsx";
import EffectsTab from "./EffectsTab.jsx";
import { AutoEditGroup } from "./UploadPanel.jsx";
import Icon from "./Icon.jsx";
import { SUB_FORMATS } from "./DownloadMenu.jsx";
import { wordStyle } from "../lib/textfx.js";

const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const seek = (t) => window.dispatchEvent(new CustomEvent("autocut:seek", { detail: t }));

const CUSTOM_RESET = {
  font_size: null, font_weight: null, font_color: null, emphasis_color: null,
  background_enabled: false, background_color: "#000000", text_alignment: "center",
  outline_color: null, outline_width: null, shadow_color: null, shadow_size: null, font_italic: false,
};

export default function EditorPanel({ tab, title, sub, presets, fontStatus, plan, captions, setCaptions, options, setOptions,
  layers, setLayers, selectedLayer, setSelectedLayer, matte, onBuildMatte, onSubtitles, subBusy }) {
  const set = (k) => (v) => setOptions((o) => ({ ...o, [k]: v }));

  return (
    <>
      <div className="panel-head">
        <h1 className="panel-title">{title}</h1>
        <p className="panel-sub">{sub}</p>
      </div>
      <div className="panel-body">
        {tab === "captions" && <CaptionsTab plan={plan} captions={captions} setCaptions={setCaptions} presets={presets}
          onSubtitles={onSubtitles} subBusy={subBusy} />}
        {tab === "effects" && (
          <EffectsTab plan={plan} presets={presets} layers={layers} setLayers={setLayers}
            selectedId={selectedLayer} setSelectedId={setSelectedLayer} matte={matte} onBuildMatte={onBuildMatte} />
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
        {tab === "customize" && <CustomizeTab options={options} setOptions={setOptions} set={set} />}
      </div>
    </>
  );
}

function CaptionsTab({ plan, captions, setCaptions, presets, onSubtitles, subBusy }) {
  const [group, setGroup] = useState("lines");
  const [now, setNow] = useState(-1);
  const listRef = useRef(null);
  const stats = plan.stats || {};

  useEffect(() => {
    const onTime = (e) => setNow(e.detail);
    window.addEventListener("autocut:time", onTime);
    return () => window.removeEventListener("autocut:time", onTime);
  }, []);

  const activeId = captions.find((c) => now >= c.start && now < c.end)?.id;

  // Keep the playing line visible without fighting the user while they type.
  useEffect(() => {
    if (activeId == null || listRef.current?.contains(document.activeElement)) return;
    listRef.current?.querySelector(`[data-id="${activeId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  const editCaption = (id, patch) => setCaptions((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const [lookId, setLookId] = useState(null);     // line whose word colour/font editor is open
  const [pickedWords, setPickedWords] = useState([]);

  // Double-clicking a word on the preview opens it here, already chosen.
  useEffect(() => {
    const onPick = () => {
      const pick = window.__autocutPick;
      if (!pick) return;
      window.__autocutPick = null;
      const { capId, index } = pick;
      setLookId(capId);
      setPickedWords(Number.isInteger(index) ? [index] : []);
      setTimeout(() => listRef.current?.querySelector(`[data-id="${capId}"]`)?.scrollIntoView({ block: "nearest" }), 0);
    };
    onPick();                                       // opened by a double-click on another tab
    window.addEventListener("autocut:pickword", onPick);
    return () => window.removeEventListener("autocut:pickword", onPick);
  }, []);

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{plan.cuts.output_duration.toFixed(1)}s</b><span>Final length</span></div>
        <div className="stat"><b>{(stats.removed_seconds ?? 0).toFixed(1)}s</b><span>Pauses cut</span></div>
        <div className="stat"><b>{captions.length}</b><span>Caption lines</span></div>
      </div>
      {stats.face_found === false && (
        <p className="group-note" style={{ marginBottom: 14 }}>No face was found, so the frame stays centred with a slow zoom.</p>
      )}

      <div className="transcript" ref={listRef}>
        {captions.map((c) => (
          <div key={c.id} data-id={c.id} className={`line ${c.id === activeId ? "is-active" : ""}`}>
            <button onClick={() => seek(c.start)} className="line-time" title="Play from here">{fmt(c.start)}</button>
            <input
              dir="auto"
              aria-label={`Caption at ${fmt(c.start)}`}
              value={c.text}
              onChange={(e) => editCaption(c.id, { text: e.target.value })}
              className="line-text"
            />
            <div className="line-tools">
            <select
                aria-label="Look for this line"
                value={c.style || ""}
                onChange={(e) => editCaption(c.id, { style: e.target.value || null })}
                className={`select line-style ${c.style ? "has-style" : ""}`}
              >
                <option value="">Template: same as video</option>
                {presets && Object.entries(presets.styles).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            <button type="button" className={`btn btn-quiet line-look-btn ${hasLook(c) ? "has-look" : ""}`}
              aria-expanded={lookId === c.id} title="Colour or font for one word (or more) in this line"
              onClick={() => { setLookId(lookId === c.id ? null : c.id); setPickedWords([]); seek(c.start); }}>
              <span className="dot" aria-hidden="true" />Colour words</button>
            </div>
            {lookId === c.id && (
              <WordLook caption={c} presets={presets} selected={pickedWords} setSelected={setPickedWords}
                onChange={(patch) => editCaption(c.id, patch)} />
            )}
          </div>
        ))}
        {captions.length === 0 && <p className="empty">No speech was detected, so there are no captions to edit.</p>}
      </div>

      {captions.length > 0 && (
        <Group title="Download subtitles" note="Timed to the edited video. Includes the edits above, even before you export.">
          <div className="seg" role="group" aria-label="Subtitle lines" style={{ marginBottom: 10 }}>
            <button type="button" aria-pressed={group === "lines"} onClick={() => setGroup("lines")}>Lines as on video</button>
            <button type="button" aria-pressed={group === "sentences"} onClick={() => setGroup("sentences")}>Full sentences</button>
          </div>
          <div className="sub-btns">
            {SUB_FORMATS.map((f) => (
              <button key={f.fmt} type="button" className="btn btn-ghost" disabled={subBusy}
                onClick={() => onSubtitles(f.fmt, group)} title={f.note}>
                <Icon name="download" />{f.fmt === "txt" ? "Transcript" : f.fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </Group>
      )}
    </>
  );
}

const hasLook = (c) => !!(c.font_family || c.color || c.emphasis_color
  || c.word_colors?.some(Boolean) || c.word_styles?.some(Boolean));

const QUICK_COLOURS = ["#FFFFFF", "#FFD23F", "#FF3B6B", "#3DDC97", "#2E73FF", "#B26BFF", "#FF8A00", "#00E5FF"];

// Pick one or more words of a caption line and give them their own colour and/or
// font. Works on top of any template; words you don't touch keep the template look.
function WordLook({ caption: c, presets, selected, setSelected, onChange }) {
  const words = c.text.trim().split(/\s+/).filter(Boolean);
  const styleAt = (i) => wordStyle(c, i) || {};
  const sel = selected.filter((i) => i < words.length);
  const toggle = (i) => setSelected(sel.includes(i) ? sel.filter((j) => j !== i) : [...sel, i]);

  const apply = (patch) => {
    const next = words.map((_, i) => {
      const cur = { color: null, font_family: null, ...styleAt(i) };
      const out = sel.includes(i) ? { ...cur, ...patch } : cur;
      return out.color || out.font_family ? { color: out.color || null, font_family: out.font_family || null } : null;
    });
    onChange({ word_styles: next.some(Boolean) ? next : null, word_colors: null });
  };
  const first = sel.length ? styleAt(sel[0]) : {};

  return (
    <div className="line-look">
      <div className="word-look-head">
        <span className="field">Tap the word(s) to colour</span>
        <button type="button" className="btn btn-quiet" onClick={() => setSelected(sel.length === words.length ? [] : words.map((_, i) => i))}>
          {sel.length === words.length ? "Clear choice" : "Whole line"}
        </button>
      </div>
      <div className="word-chips" role="group" aria-label="Words in this line">
        {words.map((w, i) => {
          const st = styleAt(i);
          return (
            <button type="button" key={i} aria-pressed={sel.includes(i)}
              className={`word-chip ${st.color || st.font_family ? "is-set" : ""}`}
              style={{ ...(st.color ? { "--chip": st.color, color: st.color } : {}),
                ...(st.font_family ? { fontFamily: `"${presets?.fonts?.[st.font_family]?.family}", sans-serif` } : {}) }}
              onClick={() => toggle(i)}>{w}</button>
          );
        })}
      </div>

      {sel.length > 0 ? (
        <>
          <div className="field">Colour {sel.length > 1 ? `(${sel.length} words)` : `“${words[sel[0]]}”`}
            <div className="quick-colours">
              {QUICK_COLOURS.map((col) => (
                <button type="button" key={col} className="quick-colour" style={{ background: col }}
                  aria-pressed={first.color === col} aria-label={`Colour ${col}`} onClick={() => apply({ color: col })} />
              ))}
              <label className="quick-colour is-custom" title="Any colour">
                +
                <input type="color" value={first.color || "#ffffff"} onChange={(e) => apply({ color: e.target.value.toUpperCase() })} aria-label="Any colour" />
              </label>
              {sel.some((i) => styleAt(i).color) && (
                <button type="button" className="btn btn-quiet" onClick={() => apply({ color: null })}>Template colour</button>
              )}
            </div>
          </div>
          <label className="field">Font
            <select className="select" value={first.font_family || ""} onChange={(e) => apply({ font_family: e.target.value || null })}>
              <option value="">Template font</option>
              {presets && Object.entries(presets.fonts).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
        </>
      ) : (
        <p className="group-note" style={{ margin: 0 }}>Choose a word above, or double-click a word on the preview.</p>
      )}

      {hasLook(c) && (
        <button type="button" className="btn btn-quiet" style={{ justifySelf: "start" }}
          onClick={() => onChange({ font_family: null, color: null, emphasis_color: null, word_colors: null, word_styles: null })}>
          Reset this line to template
        </button>
      )}
    </div>
  );
}

function CustomizeTab({ options, setOptions, set }) {
  return (
    <>
      <Group title="Text" action={
        <button type="button" className="btn btn-quiet" onClick={() => setOptions((o) => ({ ...o, ...CUSTOM_RESET }))}>Reset to template</button>
      }>
        <div style={{ display: "grid", gap: 14 }}>
          <Range label="Size" value={options.font_size} fallback={80} min={28} max={180} onChange={set("font_size")} />
          <div className="field-row">
            <label className="field">Weight
              <select className="select" value={options.font_weight ?? ""}
                onChange={(e) => set("font_weight")(e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">Template</option>
                {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label className="field">Alignment
              <select className="select" value={options.text_alignment || "center"} onChange={(e) => set("text_alignment")(e.target.value)}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </label>
          </div>
          <Switch label="Italic" checked={options.font_italic === true} onChange={set("font_italic")} />
        </div>
      </Group>

      <Group title="Colour">
        <div className="field-row">
          <Swatch label="Text" value={options.font_color} fallback="#ffffff" onChange={set("font_color")} />
          <Swatch label="Highlight word" value={options.emphasis_color} fallback="#ffd23f" onChange={set("emphasis_color")} />
        </div>
      </Group>

      <Group title="Stroke & shadow">
        <div style={{ display: "grid", gap: 14 }}>
          <div className="field-row">
            <Swatch label="Stroke" value={options.outline_color} fallback="#000000" onChange={set("outline_color")} />
            <Swatch label="Shadow" value={options.shadow_color} fallback="#000000" onChange={set("shadow_color")} />
          </div>
          <Range label="Stroke width" value={options.outline_width} fallback={6} min={0} max={20} onChange={set("outline_width")} />
          <Range label="Shadow size" value={options.shadow_size} fallback={2} min={0} max={20} onChange={set("shadow_size")} />
        </div>
      </Group>

      <Group title="Text background">
        <div style={{ display: "grid", gap: 14 }}>
          <Switch label="Box behind text" checked={options.background_enabled === true} onChange={set("background_enabled")} />
          {options.background_enabled && (
            <Swatch label="Box colour" value={options.background_color} fallback="#000000" onChange={set("background_color")} />
          )}
        </div>
      </Group>

      <Group title="Position & glow" note="Drag the caption on the preview to place it." action={
        <button type="button" className="btn btn-quiet" onClick={() => setOptions((o) => ({ ...o, caption_x: .5, caption_y: .66 }))}>Reset position</button>
      }>
        <GlowControls options={options} set={set} />
      </Group>

      <AutoEditGroup options={options} set={set} editor />
    </>
  );
}
