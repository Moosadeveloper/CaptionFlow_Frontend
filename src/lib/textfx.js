// Title text effects: "Text Behind Person" and "3D Perspective / Text on Wall".
// Timing + geometry here MUST match backend/pipeline/textfx.py so the export lands
// exactly where the preview shows it. Units: px on the 1080x1920 export frame.

export const FRAME_W = 1080;
export const FRAME_H = 1920;

export const FX_DEFAULTS = {
  behind: {
    x: 0.5, y: 0.3, font_family: "anton", font_size: 330, font_weight: 400, color: "#FFFFFF",
    stroke_width: 0, stroke_color: "#000000", opacity: 100, line_height: 0.9, uppercase: true,
    italic: false, animation: "rise", occlude: true, rotate_x: 0, rotate_y: 0, rotate_z: 0,
    perspective: 1400, blend: "normal", words_per_line: 2, hide_captions: true,
  },
  wall: {
    x: 0.5, y: 0.3, font_family: "bebas", font_size: 230, font_weight: 400, color: "#FFFFFF",
    stroke_width: 0, stroke_color: "#000000", opacity: 90, line_height: 0.92, uppercase: true,
    italic: false, animation: "fade", occlude: true, rotate_x: 0, rotate_y: 32, rotate_z: 0,
    perspective: 1100, blend: "overlay", words_per_line: 2, hide_captions: true,
  },
};

export const FX_ANIMATIONS = {
  none: "None", fade: "Fade", pop: "Pop", rise: "Rise from behind", slide_up: "Slide up",
  zoom: "Zoom in", slam: "Slam", drop: "Drop & bounce",
};

export const BLENDS = [["normal", "Normal"], ["multiply", "Multiply"], ["overlay", "Overlay"], ["screen", "Screen"]];

// One-click camera angles for the 3D controls.
export const ANGLES = [
  { id: "flat", label: "Flat", rotate_x: 0, rotate_y: 0, rotate_z: 0, perspective: 1400 },
  { id: "left", label: "Left wall", rotate_x: 0, rotate_y: 38, rotate_z: 0, perspective: 1100 },
  { id: "right", label: "Right wall", rotate_x: 0, rotate_y: -38, rotate_z: 0, perspective: 1100 },
  { id: "floor", label: "Floor", rotate_x: 62, rotate_y: 0, rotate_z: 0, perspective: 900 },
  { id: "ceiling", label: "Ceiling", rotate_x: -55, rotate_y: 0, rotate_z: 0, perspective: 900 },
  { id: "tilt", label: "Tilted", rotate_x: 14, rotate_y: -24, rotate_z: -6, perspective: 1200 },
];

// Every key the backend stores; used for dirty checks.
export const LAYER_KEYS = [
  "id", "type", "text", "start", "end", "x", "y", "font_family", "font_size", "font_weight", "color",
  "stroke_width", "stroke_color", "opacity", "line_height", "uppercase", "italic", "animation",
  "occlude", "rotate_x", "rotate_y", "rotate_z", "perspective", "blend",
  "source", "words_per_line", "hide_captions",
];

// px: subtitle text is shrunk to fit this wide (same as textfx.FIT_WIDTH)
export const FIT_WIDTH = 980;

const r3 = (v) => Math.round(v * 1000) / 1000;

// New layers use the subtitles for their text and run for the whole video, so the
// user does not have to type anything. "custom" switches to typed text.
export function newLayer(type, t, duration, defaults, source = "captions") {
  const d = { ...FX_DEFAULTS[type], ...(defaults?.[type] || {}) };
  const whole = source === "captions";
  const start = whole ? 0 : r3(Math.max(0, Math.min(t || 0, Math.max(0, duration - 0.5))));
  const end = whole ? r3(duration) : r3(Math.min(duration, start + 3));
  return {
    ...d, id: Math.random().toString(36).slice(2, 10), type, start, end, source,
    words_per_line: d.words_per_line ?? 2, hide_captions: d.hide_captions ?? true,
    text: type === "wall" ? "YOUR TEXT\nON THE WALL" : "BIG\nTITLE",
  };
}

// Mirror of textfx.break_lines(): caption -> lines of ~perLine words, spread evenly.
export function breakLines(text, perLine) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const n = Math.min(words.length, Math.max(1, Math.ceil(words.length / Math.max(1, perLine))));
  const out = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    const left = words.length - i, slots = n - k;
    const take = Math.floor(left / slots) + (left % slots ? 1 : 0);
    out.push(words.slice(i, i + take).join(" "));
    i += take;
  }
  return out.join("\n");
}

// Time ranges where the normal captions hide because an effect shows the subtitles.
export const captionWindows = (layers) =>
  (layers || []).filter((l) => l.source === "captions" && l.hide_captions !== false).map((l) => [l.start, l.end]);

