/* Gravity — data layer. Talks to Firebase when js/config.js has a Firebase config,
   otherwise falls back to the built-in content in js/content.js. */
window.Store = (function(){
  const C = window.GRAVITY_CONFIG || {};
  const cfg = C.firebase || {};
  const enabled = !!(cfg.apiKey && cfg.projectId);
  const V = "12.19.0";
  const base = `https://www.gstatic.com/firebasejs/${V}/`;
  const loaded = {};
  const load = name => loaded[name] || (loaded[name] = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = base + `firebase-${name}-compat.js`; s.onload = res; s.onerror = () => rej(new Error("Couldn’t load Firebase " + name));
    document.head.appendChild(s);
  }));
  async function ready(withAuth = false){
    if (!enabled) return null;
    await load("app");
    await Promise.all([load("firestore"), withAuth ? load("auth") : null]);
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    return firebase;
  }
  const fallbackProjects = lim => FALLBACK_PROJECTS.map((p, i) => normProject(p.id, {...p, order: i})).slice(0, lim || undefined);
  const fallbackTeam = () => FALLBACK_TEAM.map((m, i) => normMember("m" + (i + 1), {...m, order: i}));
  async function list(col, lim){
    const fb = await ready(); if (!fb) return null;
    let q = fb.firestore().collection(col).orderBy("order"); if (lim) q = q.limit(lim);
    const s = await q.get();
    return s.docs.map(d => ({ id: d.id, data: d.data() }));
  }
  return {
    enabled, ready,
    async projects(lim){
      try { const r = await list("projects", lim); if (r) return r.map(d => normProject(d.id, d.data)); }
      catch (e) { console.warn("Projects: using built-in content.", e); }
      return fallbackProjects(lim);
    },
    async team(){
      try { const r = await list("team"); if (r) return r.map(d => normMember(d.id, d.data)); }
      catch (e) { console.warn("Team: using built-in content.", e); }
      return fallbackTeam();
    },
    /* extra pictures and videos for one project, in order */
    async media(projectId){
      try {
        const fb = await ready(); if (!fb) return [];
        const s = await fb.firestore().collection("projects").doc(projectId).collection("media").orderBy("order").get();
        return s.docs.map(d => normMedia(d.id, d.data())).filter(m => m.src || m.url);
      } catch (e) { console.warn("Gallery not loaded.", e); return []; }
    },
    async clients(){
      try { const r = await list("clients"); if (r) return r.map(d => normClient(d.id, d.data)); }
      catch (e) { console.warn("Clients: using built-in names.", e); }
      return FALLBACK_CLIENTS;
    },
    /* Saves an order/message to Firestore (shown in the admin dashboard) and/or sends it to Formspree. */
    async submit(kind, data, ref){
      let ok = false;
      if (enabled){
        try {
          const fb = await ready();
          await fb.firestore().collection("orders").add({ kind, ref, status: "new", ...data, createdAt: fb.firestore.FieldValue.serverTimestamp() });
          ok = true;
        } catch (e) { console.warn("Order not saved to Firebase.", e); }
      }
      if (C.formEndpoint){
        try {
          const r = await fetch(C.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ type: kind, reference: ref, ...data, _subject: `Gravity ${kind} ${ref}` }) });
          ok = ok || r.ok;
        } catch (e) { console.warn("Order not sent to the form service.", e); }
      }
      return ok;
    },
    contactEmail: C.contactEmail || "hello@gravity.studio"
  };
})();
