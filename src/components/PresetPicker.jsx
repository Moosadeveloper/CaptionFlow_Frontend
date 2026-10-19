import { useMemo, useState } from "react";
import { Search } from "./Controls.jsx";
export { Segmented } from "./Controls.jsx";

const RTL_FONTS = new Set(["noto_naskh", "noto_arabic", "vazirmatn", "shabnam", "sahel", "tahoma"]);
const FONT_SAMPLE = {
  allura: "Signature", lucy_said_ok: "Signature", mending: "Signature", pacifico: "Signature",
  lobster: "Creative", dancing: "Signature", caveat: "Handwritten", great_vibes: "Signature",
  bangers: "IMPACT", orbitron: "FUTURE", playfair: "Editorial", cormorant: "Elegant",
  noto_naskh: "فارسی زیبا", noto_arabic: "فارسی مدرن", vazirmatn: "فارسی مدرن",
  shabnam: "فارسی زیبا", sahel: "فارسی ساده", tahoma: "فارسی متن",
};
const fontSample = (key, label) =>
  FONT_SAMPLE[key] || label.replace(/\s*\([^)]*\)\s*/g, "").split(" ").slice(0, 2).join(" ");

const SAMPLE = [
  { text: "Turn", emphasis: false },
  { text: "ideas", emphasis: true },
  { text: "into hooks", emphasis: false },
];

function Sample({ styleKey, anim }) {
  return (
    <div className={`thumb cap cap-${styleKey} anim-${anim}`} style={{ fontSize: 15 }}>
      {SAMPLE.map((w, i) => (
        <span key={i} className={`w live ${w.emphasis ? "emph" : ""}`} style={{ animationDelay: `${i * 0.18}s` }}>
          {w.text}
        </span>
      ))}
    </div>
  );
}

// Clicking a tile must not scroll or steal focus from the preview.
const pick = (onChange, key) => ({
  onMouseDown: (e) => e.preventDefault(),
  onClick: (e) => { e.preventDefault(); onChange(key); },
});

const TEXT_COLOURS = ["#FFFFFF", "#FFE14D", "#FFD23F", "#FF3B6B", "#3DDC97", "#00E5FF", "#2E73FF", "#B26BFF", "#FF8A00", "#111111"];

function ColourRow({ label, value, onChange }) {
  return (
    <div className="field">{label}
      <div className="quick-colours">
        <button type="button" className={`quick-colour is-template-chip`} aria-pressed={!value}
          onClick={() => onChange(null)} title="Template colour">T</button>
        {TEXT_COLOURS.map((c) => (
          <button type="button" key={c} className="quick-colour" style={{ background: c }}
            aria-pressed={value?.toUpperCase() === c} aria-label={`${label} ${c}`} onClick={() => onChange(c)} />
        ))}
        <label className="quick-colour is-custom" title="Any colour">+
          <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={`${label}: any colour`} />
        </label>
      </div>
    </div>
  );
}

// Look tab: keep the template, change only its text colours. "T" = template's own colour.
// options.font_color / emphasis_color are the same values the Tweak tab sets.
export function TemplateColours({ options, setOptions }) {
  const set = (k) => (v) => setOptions((o) => ({ ...o, [k]: v }));
  return (
    <section className="group template-colours">
      <div className="group-head">
        <div>
          <h3 className="group-title">Text colour</h3>
          <p className="group-note">The template stays. Only the colour changes. To colour one word, use the Captions tab.</p>
        </div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <ColourRow label="Words" value={options.font_color} onChange={set("font_color")} />
        <ColourRow label="Highlighted words" value={options.emphasis_color} onChange={set("emphasis_color")} />
      </div>
    </section>
  );
}

export function StylePicker({ styles, value, onChange, textColor, emphColor }) {
  if (!styles) return null;
  return (
    <div className="tiles">
      {Object.entries(styles).map(([key, s]) => (
        <button type="button" key={key} className="tile" aria-pressed={value === key} {...pick(onChange, key)}>
          <div className="tile-stage">
            <span className={`cap cap-${key}`} style={{ fontSize: 17 }}>
              <span className="w" style={textColor ? { color: textColor } : undefined}>Make</span>
              <span className="w emph" style={emphColor ? { color: emphColor } : undefined}>it</span>
              <span className="w" style={textColor ? { color: textColor } : undefined}>pop</span>
            </span>
          </div>
          <div className="tile-meta"><span className="tile-name">{s.label}</span></div>
        </button>
      ))}
    </div>
  );
}

