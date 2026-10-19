import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import Stage from "./components/Stage.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import ProcessingPanel from "./components/ProcessingPanel.jsx";
import EditorPanel from "./components/EditorPanel.jsx";
import Icon from "./components/Icon.jsx";
import DownloadMenu from "./components/DownloadMenu.jsx";
import { isDirty } from "./lib/dirty.js";
import { HEADINGS, TABS } from "./lib/tabs.js";

const DEFAULTS = {
  caption_style: "bold_white",
  animation: "pop_in",
  font_family: "montserrat",
  intensity: "medium",
  caption_x: 0.5,
  caption_y: 0.66,
  caption_glow: false,
  glow_strength: 55,
  glow_color: "#6d5cff",
  glow_mode: "soft",      // soft | 3d
  glow_depth: 8,
  font_size: null,
  font_weight: null,
  font_color: null,
  emphasis_color: null,
  background_enabled: false,
  background_color: "#000000",
  text_alignment: "center",
  outline_color: null,
  outline_width: null,
  shadow_color: null,
  shadow_size: null,
  font_italic: false,
  language: "auto",
  roman_urdu: false,
  auto_cut: false,        // opt-in: remove pauses automatically
  auto_keyframe: false,   // opt-in: automatic camera moves, zooms and punch-ins
};

// What the server needs from each caption line (text + its own look).
const captionEdit = ({ id, text, style, animation, font_family, color, emphasis_color, word_colors, word_styles }) =>
  ({ id, text, style, animation, font_family, color, emphasis_color, word_colors, word_styles });

