import Icon from "./Icon.jsx";

export function Group({ title, note, action, children }) {
  return (
    <section className="group">
      {(title || action) && (
        <div className="group-head">
          <div>
            {title && <h3 className="group-title">{title}</h3>}
            {note && <p className="group-note">{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Switch({ label, checked, onChange }) {
  return (
    <label className="field-inline">
      <span>{label}</span>
      <span className="switch">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}

// value === null means "use the template's value"; the slider still shows a sensible position.
export function Range({ label, value, fallback, min, max, onChange, unit = "" }) {
  const isTemplate = value === null || value === undefined;
  return (
    <label className="field">
      {label}
      <span className="range-wrap">
        <input type="range" className="range" min={min} max={max} value={isTemplate ? fallback : value}
          onChange={(e) => onChange(Number(e.target.value))} />
        <span className={`range-val ${isTemplate ? "is-template" : ""}`}>{isTemplate ? "Auto" : `${value}${unit}`}</span>
      </span>
    </label>
  );
}

export function Swatch({ label, value, fallback, onChange }) {
  const shown = value || fallback;
  return (
    <label className="field">
      {label}
      <span className="swatch">
        <i style={{ background: shown }} />
        <span className={value ? "" : "is-template"}>{value ? value.toUpperCase() : "Template"}</span>
        <input type="color" value={shown} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      </span>
    </label>
  );
}

export function Segmented({ label, options, value, onChange, hint }) {
  return (
    <Group title={label} note={hint}>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([key, text]) => (
          <button type="button" key={key} aria-pressed={value === key} onClick={() => onChange(key)}>
            {text}
          </button>
        ))}
      </div>
    </Group>
  );
}

export function Search({ value, onChange, placeholder }) {
  return (
    <div className="search">
      <Icon name="search" />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

// Glow on/off, Soft or 3D, strength, colour and (3D) depth. Used by Setup and Tweak.
export function GlowControls({ options, set }) {
  const on = options.caption_glow !== false;   // same rule as the preview
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Switch label="Glow behind text" checked={on} onChange={set("caption_glow")} />
      {on && (
        <>
          <Segmented label="Glow type" value={options.glow_mode || "soft"} onChange={set("glow_mode")}
            options={[["soft", "Soft glow"], ["3d", "3D glow"]]}
            hint={options.glow_mode === "3d" ? "Solid 3D depth under the text, in a darker shade of the glow colour, plus the glow." : null} />
          <div className="field-row">
            <Range label="Strength" value={options.glow_strength ?? 55} fallback={55} min={0} max={100} onChange={set("glow_strength")} />
            <Swatch label="Glow colour" value={options.glow_color || "#6d5cff"} fallback="#6d5cff" onChange={set("glow_color")} />
          </div>
          {options.glow_mode === "3d" && (
            <Range label="3D depth" value={options.glow_depth ?? 8} fallback={8} min={2} max={24} unit="px" onChange={set("glow_depth")} />
          )}
        </>
      )}
    </div>
  );
}
