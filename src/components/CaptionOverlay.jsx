import { useEffect, useState } from "react";
import { wordStyle } from "../lib/textfx.js";

const LOOK = {
  bold_white: { size: 82, y: 0.66 }, yellow_punch: { size: 88, y: 0.64 }, boxed: { size: 70, y: 0.7 },
  clean: { size: 64, y: 0.72 }, neon: { size: 80, y: 0.66 }, ali_clean: { size: 80, y: 0.67 },
  creator_blue: { size: 82, y: 0.66 }, deven_jatho: { size: 86, y: 0.65 }, apple_clean: { size: 68, y: 0.68 },
  shadow_text: { size: 86, y: 0.66 }, metallic: { size: 82, y: 0.66 }, gradient_pop: { size: 84, y: 0.66 },
};
const PER_WORD = new Set([
  "pop_in","bounce","zero_gravity","stretch","squash","spring","typewriter","twist","spin_in","tilt_pop",
  "fisheye","wave","glitch","flash","fade_words","trendy","ali_abdaal","impact","elastic","zoom_punch",
  "overshoot","wobble","flip_x","flip_y","rubber","drop_word","float_word","word_swap"
]);

function scriptClass(text) {
  if (/[\u0600-\u06ff]/.test(text)) return "font-urdu";
  if (/[\u0900-\u097f]/.test(text)) return "font-deva";
  return "";
}

export const FONT_FAMILY = {
  montserrat:"Montserrat ExtraBold, Montserrat, Arial, sans-serif", runethia:"Runethia, Montserrat, sans-serif", transcity:"Transcity, Montserrat, sans-serif",
  runiga:"Runiga, Montserrat, sans-serif", allura:"Allura, cursive", bilderberg:"Bilderberg, Montserrat, sans-serif", lucy_said_ok:'"Lucy Said Ok Personal Use", cursive',
  mending:"Mending, cursive", archivo:"Archivo Black, Arial Black, sans-serif", anton:"Anton, Impact, sans-serif", bebas:"Bebas Neue, Impact, sans-serif",
  oswald:"Oswald, Arial, sans-serif", poppins:"Poppins, Arial, sans-serif", inter:"Inter, Arial, sans-serif", roboto:"Roboto, Arial, sans-serif",
  lato:"Lato, Arial, sans-serif", raleway:"Raleway, Arial, sans-serif", nunito:"Nunito, Arial, sans-serif", orbitron:"Orbitron, Arial, sans-serif",
  playfair:"Playfair Display, Georgia, serif", cormorant:"Cormorant Garamond, Georgia, serif", pacifico:"Pacifico, cursive", lobster:"Lobster, cursive",
  dancing:"Dancing Script, cursive", caveat:"Caveat, cursive", great_vibes:"Great Vibes, cursive", league_spartan:"League Spartan, Arial, sans-serif",
  bangers:"Bangers, Impact, sans-serif", righteous:"Righteous, Arial, sans-serif", sora:"Sora, Arial, sans-serif", manrope:"Manrope, Arial, sans-serif",
  outfit:"Outfit, Arial, sans-serif", urbanist:"Urbanist, Arial, sans-serif", space_grotesk:"Space Grotesk, Arial, sans-serif", dm_sans:"DM Sans, Arial, sans-serif",
  helvetica:'"Helvetica Neue", Arial, sans-serif', avenir:'"Avenir Next", Arial, sans-serif', futura:'Futura, Arial, sans-serif', georgia:'Georgia, serif', garamond:'Garamond, serif', times:'"Times New Roman", serif', verdana:'Verdana, sans-serif', trebuchet:'"Trebuchet MS", sans-serif', impact_font:'Impact, sans-serif', comic_sans:'"Comic Sans MS", cursive', source_sans:'"Source Sans 3", sans-serif', source_serif:'"Source Serif 4", serif', work_sans:'"Work Sans", sans-serif', plus_jakarta:'"Plus Jakarta Sans", sans-serif', figtree:'Figtree, sans-serif', lexend:'Lexend, sans-serif', syne:'Syne, sans-serif', archivo_narrow:'"Archivo Narrow", sans-serif', barlow:'Barlow, sans-serif', barlow_condensed:'"Barlow Condensed", sans-serif', ibm_plex_sans:'"IBM Plex Sans", sans-serif', ibm_plex_serif:'"IBM Plex Serif", serif', jost:'Jost, sans-serif', quicksand:'Quicksand, sans-serif',
  noto_naskh:'"Noto Naskh Arabic", Tahoma, serif', noto_arabic:'"Noto Sans Arabic", Tahoma, sans-serif', vazirmatn:'Vazirmatn, Tahoma, sans-serif',
  shabnam:'Shabnam, Tahoma, sans-serif', sahel:'Sahel, Tahoma, sans-serif', tahoma:'Tahoma, Arial, sans-serif'
};
function presetsFont(key, rtl) {
  if (rtl && ["noto_naskh","noto_arabic","vazirmatn","shabnam","sahel","tahoma"].includes(key)) return FONT_FAMILY[key];
  if (rtl) return '"Noto Naskh Arabic", Vazirmatn, Tahoma, serif';
  return FONT_FAMILY[key] || FONT_FAMILY.montserrat;
}