export default function App() {
  const [presets, setPresets] = useState(null);
  const [view, setView] = useState("new"); // new | processing | editor
  const [tab, setTab] = useState("setup");
  const [file, setFile] = useState(null);
  const [options, _setOptions] = useState(DEFAULTS);
  const optionsRef = useRef(DEFAULTS);
  const setOptions = useCallback((update) => {
    _setOptions((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      optionsRef.current = next;
      return next;
    });
  }, []);
  const [project, setProject] = useState(null); // status row from the API
  const [plan, setPlan] = useState(null);
  const [captions, _setCaptions] = useState([]);
  const captionsRef = useRef([]);
  const setCaptions = useCallback((update) => {
    _setCaptions((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      captionsRef.current = next;
      return next;
    });
  }, []);
  // Title text effects (Text Behind Person / 3D text on wall), stacking order = array order
  const [layers, _setLayers] = useState([]);
  const layersRef = useRef([]);
  const setLayers = useCallback((update) => {
    _setLayers((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      layersRef.current = next;
      return next;
    });
  }, []);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [matte, setMatte] = useState({ status: "none" }); // person cut-out for the effects
  const [subBusy, setSubBusy] = useState(false);
  const [renderTag, setRenderTag] = useState(Date.now());
  const [error, setError] = useState("");
  const [fontStatus, setFontStatus] = useState(null); // which fonts the renderer really has

  useEffect(() => {
    api.presets().then(setPresets).catch(() => {
      setPresets(null);
      });
  }, []);

  // Re-check installed fonts whenever the Font tab opens (picks up newly added files).
  useEffect(() => {
    if (tab === "font" || fontStatus === null) api.fontStatus().then(setFontStatus).catch(() => {});
  }, [tab]);

  // Double-clicking a caption word on the preview jumps to its colour/font editor.
  useEffect(() => {
    const onPick = () => setTab("captions");
    window.addEventListener("autocut:pickword", onPick);
    return () => window.removeEventListener("autocut:pickword", onPick);
  }, []);

  // Each view opens on its most useful tab.
  useEffect(() => { setTab(view === "editor" ? "captions" : "setup"); }, [view]);

  // Poll status while a job runs
  useEffect(() => {
    if (view !== "processing" || !project?.id) return;
    const timer = setInterval(async () => {
      try {
        const s = await api.status(project.id);
        setProject(s);
        if (s.status === "ready") {
          clearInterval(timer);
          await openEditor(s.id);
        } else if (s.status === "error") {
          clearInterval(timer);
        }
      } catch (e) {
        setError(e.message);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [view, project?.id]);

  // Person cut-out: poll while it builds; start it when the Effects tab opens or a
  // layer needs it (the export builds it too if it is still missing).
  useEffect(() => {
    if (view !== "editor" || matte.status !== "processing" || !project?.id) return;
    const timer = setInterval(() => api.matte(project.id).then(setMatte).catch(() => {}), 1000);
    return () => clearInterval(timer);
  }, [view, matte.status, project?.id]);

  const wantsMatte = view === "editor" && (tab === "effects" || layers.some((l) => l.occlude));
  useEffect(() => {
    if (wantsMatte && matte.status === "none" && project?.id) buildMatte();
  }, [wantsMatte, matte.status, project?.id]);

  async function buildMatte() {
    try {
      setMatte(await api.buildMatte(project.id));
    } catch (e) {
      setMatte({ status: "error", error: e.message });
    }
  }

  async function openEditor(id) {
    const p = await api.plan(id);
    setPlan(p);
    setCaptions(p.captions.map((c) => ({ ...c })));
    setLayers((p.effects?.text_layers || []).map((l) => ({ ...l })));
    api.matte(id).then(setMatte).catch(() => setMatte({ status: "none" }));
    setOptions((o) => ({ ...o, ...p.options }));
    setRenderTag(Date.now());
    setView("editor");
  }

  async function start(music) {
    setError("");
    try {
      const { id } = await api.upload(file, options, music);
      setProject({ id, name: file?.name, status: "queued", stage: "Queued", progress: 0 });
      setView("processing");
    } catch (e) {
      setError(e.message);
    }
  }

  async function rerender() {
    setError("");
    try {
      // Read refs at click time so the request can never use a stale render/state snapshot.
      const currentOptions = { ...optionsRef.current };
      const currentCaptions = captionsRef.current.map(captionEdit);
      await api.rerender(project.id, {
        ...currentOptions,
        captions: currentCaptions,
        text_layers: layersRef.current,
      });
      setProject((p) => ({ ...p, status: "queued", stage: "Queued", progress: 0 }));
      setView("processing");
    } catch (e) {
      setError(e.message);
    }
  }

  async function downloadSubtitles(fmt, group) {
    setError("");
    setSubBusy(true);
    try {
      const currentCaptions = captionsRef.current.map(captionEdit);
      const { blob, name } = await api.subtitles(project.id, fmt, group, { ...optionsRef.current, captions: currentCaptions });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubBusy(false);
    }
  }

  async function openExisting(row) {
    setProject(row);
    if (row.status === "ready") await openEditor(row.id);
    else setView("processing");
  }

  function reset() {
    setView("new");
    setFile(null);
    setProject(null);
    setPlan(null);
    setLayers([]);
    setSelectedLayer(null);
    setMatte({ status: "none" });
    setError("");
  }

  const live = view === "processing" && project?.status !== "error";
  const dirty = useMemo(() => view === "editor" && isDirty(plan, captions, options, layers), [view, plan, captions, options, layers]);
  const tabs = TABS[view];
  const [title, sub] = HEADINGS[tab] || [];
  const projectName = project?.name || file?.name;
  const downloadUrl = project ? api.downloadUrl(project.id, plan?.options?.export_revision ?? renderTag) : "#";

  let chip = null;
  if (view === "processing") chip = project?.status === "error"
    ? <span className="status-chip is-warn">Stopped</span>
    : <span className="status-chip is-live">Rendering</span>;
  if (view === "editor") chip = dirty
    ? <span className="status-chip is-warn">Unsaved edits</span>
    : <span className="status-chip is-ok">Exported</span>;

  return (
    <div className="app">
      <header className="topbar">
        <button onClick={reset} className="brand" aria-label="AutoCut home">
          <span className="brand-mark"><span className={`tally-dot ${live ? "is-live" : ""}`} /></span>
          <span className="brand-name">AutoCut</span>
        </button>
        {projectName && view !== "new" && (
          <div className="crumb">
            <span className="crumb-sep" />
            <span className="crumb-name" title={projectName}>{projectName}</span>
            {chip}
          </div>
        )}
        <div className="topbar-actions">
          {view !== "new" && (
            <button onClick={reset} className="btn btn-quiet">
              <Icon name="plus" /><span className="btn-text">New video</span>
            </button>
          )}
          {view === "editor" && (
            <>
              <DownloadMenu videoUrl={downloadUrl} stale={dirty} busy={subBusy} onSubtitles={downloadSubtitles} />
              <button onClick={rerender} className="btn btn-primary">
                <Icon name="export" />{dirty ? "Export changes" : "Export again"}
              </button>
            </>
          )}
        </div>
      </header>

      <div className={`workspace ${tabs.length ? "" : "no-rail"}`}>
        {error && (
          <div role="alert" className="banner">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss"><Icon name="close" width="16" height="16" /></button>
          </div>
        )}

        <nav className="rail" role="tablist" aria-label="Editor tools">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="rail-btn" onClick={() => setTab(t.id)}>
              <Icon name={t.icon} />{t.label}
            </button>
          ))}
        </nav>

        <section className="panel">
          {view === "new" && (
            <UploadPanel
              tab={tab} title={title} sub={sub}
              presets={presets}
              fontStatus={fontStatus}
              file={file}
              options={options}
              setOptions={setOptions}
              onStart={start}
              onOpen={openExisting}
            />
          )}
          {view === "processing" && <ProcessingPanel project={project} onRetry={reset} />}
          {view === "editor" && (
            <EditorPanel
              tab={tab} title={title} sub={sub}
              presets={presets}
              fontStatus={fontStatus}
              plan={plan}
              captions={captions}
              setCaptions={setCaptions}
              options={options}
              setOptions={setOptions}
              layers={layers}
              setLayers={setLayers}
              selectedLayer={selectedLayer}
              setSelectedLayer={setSelectedLayer}
              matte={matte}
              onBuildMatte={buildMatte}
              onSubtitles={downloadSubtitles}
              subBusy={subBusy}
            />
          )}
        </section>

        <main className="canvas">
          <Stage
            view={view}
            file={file}
            onFile={setFile}
            project={project}
            plan={plan}
            captions={captions}
            options={options}
            setOptions={setOptions}
            videoSrc={view === "editor" ? api.videoUrl(project.id, "reframed", renderTag) : null}
            layers={layers}
            fxEditable={view === "editor" && tab === "effects"}
            selectedLayer={selectedLayer}
            onSelectLayer={(id) => { setSelectedLayer(id); setTab("effects"); }}
            onMoveLayer={(id, x, y) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, x, y } : l)))}
            matte={matte}
            matteSrc={view === "editor" && matte.status === "ready" ? api.matteUrl(project.id, matte.version) : null}
          />
        </main>
      </div>
    </div>
  );
}
