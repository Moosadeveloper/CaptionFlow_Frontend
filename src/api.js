// Thin wrapper over the FastAPI backend. Errors surface the server's "detail" message.
async function req(path, opts = {}) {
  const res = await fetch(`/api${path}`, opts);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json();
}

export const api = {
  presets: () => req("/presets"),
  fontStatus: () => req("/fonts/status"),
  projects: () => req("/projects"),
  status: (id) => req(`/projects/${id}`),
  plan: (id) => req(`/projects/${id}/plan`),
  upload(file, options, music) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("options", JSON.stringify(options));
    if (music) fd.append("music", music);
    return req("/projects", { method: "POST", body: fd });
  },
  rerender: (id, body) =>
    req(`/projects/${id}/rerender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  matte: (id) => req(`/projects/${id}/matte`),
  buildMatte: (id) => req(`/projects/${id}/matte`, { method: "POST" }),
  matteUrl: (id, version = "") => `/api/projects/${id}/matte/video?v=${version}`,
  // Subtitles/transcript built from the editor's current captions (not saved).
  async subtitles(id, fmt, group, body) {
    const res = await fetch(`/api/projects/${id}/subtitles/${fmt}?group=${group}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = `Download failed (${res.status})`;
      try { msg = (await res.json()).detail || msg; } catch {}
      throw new Error(msg);
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || `autocut.${fmt}`;
    return { blob: await res.blob(), name };
  },
  videoUrl: (id, kind, bust = "") => `/api/projects/${id}/video/${kind}?v=${bust}`,
  downloadUrl: (id, revision = "") => `/api/projects/${id}/video/final?download=true&v=${revision}`,
};
