// Anything changed since the last export? Then the downloadable MP4 is out of date.
export const STYLE_KEYS = [
  "caption_style", "animation", "font_family", "intensity", "caption_x", "caption_y",
  "caption_glow", "glow_strength", "glow_color", "glow_mode", "glow_depth", "font_size", "font_weight", "font_color",
  "emphasis_color", "background_enabled", "background_color", "text_alignment",
  "outline_color", "outline_width", "shadow_color", "shadow_size", "font_italic",
  "auto_cut", "auto_keyframe",
];

import { layersSignature } from "./textfx.js";

// a caption line's own look (Captions tab)
const LINE_KEYS = ["style", "font_family", "color", "emphasis_color"];

export function isDirty(plan, captions, options, layers = []) {
  if (!plan) return false;
  if (layersSignature(layers) !== layersSignature(plan.effects?.text_layers)) return true;
  const changedCaption = captions.some((c, i) => {
    const o = plan.captions[i];
    return !o || c.text !== o.text || LINE_KEYS.some((k) => (c[k] || null) !== (o[k] || null))
      || JSON.stringify(c.word_colors || null) !== JSON.stringify(o.word_colors || null)
      || JSON.stringify(c.word_styles || null) !== JSON.stringify(o.word_styles || null);
  });
  return changedCaption || STYLE_KEYS.some((k) => (options[k] ?? null) !== (plan.options[k] ?? null));
}
