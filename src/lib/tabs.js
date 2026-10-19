export const TABS = {
  new: [
    { id: "setup", label: "Setup", icon: "setup" },
    { id: "style", label: "Look", icon: "style" },
    { id: "font", label: "Font", icon: "font" },
    { id: "motion", label: "Motion", icon: "motion" },
  ],
  editor: [
    { id: "captions", label: "Captions", icon: "captions" },
    { id: "style", label: "Look", icon: "style" },
    { id: "font", label: "Font", icon: "font" },
    { id: "motion", label: "Motion", icon: "motion" },
    { id: "customize", label: "Tweak", icon: "sliders" },
    { id: "effects", label: "Effects", icon: "layers" },
  ],
  processing: [],
};

export const HEADINGS = {
  setup: ["New short", "Pick the spoken language. Auto cut and auto keyframes are optional. You can change the look any time."],
  style: ["Caption look", "Pick a template, then change its text colours if you like. The template stays."],
  font: ["Font", "Fonts installed on the render machine export exactly; missing ones fall back safely."],
  motion: ["Animation", "How each word appears as it's spoken."],
  customize: ["Fine-tune", "Override the template. Every value here is burned into the export."],
  effects: ["Text effects", "Your subtitles, big, behind you or on a wall in 3D. Nothing to type. Drag them on the preview; Export burns them in."],
  captions: ["Captions", "Fix any word or give a line its own look. Click a time to jump there."],
};