export const captionHidden = (cap, windows) => {
  const mid = (cap.start + cap.end) / 2;
  return windows.some(([s, e]) => mid >= s && mid < e);
};

// Mirror of textfx.expand_layers(): one plain layer per caption line for every
// subtitle-sourced layer. measure(layer) -> widest line in px at layer.font_size.
export function expandLayers(layers, captions, measure) {
  const out = [];
  for (const l of layers || []) {
    if (l.source !== "captions") { out.push(l); continue; }
    for (const c of captions || []) {
      const s = Math.max(c.start, l.start), e = Math.min(c.end, l.end);
      const text = breakLines(c.text, l.words_per_line || 2);
      if (e - s < 0.1 || !text) continue;
      const sub = { ...l, id: `${l.id}~${c.id}`, parent_id: l.id, source: "custom", text, start: r3(s), end: r3(e) };
      // words coloured in the Captions tab keep their colour here (same as textfx.py)
      const cols = text.split(/\s+/).filter(Boolean).map((_, i) => wordStyle(c, i)?.color || null);
      if (cols.some(Boolean)) sub.word_colors = cols;
      const w = measure ? measure(sub) : 0;
      if (w > FIT_WIDTH) sub.font_size = Math.max(40, Math.floor((sub.font_size * FIT_WIDTH) / w));
      out.push(sub);
    }
  }
  return out;
}

export const displayLines = (layer) => (layer.uppercase ? layer.text.toUpperCase() : layer.text).split("\n");
export const boxHeight = (layer) => displayLines(layer).length * layer.line_height * layer.font_size;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeOutCubic = (p) => 1 - (1 - p) ** 3;
const easeOutBack = (p, k = 1.70158) => 1 + (k + 1) * (p - 1) ** 3 + k * (p - 1) ** 2;
const smooth = (p) => p * p * (3 - 2 * p);
function easeOutBounce(p) {
  const n = 7.5625, d = 2.75;
  if (p < 1 / d) return n * p * p;
  if (p < 2 / d) { p -= 1.5 / d; return n * p * p + 0.75; }
  if (p < 2.5 / d) { p -= 2.25 / d; return n * p * p + 0.9375; }
  p -= 2.625 / d; return n * p * p + 0.984375;
}

// Mirror of textfx.layer_state(): null when off screen.
export function layerState(layer, t, boxH) {
  const s = layer.start, e = layer.end;
  if (t < s || t >= e) return null;
  const dur = e - s;
  const din = Math.min(0.5, dur / 3), dout = Math.min(0.35, dur / 4);
  const p = din > 0 ? clamp((t - s) / din, 0, 1) : 1;
  const q = dout > 0 ? clamp((e - t) / dout, 0, 1) : 1;
  const qs = smooth(q);
  let op = 1, sc = 1, dx = 0, dy = 0;
  switch (layer.animation) {
    case "fade": op = smooth(p) * qs; break;
    case "pop": sc = 0.4 + 0.6 * easeOutBack(p); op = Math.min(1, p * 3) * qs; break;
    case "rise": dy = (1 - easeOutCubic(p)) * boxH * 0.9 + (1 - qs) * boxH * 0.5; op = Math.min(1, p * 4) * qs; break;
    case "slide_up": dy = (1 - easeOutCubic(p)) * 220; op = easeOutCubic(p) * qs; break;
    case "zoom": sc = 1.6 - 0.6 * easeOutCubic(p); op = easeOutCubic(p) * qs; break;
    case "slam": sc = 2.4 - 1.4 * (1 - (1 - p) ** 5); op = Math.min(1, p * 2.5) * qs; break;
    case "drop": dy = -(1 - easeOutBounce(p)) * 520; op = Math.min(1, p * 4) * qs; break;
    default: op = dout > 0 ? qs : 1;
  }
  return { opacity: clamp(op, 0, 1) * layer.opacity / 100, scale: sc, dx, dy };
}

// px on the 1080-wide frame -> CSS length relative to the preview (needs a size container)
export const cq = (px) => `${(px / FRAME_W) * 100}cqw`;

// The CSS transform the backend reproduces with a homography.
export function layerTransform(layer, st) {
  return `translate(-50%, -50%) translate(${cq(st.dx)}, ${cq(st.dy)}) perspective(${cq(layer.perspective)}) `
    + `rotateX(${layer.rotate_x}deg) rotateY(${layer.rotate_y}deg) rotateZ(${layer.rotate_z}deg) scale(${st.scale})`;
}

export const layersSignature = (layers) =>
  JSON.stringify((layers || []).map((l) => LAYER_KEYS.map((k) => l[k] ?? null)));

// A caption word's own look {color, font_family} (Captions tab). Older edits: word_colors.
export function wordStyle(cap, i) {
  const ws = cap?.word_styles?.[i];
  if (ws) return ws;
  const c = cap?.word_colors?.[i];
  return c ? { color: c } : null;
}
