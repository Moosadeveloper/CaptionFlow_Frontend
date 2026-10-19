
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function apiPath(path) {
  return `${BASE}/api${path}`;
}

// Thin wrapper over the FastAPI backend.
async function req(path, opts = {}) {
  const res = await fetch(apiPath(path), opts);

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      msg = (await res.json()).detail || msg;
    } catch {}
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

  buildMatte: (id) =>
    req(`/projects/${id}/matte`, { method: "POST" }),

  matteUrl: (id, version = "") =>
    apiPath(`/projects/${id}/matte/video?v=${encodeURIComponent(version)}`),

  async subtitles(id, fmt, group, body) {
    const res = await fetch(
      apiPath(
        `/projects/${id}/subtitles/${encodeURIComponent(fmt)}?group=${encodeURIComponent(group)}`
      ),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      let msg = `Download failed (${res.status})`;
      try {
        msg = (await res.json()).detail || msg;
      } catch {}
      throw new Error(msg);
    }

    const name =
      /filename="([^"]+)"/.exec(
        res.headers.get("Content-Disposition") || ""
      )?.[1] || `autocut.${fmt}`;

    return { blob: await res.blob(), name };
  },

  videoUrl: (id, kind, bust = "") =>
    apiPath(
      `/projects/${id}/video/${encodeURIComponent(kind)}?v=${encodeURIComponent(bust)}`
    ),

  downloadUrl: (id, revision = "") =>
    apiPath(
      `/projects/${id}/video/final?download=true&v=${encodeURIComponent(revision)}`
    ),
};