export function AnimationPicker({ animations, value, onChange, styleKey }) {
  const [filter, setFilter] = useState("");
  const [cat, setCat] = useState("All");
  const categories = useMemo(() => {
    const set = new Set(Object.values(animations || {}).map((a) => a.category).filter(Boolean));
    return ["All", ...set];
  }, [animations]);
  const items = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return Object.entries(animations || {}).filter(([, a]) =>
      (cat === "All" || a.category === cat) &&
      (!q || `${a.label} ${a.category || ""}`.toLowerCase().includes(q)));
  }, [animations, filter, cat]);
  if (!animations) return null;
  return (
    <>
      <Search value={filter} onChange={setFilter} placeholder={`Search ${Object.keys(animations).length} animations`} />
      {categories.length > 2 && (
        <div className="chips" role="group" aria-label="Animation category">
          {categories.map((c) => (
            <button type="button" key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      )}
      <div className="tiles">
        {items.map(([key, a]) => (
          <button type="button" key={key} className="tile" aria-pressed={value === key} {...pick(onChange, key)}>
            <div className="tile-stage"><Sample styleKey={styleKey} anim={key} /></div>
            <div className="tile-meta">
              <span className="tile-name">{a.label}</span>
              {a.category && cat === "All" && <span className="tile-tag">{a.category}</span>}
            </div>
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="empty">No animation matches “{filter}”. Try a shorter word.</p>}
    </>
  );
}

export function FontPicker({ fonts, status, value, onChange }) {
  const [filter, setFilter] = useState("");
  if (!fonts) return null;
  const avail = status?.available;
  const missing = (key) => avail && avail[key] === false;
  const missingCount = avail ? Object.values(avail).filter((v) => !v).length : 0;
  const q = filter.trim().toLowerCase();
  const items = Object.entries(fonts).filter(([, f]) => !q || f.label.toLowerCase().includes(q));
  return (
    <>
      {missing(value) && (
        <div className="notice" role="status">
          {status?.downloadable?.[value] ? (
            <>
              <strong>{fonts[value]?.label} will be downloaded on export.</strong>
              It's a free Google font that isn't on the render machine yet. The next export fetches it
              automatically (the server needs internet), then every export uses it.
            </>
          ) : (
            <>
              <strong>{fonts[value]?.label} isn't installed on the render machine.</strong>
              It isn't a free font, so it can't be downloaded for you. Put its .ttf/.otf file in{" "}
              <code>{status.fonts_dir}</code> — until then the export uses a fallback font.
            </>
          )}
        </div>
      )}
      {!missing(value) && missingCount > 0 && (
        <p className="group-note" style={{ margin: "0 0 12px" }}>
          Fonts marked “Not installed” export in a fallback font until their files are added. “Downloads on export” fonts are fetched automatically.
        </p>
      )}
      <Search value={filter} onChange={setFilter} placeholder={`Search ${Object.keys(fonts).length} fonts`} />
      <div className="tiles" style={{ marginTop: 14 }}>
        {items.map(([key, f]) => (
          <button type="button" key={key} className={`tile font-tile ${missing(key) ? "is-missing" : ""}`} aria-pressed={value === key} {...pick(onChange, key)}>
            <div className="font-sample" dir={RTL_FONTS.has(key) ? "rtl" : "ltr"}
              style={{ fontFamily: `"${f.family}", Arial, sans-serif`, fontWeight: 600 }}>
              {fontSample(key, f.label)}
            </div>
            <div className="font-label">{f.label}</div>
            {missing(key) && (
              <div className="font-missing">{status?.downloadable?.[key] ? "Downloads on export" : "Not installed"}</div>
            )}
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="empty">No font matches “{filter}”.</p>}
    </>
  );
}
