import Icon from "./Icon.jsx";

// Pipeline stages in the order the backend runs them (see pipeline/run.py STAGES).
const STAGES = [
  "Reading video",
  "Transcribing speech",
  "Cutting silences",
  "Tracking face",
  "Writing captions",
  "Planning camera",
  "Reframing video",
  "Exporting",
];

export default function ProcessingPanel({ project, onRetry }) {
  const failed = project?.status === "error";
  const current = STAGES.indexOf(project?.stage);

  if (failed) {
    return (
      <>
        <div className="panel-head">
          <h1 className="panel-title">Processing stopped</h1>
          <p className="panel-sub">The server returned the error below. Try another clip, or check the backend log.</p>
        </div>
        <div className="panel-body">
          <pre className="error-box">{project.error}</pre>
        </div>
        <div className="panel-foot">
          <button onClick={onRetry} className="btn btn-primary btn-lg">Start over with another video</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="panel-head">
        <h1 className="panel-title">Editing your video</h1>
        <p className="panel-sub">A 1-minute clip takes about 1 to 3 minutes on a laptop CPU, faster with a GPU.</p>
      </div>
      <div className="panel-body">
        <ol className="steps">
          {STAGES.map((s, i) => {
            const done = current > i || project?.status === "ready";
            const now = current === i;
            return (
              <li key={s} className={`step ${done ? "is-done" : ""} ${now ? "is-now" : ""}`}>
                <span className="step-dot">{done ? <Icon name="check" /> : now ? null : i + 1}</span>
                {s}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