// Same as captions.darken(): the depth colour for 3D glow.
export function darken(hex, k = 0.45) {
  const h = (hex || "#6d5cff").replace("#", "");
  return "#" + [0, 2, 4].map((i) => Math.floor(parseInt(h.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
}
// 3D glow: the text repeated 1px at a time down-right (px on the 1080 frame -> cqw).
export function glow3dShadow(color, depth = 8) {
  const d = Math.max(2, Math.min(24, Number(depth) || 8)), c = darken(color);
  return Array.from({ length: d }, (_, i) => `${(i + 1) / 10.8}cqw ${(i + 1) / 10.8}cqw 0 ${c}`).join(", ");
}

let downWord = null;   // word under the last pointer-down (dblclick target is the line)

export default function CaptionOverlay({ videoRef, captions, options, language, onPositionChange }) {
  const [t, setT] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let raf;
    const tick = () => { if (videoRef.current) setT(videoRef.current.currentTime); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  const cap = captions.find((c) => t >= c.start && t < c.end);
  if (!cap) return null;
  const styleKey = cap.style || options.caption_style;
  const anim = cap.animation || options.animation;
  const look = LOOK[styleKey] || LOOK.bold_white;
  const original = cap.words.map((w) => w.text).join(" ");
  const words = cap.text.trim() === original ? cap.words : cap.text.trim().split(/\s+/).filter(Boolean).map((text, i, arr) => {
    const span = (cap.end - cap.start) / arr.length;
    return { text, start: cap.start + i * span, end: cap.start + (i + 1) * span, emphasis: false };
  });
  const rtl = /[\u0600-\u06ff]/.test(cap.text);
  const isFarsi = rtl && language === "fa";
  const x = Math.min(.92, Math.max(.08, options.caption_x ?? .5));
  const y = Math.min(.88, Math.max(.12, options.caption_y ?? look.y));
  const glow = options.caption_glow !== false;
  const glowStrength = Number(options.glow_strength ?? 55) / 100;
  const glowColor = options.glow_color || "#6d5cff";
  const glow3d = glow && options.glow_mode === "3d";
  const customSize = options.font_size ? Number(options.font_size) : look.size;
  const align = options.text_alignment || "center";
  // a line's own colours (Captions tab) win over the Tweak tab and the template
  const textColor = cap.color || options.font_color || undefined;
  const emphColor = cap.emphasis_color || options.emphasis_color || undefined;

  const move = (e) => {
    if (!dragging || !onPositionChange) return;
    const host = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!host) return;
    onPositionChange(Math.min(.92, Math.max(.08, (e.clientX - host.left) / host.width)), Math.min(.88, Math.max(.12, (e.clientY - host.top) / host.height)));
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ containerType: "inline-size" }}>
      <div className={`caption-drag-glow ${glow ? "is-on" : ""}`} style={{ left:`${x*100}%`, top:`${y*100}%`, "--glow-color":glowColor, "--glow-alpha":glowStrength }} />
      <div
        key={cap.id}
        dir={rtl ? "rtl" : "ltr"}
        className={`cap cap-${styleKey} anim-${anim} ${isFarsi ? "font-farsi" : scriptClass(cap.text)} absolute pointer-events-auto cursor-move select-none touch-none`}
        onPointerDown={(e) => { downWord = Number(e.target?.dataset?.wi); e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); setDragging(true); }}
        onDoubleClick={() => {
          // kept on window too: the Captions tab may only mount after this event
          window.__autocutPick = { capId: cap.id, index: Number.isInteger(downWord) ? downWord : null };
          window.dispatchEvent(new CustomEvent("autocut:pickword", { detail: window.__autocutPick }));
        }}
        onPointerMove={move}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); setDragging(false); }}
        onPointerCancel={() => setDragging(false)}
        title="Drag to move. Double-click a word to colour it."
        style={{
          left:`${x*100}%`, top:`${y*100}%`, width:"84%", transform:"translate(-50%,-50%)",
          fontSize:`${(customSize / 1080) * 100 * (rtl ? .82 : 1)}cqw`, lineHeight:rtl ? 1.9 : 1.15,
          fontFamily:presetsFont(cap.font_family || options.font_family, rtl), fontWeight: options.font_weight || undefined, fontStyle: options.font_italic ? "italic" : undefined,
          color: textColor, textAlign: align,
          // Stroke/shadow numbers are pixels on the 1080-wide export frame (cqw keeps
          // them the same size relative to the video at any preview size).
          ...(options.outline_width != null
            ? { WebkitTextStroke: `${(2 * options.outline_width) / 10.8}cqw ${options.outline_color || "#000000"}`, paintOrder: "stroke fill" }
            : options.outline_color ? { WebkitTextStrokeColor: options.outline_color } : {}),
          textShadow: glow3d ? glow3dShadow(glowColor, options.glow_depth)
            : options.shadow_size != null
            ? (options.shadow_size > 0 ? `${options.shadow_size / 10.8}cqw ${options.shadow_size / 10.8}cqw ${(options.shadow_size * 1.5) / 10.8}cqw ${options.shadow_color || "#000000"}` : "none")
            : options.shadow_color ? `${4 / 10.8}cqw ${4 / 10.8}cqw ${6 / 10.8}cqw ${options.shadow_color}` : undefined,
          backgroundColor: options.background_enabled ? (options.background_color || "#000000") : undefined,
          padding: options.background_enabled ? "0.08em 0.18em" : undefined,
          filter: glow ? `drop-shadow(0 0 ${1 + glowStrength*2}px ${glowColor}) drop-shadow(0 0 ${4 + glowStrength*7}px ${glowColor}) drop-shadow(0 0 ${8 + glowStrength*12}px ${glowColor})` : undefined,
        }}
      >
        {words.map((w, i) => {
          const started = t >= w.start, speaking = started && t < w.end;
          const cls = ["w",w.emphasis?"emph":"",PER_WORD.has(anim)&&!started?"pending":"",started?"live":"",speaking?"speaking":""].join(" ");
          const ws = wordStyle(cap, i);
          const own = ws?.color;
          const color = anim === "karaoke" && speaking
            ? (own || emphColor)                       // karaoke: the spoken word lights up
            : own || (w.emphasis && emphColor ? emphColor : textColor);
          return <span key={`${cap.id}-${i}`} data-wi={i} className={cls}
            style={{ color, ...(ws?.font_family ? { fontFamily: presetsFont(ws.font_family, rtl) } : {}) }}>{w.text}</span>;
        })}
      </div>
    </div>
  );
}
