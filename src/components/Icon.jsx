// Small stroke icon set (24px grid) so the UI has no extra dependencies.
const PATHS = {
  setup: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  style: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 15h10M9 11h6" /></>,
  font: <><path d="M4 19l5.5-14h1L16 19M6.2 14h7.6" /><path d="M17 11.5c.6-.9 1.5-1.3 2.5-1.3 1.6 0 2.5 1 2.5 2.6V19M22 15.5c-3.5 0-5.2.7-5.2 2s1 1.7 2.2 1.7c1.6 0 3-1.2 3-3" /></>,
  motion: <><path d="M4 12h3M2 8h5M3 16h4" /><path d="M12 6l8 6-8 6V6z" /></>,
  sliders: <><path d="M6 4v6M6 14v6M12 4v2M12 10v10M18 4v10M18 18v2" /><circle cx="6" cy="12" r="2" /><circle cx="12" cy="8" r="2" /><circle cx="18" cy="16" r="2" /></>,
  captions: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 11h4M13 11h4M7 15h7M16 15h1" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
  export: <><path d="M5 12a7 7 0 0 1 12-5l2 2M19 5v4h-4" /><path d="M19 12a7 7 0 0 1-12 5l-2-2M5 19v-4h4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  move: <><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  person: <><circle cx="12" cy="7" r="3.5" /><path d="M5 21c.5-4 3.3-6.5 7-6.5s6.5 2.5 7 6.5" /></>,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
};

export default function Icon({ name, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
