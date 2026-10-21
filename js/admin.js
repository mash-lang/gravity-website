/* Gravity — admin dashboard (admin.html).
   Sign-in and permissions are handled by Firebase: only the email(s) listed in firestore.rules
   can change projects and team members or read orders. Hiding this page is just tidiness;
   the rules are what actually protect your data. */
(async function(){
const setupEl = $("#admin-setup"), loginEl = $("#admin-login"), appEl = $("#admin-app"), view = $("#admin-view"), sheet = $("#admin-sheet"), sheetForm = $("#sheet-form");
const C = window.GRAVITY_CONFIG || {};
let projects = [], team = [], orders = [], clients = [], tab = "overview", sheetState = null, pendingErr = "", unsubs = [];
let loaded = { projects: false, team: false, orders: false, clients: false }, knownOrders = null;
const f = { pq: "", pcat: "all", tq: "", cq: "", oq: "", ostatus: "all", okind: "all" };
let toastT = 0;
// toast message, optionally with an action button such as Undo
function toast(msg, action, ms){
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  t.classList.toggle("has-act", !!action);
  if (action) $("button", t).onclick = () => { t.classList.remove("on"); action.fn(); };
  t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms || 2800);
}

if (!Store.enabled){ setupEl.hidden = false; return; }

let fb;
try { fb = await Store.ready(true); }
catch (e) { setupEl.hidden = false; $("h2", setupEl).textContent = "Firebase couldn’t load"; $(".admin-sub", setupEl).textContent = "Check your internet connection, then reload this page."; return; }
const auth = fb.auth(), fs = fb.firestore();
// Signed-in state lasts only for this browser tab session — safer on shared computers.
try { await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION); } catch {}

/* ===================== Small helpers ===================== */
const ICON = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  play: '<svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg>'
};
const CAT_COLOR = { "Graphic design": "#FF2D55", "Video editing": "#7A5CFF", "Broadcasting": "#2BD9A0" };
const toDate = v => v && v.toDate ? v.toDate() : (v ? new Date(v) : null);
function timeAgo(d){
  if (!d) return "just now";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return "yesterday";
  if (s < 604800) return `${Math.floor(s / 86400)} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
const fullDate = d => d ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
function deadlineInfo(str){
  if (!str) return null;
  const d = new Date(str + "T23:59:59"); if (isNaN(d)) return { text: str, cls: "" };
  const days = Math.ceil((d - Date.now()) / 86400000);
  const pretty = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (days < 0) return { text: `${pretty} (${-days} day${days === -1 ? "" : "s"} overdue)`, cls: "overdue" };
  if (days === 0) return { text: `${pretty} (today)`, cls: "overdue" };
  return { text: `${pretty} (in ${days} day${days === 1 ? "" : "s"})`, cls: days <= 3 ? "overdue" : "" };
}
// WhatsApp needs an international number; local Bangladeshi numbers (01…) get 88 added.
function waLink(phone){
  let d = String(phone || "").replace(/\D/g, ""); if (!d) return null;
  if (d.length === 11 && d.startsWith("01")) d = "88" + d;
  return `https://wa.me/${d}`;
}
function countUp(root){
  $$("[data-count]", root).forEach(el => {
    const to = Number(el.dataset.count) || 0;
    if (reduceMotion || to === 0){ el.textContent = to; return; }
    const t0 = performance.now(), dur = 900;
    const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function greet(){ const h = new Date().getHours(); return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

/* ===================== Sign in ===================== */
function showLogin(){
  appEl.hidden = true; loginEl.hidden = false;
  $("#login-err").textContent = pendingErr;
  if (pendingErr) $("#login-form").classList.add("shake");
  pendingErr = "";
  setTimeout(() => { $("#login-form").classList.remove("shake"); $("#ad-email").focus(); }, 450);
}
const authMessage = code => ({
  "auth/invalid-credential": "That email and password don’t match.",
  "auth/wrong-password": "That email and password don’t match.",
  "auth/user-not-found": "That email and password don’t match.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes, then try again.",
  "auth/network-request-failed": "Couldn’t reach Firebase. Check your connection and try again.",
  "auth/user-disabled": "This account has been turned off in Firebase.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "The Firebase API key in js/config.js isn’t valid. Check it, then hard-refresh this page."
}[code] || "Sign-in didn’t work. Try again.");

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#login-err"), email = $("#ad-email").value.trim(), pw = $("#ad-pw").value;
  const form = e.currentTarget;
  if (!email || !pw){ err.textContent = "Enter your admin email and password."; form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake"); return; }
  const btn = $("#login-btn"); btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
  try { await auth.signInWithEmailAndPassword(email, pw); }
  catch (x) { err.textContent = authMessage(x.code); form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake"); }
  finally { btn.disabled = false; btn.textContent = "Sign in"; }
});
$("#forgot").addEventListener("click", async () => {
  const err = $("#login-err"), email = $("#ad-email").value.trim();
  if (!email){ err.textContent = "Enter your admin email first, then choose Forgot password."; $("#ad-email").focus(); return; }
  try { await auth.sendPasswordResetEmail(email); } catch {}
  err.textContent = "If that email has an account, a reset link is on its way. Check your inbox.";
});

auth.onAuthStateChanged(async user => {
  unsubs.forEach(u => u()); unsubs = []; knownOrders = null; loaded = { projects: false, team: false, orders: false, clients: false };
  if (!user){ showLogin(); return; }
  // Only admins can read orders, so this doubles as the admin check.
  try { await fs.collection("orders").limit(1).get(); }
  catch (x) {
    pendingErr = x.code === "permission-denied" ? "This account doesn’t have admin access. Add its email to firestore.rules." : "Couldn’t check admin access. Try again.";
    await auth.signOut(); return;
  }
  loginEl.hidden = true; appEl.hidden = false; $("#login-form").reset();
  listen(); switchTab(tab);
});
$("#admin-signout").addEventListener("click", async () => { await auth.signOut(); toast("Signed out"); });

/* ===================== Live data ===================== */
function listen(){
  unsubs.push(fs.collection("projects").orderBy("order").onSnapshot(s => {
    projects = s.docs.map(d => ({ ...normProject(d.id, d.data()), createdAt: d.data().createdAt || null })); loaded.projects = true;
    $("#n-projects").textContent = projects.length; refresh(["projects", "overview"]);
  }, e => console.warn(e)));
  unsubs.push(fs.collection("team").orderBy("order").onSnapshot(s => {
    team = s.docs.map(d => normMember(d.id, d.data())); loaded.team = true;
    $("#n-team").textContent = team.length; refresh(["team", "overview"]);
  }, e => console.warn(e)));
  unsubs.push(fs.collection("clients").orderBy("order").onSnapshot(s => {
    clients = s.docs.map(d => normClient(d.id, d.data())); loaded.clients = true;
    $("#n-clients").textContent = clients.length; refresh(["clients", "overview"]);
  }, e => { console.warn(e); loaded.clients = true; if (e.code === "permission-denied") toast("Update firestore.rules to manage clients (see README)."); refresh(["clients", "overview"]); }));
  unsubs.push(fs.collection("orders").orderBy("createdAt", "desc").onSnapshot(s => {
    orders = s.docs.map(d => ({ id: d.id, ...d.data() })); loaded.orders = true;
    const ids = new Set(orders.map(o => o.id));
    if (knownOrders){
      const fresh = orders.filter(o => !knownOrders.has(o.id));
      fresh.forEach(o => announce(o));
    }
    knownOrders = ids;
    const n = orders.filter(o => o.status !== "done").length, c = $("#new-count");
    if (String(n) !== c.textContent){ c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
    c.hidden = !n; c.textContent = n;
    document.title = (n ? `(${n}) ` : "") + "Admin — Gravity";
    refresh(["orders", "overview"]);
  }, e => console.warn(e)));
}
function announce(o){
  const what = o.kind === "order" ? `New order from ${o.name}` : `New message from ${o.name}`;
  toast(what);
  try { if (window.Notification && Notification.permission === "granted" && document.hidden) new Notification("Gravity", { body: what, icon: "images/favicon.svg" }); } catch {}
}

/* ===================== Views ===================== */
// Each view has a shell (rendered on tab switch) and a fill (re-rendered when data changes),
// so typing in a search box isn't interrupted by live updates.
$$(".admin-tabs button").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.atab)));
function switchTab(t, opts = {}){
  tab = t;
  $$(".admin-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.atab === tab));
  const ready = tab === "account" || (tab === "overview" ? loaded.projects && loaded.team && loaded.orders : tab === "team" ? loaded.team : loaded[tab]);
  if (!ready){ view.innerHTML = `<div class="skeleton"><span></span><span></span><span></span><span></span></div>`; return; }
  view.innerHTML = VIEWS[tab].shell();
  view.classList.remove("view-enter", "no-anim"); void view.offsetWidth; view.classList.add("view-enter");
  VIEWS[tab].fill(true, opts);
  countUp(view);
  scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}
function refresh(tabs){
  if (appEl.hidden || !tabs.includes(tab)) return;
  if (!view.querySelector("[data-shell]")) return switchTab(tab);
  view.classList.remove("view-enter"); view.classList.add("no-anim");
  VIEWS[tab].fill(false);
}

const VIEWS = {};

/* ---------- Overview ---------- */
VIEWS.overview = {
  shell(){
    const name = (auth.currentUser?.email || "").split("@")[0];
    const now = new Date(), month = now.getMonth(), year = now.getFullYear();
    const inMonth = (o, m, y) => { const d = toDate(o.createdAt); return d && d.getMonth() === m && d.getFullYear() === y; };
    const thisM = orders.filter(o => inMonth(o, month, year)).length;
    const lastM = orders.filter(o => inMonth(o, (month + 11) % 12, month === 0 ? year - 1 : year)).length;
    const diff = thisM - lastM;
    const newOrders = orders.filter(o => o.status !== "done");
    const byCat = SERVICES.map(c => [c, projects.filter(p => p.cat === c).length]);
    const noImg = projects.filter(p => !cover(p)), noPhoto = team.filter(m => !m.photo), noProfile = team.filter(m => !m.about), noDesc = projects.filter(p => p.desc.length < 20);

    // last 14 days
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i)); return d; });
    const series = days.map(d => {
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const inDay = orders.filter(o => { const t = toDate(o.createdAt); return t && t >= d && t < next; });
      return { d, o: inDay.filter(x => x.kind === "order").length, m: inDay.filter(x => x.kind !== "order").length };
    });
    const max = Math.max(1, ...series.map(s => s.o + s.m));
    const W = 700, H = 170, bw = W / 14;
    const bars = series.map((s, i) => {
      const ho = (s.o / max) * (H - 30), hm = (s.m / max) * (H - 30), x = i * bw + bw * .2, w = bw * .6;
      return `<g><title>${s.d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}: ${s.o} order${s.o === 1 ? "" : "s"}, ${s.m} message${s.m === 1 ? "" : "s"}</title>
        <rect x="${x}" y="${H - 20 - ho - hm}" width="${w}" height="${Math.max(hm, 0)}" rx="3" fill="rgba(var(--dust),.35)" class="bar" style="animation-delay:${i * 40}ms"/>
        <rect x="${x}" y="${H - 20 - ho}" width="${w}" height="${Math.max(ho, 0)}" rx="3" fill="var(--red)" class="bar" style="animation-delay:${i * 40}ms"/>
        ${s.o + s.m === 0 ? `<rect x="${x}" y="${H - 22}" width="${w}" height="2" rx="1" fill="var(--line)"/>` : ""}
        ${i % 2 === 0 ? `<text x="${x + w / 2}" y="${H - 4}" text-anchor="middle">${s.d.getDate()}</text>` : ""}</g>`;
    }).join("");
    const total14 = series.reduce((a, s) => a + s.o + s.m, 0);
    const recent = orders.slice(0, 5);
    const totalP = projects.length || 1;
    const configOK = !!C.formEndpoint;

    return `<div data-shell>
      <div class="hello"><h2 class="display">${greet()}${name ? ", " + esc(name) : ""}.</h2><p>${now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Here’s how the studio site is doing.</p></div>
      <div class="stats">
        <button class="stat" type="button" data-go="orders" data-status="new"><span class="lbl">${newOrders.length ? '<i class="pulse"></i>' : ""}Waiting for reply</span><span class="num" data-count="${newOrders.length}">0</span><span class="sub">${newOrders.filter(o => o.kind === "order").length} orders, ${newOrders.filter(o => o.kind !== "order").length} messages</span></button>
        <button class="stat" type="button" data-go="orders"><span class="lbl">Received this month</span><span class="num" data-count="${thisM}">0</span><span class="sub"><b class="${diff > 0 ? "up" : diff < 0 ? "down" : ""}">${diff > 0 ? "▲ " + diff : diff < 0 ? "▼ " + (-diff) : "Same"}</b> vs last month (${lastM})</span></button>
        <button class="stat" type="button" data-go="projects"><span class="lbl">Projects on the site</span><span class="num" data-count="${projects.length}">0</span><span class="sub">${projects.filter(p => p.featured).length} featured · ${projects.reduce((a, p) => a + p.mediaCount, 0)} gallery items</span></button>
        <button class="stat" type="button" data-go="team"><span class="lbl">Team members</span><span class="num" data-count="${team.length}">0</span><span class="sub">${team.filter(m => m.photo).length} with photos</span></button>
      </div>
      <div class="ov-grid">
        <div class="card chart"><h3>Last 14 days <span style="font-weight:550;color:var(--muted);font-size:.85rem">${total14} total</span></h3>
          <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Orders and messages per day for the last 14 days">${bars}</svg>
          <div class="legend"><span><i style="background:var(--red)"></i>Orders</span><span><i style="background:rgba(var(--dust),.35)"></i>Messages</span></div>
        </div>
        <div class="card"><h3>Recent activity <button type="button" data-go="orders">See all</button></h3>
          ${recent.length ? `<ul class="mini-list">${recent.map(o => `<li data-open-order="${esc(o.id)}"><span class="pill ${o.status === "done" ? "" : "hot"}">${o.status === "done" ? "Done" : "New"}</span><span class="who"><b>${esc(o.name)}</b><span>${esc(o.kind === "order" ? o.service || "Order" : "Message")}</span></span><time title="${esc(fullDate(toDate(o.createdAt)))}">${esc(timeAgo(toDate(o.createdAt)))}</time></li>`).join("")}</ul>` : `<p style="color:var(--muted);margin:0">No orders yet. They’ll appear here the moment someone sends one.</p>`}
        </div>
        <div class="card"><h3>Projects by service <button type="button" data-go="projects">Manage</button></h3>
          <div class="split-bar">${byCat.map(([c, n]) => n ? `<span style="width:${(n / totalP) * 100}%;background:${CAT_COLOR[c]}" title="${c}: ${n}"></span>` : "").join("")}</div>
          <div class="split-legend">${byCat.map(([c, n]) => `<div><span><i style="background:${CAT_COLOR[c]}"></i>${c}</span><b>${n}</b></div>`).join("")}</div>
        </div>
        <div class="card"><h3>Site checklist</h3>
          <ul class="check">
            <li class="${noImg.length ? "warn" : "ok"}"><span class="ic">${noImg.length ? "!" : "✓"}</span><span>${noImg.length ? `${noImg.length} project${noImg.length === 1 ? " has" : "s have"} no cover image` : "Every project has a cover image"}<small>${noImg.length ? `${esc(noImg.slice(0, 3).map(p => p.title).join(", "))}${noImg.length > 3 ? "…" : ""} · <button type="button" data-fix="img">Fix now</button>` : "Great: the reels and grids look their best."}</small></span></li>
            <li class="${noPhoto.length ? "warn" : "ok"}"><span class="ic">${noPhoto.length ? "!" : "✓"}</span><span>${noPhoto.length ? `${noPhoto.length} team member${noPhoto.length === 1 ? " has" : "s have"} no photo` : "Every team member has a photo"}<small>${noPhoto.length ? `${esc(noPhoto.slice(0, 3).map(m => m.name).join(", "))} · <button type="button" data-go="team">Add photos</button>` : "Faces build trust with new clients."}</small></span></li>
            <li class="${noProfile.length ? "warn" : "ok"}"><span class="ic">${noProfile.length ? "!" : "✓"}</span><span>${noProfile.length ? `${noProfile.length} team member${noProfile.length === 1 ? " has" : "s have"} no profile yet` : "Every team member has a profile"}<small>${noProfile.length ? `${esc(noProfile.slice(0, 3).map(m => m.name).join(", "))} · <button type="button" data-go="team">Write profiles</button>` : "Visitors can click anyone to read their story."}</small></span></li>
            <li class="${noDesc.length ? "warn" : "ok"}"><span class="ic">${noDesc.length ? "!" : "✓"}</span><span>${noDesc.length ? `${noDesc.length} project${noDesc.length === 1 ? " has" : "s have"} a very short description` : "Project descriptions look complete"}<small>${noDesc.length ? "A sentence or two about the brief helps clients understand the work." : "Visitors can see what each brief was."}</small></span></li>
            <li class="${clients.length ? "ok" : "warn"}"><span class="ic">${clients.length ? "✓" : "!"}</span><span>${clients.length ? `${clients.length} client${clients.length === 1 ? "" : "s"} on the home page` : "No clients added yet"}<small>${clients.length ? `${clients.filter(c => c.logo).length} with logos · <button type="button" data-go="clients">Manage</button>` : `The home page shows sample names until you <button type="button" data-quick="client">add your clients</button>.`}</small></span></li>
            <li class="${configOK ? "ok" : "warn"}"><span class="ic">${configOK ? "✓" : "!"}</span><span>${configOK ? "Email alerts are on" : "Email alerts are off"}<small>${configOK ? `New orders are also emailed to ${esc(C.contactEmail || "you")}.` : "Add a Formspree link in js/config.js to get orders by email."}</small></span></li>
          </ul>
        </div>
      </div>
      <div class="card" style="margin-top:1rem"><h3>Quick actions</h3>
        <div class="quick">
          <button class="btn btn-red sm" type="button" data-quick="project">Add project</button>
          <button class="btn btn-ghost sm" type="button" data-quick="member">Add team member</button>
          <button class="btn btn-ghost sm" type="button" data-quick="client">Add client</button>
          <a class="btn btn-ghost sm" href="index.html" target="_blank" rel="noopener">Open website</a>
          <a class="btn btn-ghost sm" href="https://console.firebase.google.com/project/${esc((C.firebase || {}).projectId || "")}" target="_blank" rel="noopener">Firebase console</a>
          ${configOK ? `<a class="btn btn-ghost sm" href="https://formspree.io/forms" target="_blank" rel="noopener">Formspree inbox</a>` : ""}
        </div>
      </div>
    </div>`;
  },
  fill(first){
    if (first) return;
    view.innerHTML = this.shell();
    $$("[data-count]", view).forEach(el => el.textContent = el.dataset.count);
  }
};

/* ---------- Projects, team and clients lists (one engine) ---------- */
const KINDS = {
  project: { col: "projects", tab: "projects", title: "Projects", one: "project", many: "projects", add: "Add project", q: "pq", ph: "Search title, client or year",
    list: () => projects, label: x => x.title, hay: x => [x.title, x.client, x.year, x.cat, x.services.join(" ")] },
  member: { col: "team", tab: "team", title: "Team members", one: "member", many: "members", add: "Add member", q: "tq", ph: "Search name or role",
    list: () => team, label: x => x.name, hay: x => [x.name, x.role, x.bio, x.skills.join(" ")] },
  client: { col: "clients", tab: "clients", title: "Clients", one: "client", many: "clients", add: "Add client", q: "cq", ph: "Search clients",
    list: () => clients, label: x => x.name, hay: x => [x.name, x.url] }
};
const HANDLE = '<span class="drag" title="Drag to reorder" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></span>';
function listShell(kind){
  const K = KINDS[kind], isP = kind === "project";
  const chips = isP ? `<div class="fchips">${["all", "featured", ...SERVICES].map(c => `<button type="button" data-pcat="${c}" aria-pressed="${f.pcat === c}">${c === "all" ? "All" : c === "featured" ? "★ Featured" : c}<em data-cnt="${c}"></em></button>`).join("")}</div>` : "";
  const tip = {
    project: "Drag the handle to reorder. ★ Featured projects lead the home page and the moving reels.",
    member: "Drag the handle to reorder. Click Links to jump straight to someone’s social links.",
    client: "Logos scroll across the home page in this order. Transparent PNG logos look best."
  }[kind];
  return `<div data-shell>
    <div class="admin-head"><div><h2 class="display">${K.title}</h2><p data-summary></p></div>
      <button class="btn btn-red" type="button" data-act="add" data-kind="${kind}" title="Shortcut: N">${K.add}</button></div>
    <div class="toolbar"><label class="search"><span class="sr">Search</span>${ICON.search}<input type="search" data-q="${K.q}" value="${esc(f[K.q])}" placeholder="${K.ph}" title="Shortcut: /"></label>${chips}</div>
    <p class="tip">${tip}</p>
    <div data-list></div>
  </div>`;
}
function rowThumb(kind, x){
  if (kind === "project") return `<span class="athumb">${media(x, 160, 120)}${x.video ? `<span class="badge-v">${ICON.play}</span>` : ""}${x.featured ? '<span class="badge-star" title="Featured">★</span>' : ""}</span>`;
  if (kind === "member") return `<span class="athumb round">${x.photo ? `<img src="${esc(x.photo)}" alt="">` : `<b>${esc(initials(x.name))}</b>`}</span>`;
  return `<span class="athumb logo">${x.logo ? `<img src="${esc(x.logo)}" alt="">` : `<b>${esc(initials(x.name))}</b>`}</span>`;
}
function rowInfo(kind, x){
  const created = toDate(x.createdAt);
  if (kind === "project") return `<b>${esc(x.title)}</b><span>${esc([x.cat, x.client, x.year].filter(Boolean).join(" · "))}</span>${x.desc ? `<p>${esc(x.desc)}</p>` : ""}
    <span class="pills">${x.featured ? '<span class="pill hot">★ Featured</span>' : ""}${cover(x) ? `<span class="pill good">${x.image ? "Cover image" : "YouTube thumbnail"}</span>` : '<span class="pill warn">No image</span>'}${x.mediaCount ? `<span class="pill">${x.mediaCount} in gallery</span>` : ""}${x.video ? `<span class="pill">${youtubeId(x.video) ? "YouTube" : "Video"}</span>` : ""}${x.services.length ? `<span class="pill">${x.services.length} services</span>` : ""}${x.duration ? `<span class="pill">${esc(x.duration)}</span>` : ""}${created ? `<span class="pill" title="${esc(fullDate(created))}">Added ${esc(timeAgo(created))}</span>` : ""}</span>`;
  if (kind === "member") return `<b>${esc(x.name)}</b><span>${esc(x.role)}</span>${x.bio ? `<p>${esc(x.bio)}</p>` : ""}
    <span class="pills">${x.photo ? '<span class="pill good">Photo</span>' : '<span class="pill warn">No photo</span>'}${x.about ? '<span class="pill good">Profile</span>' : '<span class="pill warn">No profile</span>'}${x.years ? `<span class="pill">${x.years} yrs</span>` : ""}${x.skills.length ? `<span class="pill">${x.skills.length} skills</span>` : ""}${Object.keys(x.socials).length ? `<span class="pill">${Object.keys(x.socials).length} links</span>` : '<span class="pill warn">No links</span>'}</span>`;
  return `<b>${esc(x.name)}</b><span>${x.url ? esc(x.url.replace(/^https:\/\//, "")) : "No website link"}</span>
    <span class="pills">${x.logo ? '<span class="pill good">Logo</span>' : '<span class="pill warn">Name only</span>'}</span>`;
}
function listFill(kind, animate){
  const K = KINDS[kind], all = K.list(), isP = kind === "project";
  const q = (f[K.q] || "").toLowerCase().trim();
  const list = all.filter(x => !pendingDelete.has(x.id) && (!isP || f.pcat === "all" || (f.pcat === "featured" ? x.featured : x.cat === f.pcat)) &&
    (!q || K.hay(x).join(" ").toLowerCase().includes(q)));
  const filtering = !!q || (isP && f.pcat !== "all");
  const n = all.length;
  $("[data-summary]", view).textContent = isP
    ? `${n} ${n === 1 ? "project" : "projects"} · ${all.filter(p => p.featured).length} featured · ${all.filter(p => cover(p)).length} with images · ${all.reduce((a, p) => a + p.mediaCount, 0)} gallery items.`
    : kind === "member" ? `${n} ${n === 1 ? "member" : "members"} · ${all.filter(m => m.photo).length} with photos · ${all.filter(m => m.about).length} with profiles.`
    : `${n} ${n === 1 ? "client" : "clients"} · ${all.filter(c => c.logo).length} with logos. ${n ? "" : "Until you add some, the home page shows sample names."}`;
  if (isP) $$("[data-cnt]", view).forEach(el => { const c = el.dataset.cnt; el.textContent = c === "all" ? projects.length : c === "featured" ? projects.filter(p => p.featured).length : projects.filter(p => p.cat === c).length; });
  const host = $("[data-list]", view);
  if (!n){
    host.innerHTML = kind === "client"
      ? `<div class="aempty"><p>No clients yet. Add a client’s name and logo and it starts scrolling across the home page.</p><button class="btn btn-red starter" type="button" data-act="add" data-kind="client">Add your first client</button></div>`
      : `<div class="aempty"><p>${isP ? "No projects yet. Add your first one, or start with the sample projects and edit them." : "No team members yet. Add someone, or start with the sample team and edit it."}</p>
      <button class="btn btn-ghost starter" type="button" data-act="starter" data-kind="${kind}">${isP ? "Add the 9 sample projects" : "Add the 5 sample members"}</button></div>`;
    return;
  }
  if (!list.length){ host.innerHTML = `<div class="aempty">Nothing matches that search.</div>`; return; }
  host.innerHTML = `<ul class="alist${animate ? " anim" : ""}${filtering ? " filtering" : ""}" data-kind="${kind}">${list.map((x, i) => {
    const idx = all.indexOf(x);
    const arrows = filtering ? "" : `<button class="ibtn" type="button" data-act="up"${idx === 0 ? " disabled" : ""} aria-label="Move up">↑</button><button class="ibtn" type="button" data-act="down"${idx === n - 1 ? " disabled" : ""} aria-label="Move down">↓</button>`;
    return `<li class="arow" data-id="${esc(x.id)}" style="--i:${i}">
      ${filtering ? "" : HANDLE}${rowThumb(kind, x)}
      <span class="ainfo">${rowInfo(kind, x)}</span>
      <span class="aact">${arrows}
        ${isP ? `<button class="ibtn star${x.featured ? " on" : ""}" type="button" data-act="feature" aria-pressed="${x.featured}" title="${x.featured ? "Remove from featured" : "Feature on the home page"}">★</button><a class="btn btn-ghost sm" href="work.html?project=${encodeURIComponent(x.id)}" target="_blank" rel="noopener" title="Open on the website">View</a>` : ""}
        ${kind === "member" ? `<button class="btn btn-ghost sm" type="button" data-act="links" title="Edit ${esc(x.name)}’s social links">Links</button><a class="btn btn-ghost sm" href="team.html?member=${encodeURIComponent(x.id)}" target="_blank" rel="noopener" title="Open on the website">View</a>` : ""}
        <button class="btn btn-ghost sm" type="button" data-act="edit">Edit</button>
        <button class="btn btn-ghost sm danger" type="button" data-act="delete">Delete</button>
      </span>
    </li>`;
  }).join("")}</ul>`;
}
VIEWS.projects = { shell: () => listShell("project"), fill: animate => listFill("project", animate) };
VIEWS.team = { shell: () => listShell("member"), fill: animate => listFill("member", animate) };
VIEWS.clients = { shell: () => listShell("client"), fill: animate => listFill("client", animate) };

/* ---------- Orders ---------- */
VIEWS.orders = {
  shell(){
    const chip = (key, val, label) => `<button type="button" data-${key}="${val}" aria-pressed="${f[key] === val}">${label}<em data-ocnt="${key}:${val}"></em></button>`;
    return `<div data-shell>
      <div class="admin-head"><div><h2 class="display">Orders and messages</h2><p data-summary></p></div></div>
      <div class="toolbar">
        <label class="search"><span class="sr">Search</span>${ICON.search}<input type="search" data-q="oq" value="${esc(f.oq)}" placeholder="Search name, email, reference or text"></label>
        <div class="fchips">${chip("ostatus", "all", "All")}${chip("ostatus", "new", "New")}${chip("ostatus", "done", "Done")}</div>
        <div class="fchips">${chip("okind", "all", "Both")}${chip("okind", "order", "Orders")}${chip("okind", "message", "Messages")}</div>
      </div>
      <div data-list style="display:grid;gap:.85rem"></div>
    </div>`;
  },
  fill(animate, opts = {}){
    const q = f.oq.toLowerCase().trim();
    const match = (o, st, kd) => (st === "all" || (st === "new" ? o.status !== "done" : o.status === "done")) && (kd === "all" || (kd === "order" ? o.kind === "order" : o.kind !== "order"));
    const list = orders.filter(o => match(o, f.ostatus, f.okind) && (!q || [o.name, o.email, o.ref, o.phone, o.details, o.message, o.subject, o.company, o.service].join(" ").toLowerCase().includes(q)));
    $$("[data-ocnt]", view).forEach(el => {
      const [key, val] = el.dataset.ocnt.split(":");
      el.textContent = orders.filter(o => key === "ostatus" ? match(o, val, f.okind) : match(o, f.ostatus, val)).length;
    });
    const nNew = orders.filter(o => o.status !== "done").length;
    $("[data-summary]", view).textContent = orders.length ? `${orders.length} total · ${nNew} waiting for a reply. New ones appear here automatically.` : "New ones appear here automatically.";
    const host = $("[data-list]", view);
    if (!orders.length){ host.innerHTML = `<div class="aempty">No orders or messages yet. Share your contact page to get the first one.</div>`; return; }
    if (!list.length){ host.innerHTML = `<div class="aempty">Nothing matches these filters.</div>`; return; }
    host.innerHTML = list.map((o, i) => {
      const d = toDate(o.createdAt), done = o.status === "done", isOrder = o.kind === "order";
      const dl = isOrder ? deadlineInfo(o.deadline) : null, wa = waLink(o.phone);
      const subject = encodeURIComponent(`Re: your Gravity ${o.kind || "order"} ${o.ref || ""}`);
      const greeting = encodeURIComponent(`Hi ${(o.name || "").split(" ")[0]},\n\nThanks for your ${isOrder ? "order" : "message"} (${o.ref || ""}).\n\n`);
      const rows = isOrder ? [["Service", o.service], ["Package", o.package], ["Deadline", dl && `<span class="${dl.cls}">${esc(dl.text)}</span>`, true], ["Budget", o.budget], ["Company", o.company]].filter(r => r[1]) : [];
      return `<article class="ocard${done ? " done" : " new"}${animate ? " anim" : ""}" data-id="${esc(o.id)}" style="--i:${i}">
        <div class="ohead"><span class="pill ${done ? "" : "hot"}">${done ? "Done" : "New"}</span><span class="pill">${isOrder ? "Order" : "Message"}</span><span class="ref">${esc(o.ref || "")}</span><time title="${esc(fullDate(d))}">${esc(timeAgo(d))}</time></div>
        <h4>${esc(o.name || "Someone")}${isOrder ? "" : (o.subject ? ` · ${esc(o.subject)}` : "")}</h4>
        <div class="contact-line"><span><a href="mailto:${esc(o.email)}">${esc(o.email)}</a> <button class="copy" type="button" data-copy="${esc(o.email)}">copy</button></span>${o.phone ? `<span>${esc(o.phone)} <button class="copy" type="button" data-copy="${esc(o.phone)}">copy</button></span>` : ""}</div>
        ${rows.length ? `<dl class="ogrid">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[2] ? r[1] : esc(r[1])}</dd></div>`).join("")}</dl>` : ""}
        <p class="omsg">${esc(isOrder ? o.details : o.message)}</p>
        <div class="oact">
          <a class="btn btn-red sm" href="mailto:${esc(o.email)}?subject=${subject}&body=${greeting}">Reply by email</a>
          ${wa ? `<a class="btn btn-ghost sm" href="${wa}?text=${greeting}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          <button class="btn btn-ghost sm" type="button" data-act="toggle-done">${done ? "Mark as new" : "Mark as done"}</button>
          <button class="btn btn-ghost sm danger" type="button" data-act="order-del">Delete</button>
        </div>
      </article>`;
    }).join("");
    if (opts.flash){ const el = $(`.ocard[data-id="${CSS.escape(opts.flash)}"]`, host); if (el){ el.classList.add("flash"); el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" }); } }
  }
};

/* ---------- Account ---------- */
VIEWS.account = {
  shell(){
    const u = auth.currentUser || {}, meta = u.metadata || {};
    const fbc = C.firebase || {};
    const notifState = !window.Notification ? "unsupported" : Notification.permission;
    return `<div data-shell>
      <div class="admin-head"><div><h2 class="display">Account</h2><p>Your sign-in, site settings and password.</p></div></div>
      <div class="acct">
        <div class="card"><h3>Signed in</h3>
          <dl class="kv">
            <dt>Email</dt><dd>${esc(u.email || "")}</dd>
            <dt>Account created</dt><dd>${esc(meta.creationTime ? fullDate(new Date(meta.creationTime)) : "—")}</dd>
            <dt>Last sign-in</dt><dd>${esc(meta.lastSignInTime ? fullDate(new Date(meta.lastSignInTime)) : "—")}</dd>
            <dt>Session</dt><dd>Ends when you close this tab</dd>
          </dl>
        </div>
        <div class="card"><h3>Website settings</h3>
          <dl class="kv">
            <dt>Firebase project</dt><dd>${esc(fbc.projectId || "—")}</dd>
            <dt>Email alerts</dt><dd>${C.formEndpoint ? '<span class="ok-dot"></span>On (Formspree)' : '<span class="no-dot"></span>Off'}</dd>
            <dt>Contact email</dt><dd>${esc(C.contactEmail || "—")}</dd>
            <dt>Content</dt><dd>${projects.length} projects · ${team.length} members · ${orders.length} orders</dd>
          </dl>
          <p class="note" style="margin-top:1rem">These come from js/config.js on GitHub.</p>
        </div>
        <div class="card"><h3>Desktop alerts</h3>
          <p style="color:var(--muted);margin:0 0 1rem;font-size:.93rem">Get a pop-up on this computer when a new order arrives while the dashboard is open in another tab.</p>
          ${notifState === "granted" ? `<p class="ok-msg"><span class="ok-dot"></span>On for this browser.</p>`
            : notifState === "denied" ? `<p class="note" style="margin:0">Blocked in your browser settings. Allow notifications for this site to turn them on.</p>`
            : notifState === "unsupported" ? `<p class="note" style="margin:0">This browser doesn’t support desktop alerts.</p>`
            : `<button class="btn btn-ghost sm" type="button" data-act="notify">Turn on desktop alerts</button>`}
        </div>
        <div class="card">
          <form class="admin-card" id="pw-form" novalidate>
            <h3 style="margin:0">Change password</h3>
            <div class="field"><label for="pw-cur">Current password</label><input type="password" id="pw-cur" autocomplete="current-password"></div>
            <div class="field"><label for="pw-new">New password</label><input type="password" id="pw-new" autocomplete="new-password"></div>
            <div class="field"><label for="pw-new2">Repeat new password</label><input type="password" id="pw-new2" autocomplete="new-password"></div>
            <p class="err-msg" id="pw-err" aria-live="polite"></p>
            <div class="form-foot"><button class="btn btn-red" type="submit">Update password</button></div>
          </form>
        </div>
      </div>
      <p class="note">To add another admin, create their account in Firebase → Authentication, then add their email to the list in firestore.rules and publish the rules.</p>
    </div>`;
  },
  fill(){}
};

/* ===================== Actions ===================== */
view.addEventListener("input", e => {
  const q = e.target.dataset.q; if (!q) return;
  f[q] = e.target.value; VIEWS[tab].fill(false);
});
async function reorder(col, list, from, to){
  if (to < 0 || to >= list.length || from === to) return;
  const arr = list.slice(); const [m] = arr.splice(from, 1); arr.splice(to, 0, m);
  const batch = fs.batch();
  arr.forEach((x, i) => { if (x.order !== i) batch.update(fs.collection(col).doc(x.id), { order: i }); });
  await batch.commit();
}
async function addStarter(kind){
  const batch = fs.batch(), now = new Date().toISOString();
  if (kind === "project") FALLBACK_PROJECTS.forEach((p, i) => {
    const { id, ...rest } = p; batch.set(fs.collection("projects").doc(id), { ...rest, image: null, video: "", order: i, createdAt: now, mediaCount: 0 });
  });
  else FALLBACK_TEAM.forEach((m, i) => batch.set(fs.collection("team").doc("m" + (i + 1)), { ...m, photo: null, order: i, createdAt: now }));
  await batch.commit();
}
/* ---------- delete with undo: items disappear at once, and are really removed after a few seconds ---------- */
const pendingDelete = new Map();
async function hardDelete(kind, item){
  const K = KINDS[kind], ref = fs.collection(K.col).doc(item.id);
  if (kind === "project"){
    try { const s = await ref.collection("media").get(); for (const d of s.docs) await d.ref.delete(); } catch {}
  }
  await ref.delete();
}
function softDelete(kind, item){
  const K = KINDS[kind];
  const timer = setTimeout(async () => {
    pendingDelete.delete(item.id);
    try { await hardDelete(kind, item); } catch { toast("Couldn’t delete. Try again."); VIEWS[tab]?.fill(false); }
  }, 6000);
  pendingDelete.set(item.id, { kind, item, timer });
  VIEWS[tab].fill(false);
  toast(`${K.label(item)} deleted`, { label: "Undo", fn: () => { clearTimeout(timer); pendingDelete.delete(item.id); VIEWS[tab].fill(false); toast("Restored"); } }, 6000);
}
addEventListener("pagehide", () => { for (const [, p] of pendingDelete){ clearTimeout(p.timer); hardDelete(p.kind, p.item).catch(() => {}); } pendingDelete.clear(); });

view.addEventListener("click", async e => {
  const go = e.target.closest("[data-go]");
  if (go){ if (go.dataset.status){ f.ostatus = go.dataset.status; f.okind = "all"; f.oq = ""; } switchTab(go.dataset.go); return; }
  const openO = e.target.closest("[data-open-order]");
  if (openO){ f.ostatus = "all"; f.okind = "all"; f.oq = ""; switchTab("orders", { flash: openO.dataset.openOrder }); return; }
  const fix = e.target.closest("[data-fix]");
  if (fix){ const p = projects.find(x => !cover(x)); if (p){ switchTab("projects"); openSheet("project", p); } return; }
  const quick = e.target.closest("[data-quick]");
  if (quick){ openSheet(quick.dataset.quick, null); return; }
  const copy = e.target.closest("[data-copy]");
  if (copy){ try { await navigator.clipboard.writeText(copy.dataset.copy); toast("Copied"); } catch { toast("Couldn’t copy"); } return; }
  const fc = e.target.closest("[data-pcat], [data-ostatus], [data-okind]");
  if (fc){
    const key = fc.dataset.pcat !== undefined ? "pcat" : fc.dataset.ostatus !== undefined ? "ostatus" : "okind";
    f[key] = fc.dataset[key]; $$(`[data-${key}]`, view).forEach(b => b.setAttribute("aria-pressed", b === fc)); VIEWS[tab].fill(true); return;
  }
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (act === "add") return openSheet(b.dataset.kind, null);
  if (act === "notify"){ try { const r = await Notification.requestPermission(); toast(r === "granted" ? "Desktop alerts on" : "Desktop alerts not allowed"); } catch {} switchTab("account"); return; }
  if (act === "starter"){ b.disabled = true; b.textContent = "Adding…"; try { await addStarter(b.dataset.kind); toast("Samples added"); } catch { toast("Couldn’t add the samples. Try again."); b.disabled = false; } return; }
  if (act === "toggle-done" || act === "order-del" || act === "order-confirm"){
    const id = b.closest(".ocard").dataset.id, ref = fs.collection("orders").doc(id), o = orders.find(x => x.id === id);
    if (act === "toggle-done"){ try { await ref.update({ status: o.status === "done" ? "new" : "done" }); toast(o.status === "done" ? "Marked as new" : "Marked as done"); } catch { toast("Couldn’t update. Try again."); } }
    else if (act === "order-del"){ b.dataset.act = "order-confirm"; b.textContent = "Confirm delete"; b.classList.add("btn-red"); setTimeout(() => { if (b.isConnected && b.dataset.act === "order-confirm"){ b.dataset.act = "order-del"; b.textContent = "Delete"; b.classList.remove("btn-red"); } }, 4000); }
    else { b.disabled = true; try { await ref.delete(); toast("Deleted"); } catch { toast("Couldn’t delete. Try again."); b.disabled = false; } }
    return;
  }
  const row = b.closest(".arow"), kind = b.closest(".alist")?.dataset.kind; if (!row || !kind) return;
  const K = KINDS[kind], list = K.list();
  const idx = list.findIndex(x => x.id === row.dataset.id), item = list[idx]; if (!item) return;
  if (act === "edit") openSheet(kind, item);
  else if (act === "links"){ openSheet(kind, item); setTimeout(() => jumpTo("soc-instagram"), 150); }
  else if (act === "feature"){
    b.classList.toggle("on"); 
    try { await fs.collection("projects").doc(item.id).update({ featured: !item.featured }); toast(item.featured ? "Removed from featured" : "★ Featured on the home page"); }
    catch { toast("Couldn’t update. Try again."); VIEWS[tab].fill(false); }
  }
  else if (act === "up" || act === "down"){
    $$(".ibtn", view).forEach(x => x.disabled = true);
    try { await reorder(K.col, list, idx, act === "up" ? idx - 1 : idx + 1); } catch { toast("Couldn’t reorder. Try again."); VIEWS[tab].fill(false); }
  }
  else if (act === "delete"){
    row.querySelector(".aact").innerHTML = `<span class="confirm">Delete this ${K.one}?</span><button class="btn btn-red sm" type="button" data-act="confirm-del">Delete</button><button class="btn btn-ghost sm" type="button" data-act="cancel-del">Cancel</button>`;
    $("[data-act=cancel-del]", row).focus();
  }
  else if (act === "cancel-del") VIEWS[tab].fill(false);
  else if (act === "confirm-del"){
    row.classList.add("leaving");
    setTimeout(() => softDelete(kind, item), reduceMotion ? 0 : 280);
  }
});

/* ---------- drag the ⋮⋮ handle to reorder ---------- */
let drag = null;
view.addEventListener("pointerdown", e => { const h = e.target.closest(".drag"); if (h) h.closest(".arow").draggable = true; });
view.addEventListener("dragstart", e => {
  const row = e.target.closest(".arow"); if (!row || !row.draggable) return;
  const kind = row.closest(".alist").dataset.kind;
  drag = { kind, id: row.dataset.id, row };
  row.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", row.dataset.id);
});
view.addEventListener("dragover", e => {
  if (!drag) return;
  const over = e.target.closest(".arow"); if (!over || over === drag.row) return;
  e.preventDefault();
  const r = over.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
  $$(".arow.drop-before, .arow.drop-after", view).forEach(x => x.classList.remove("drop-before", "drop-after"));
  over.classList.add(after ? "drop-after" : "drop-before");
});
view.addEventListener("drop", async e => {
  if (!drag) return; e.preventDefault();
  const over = $(".arow.drop-before, .arow.drop-after", view); if (!over) return;
  const K = KINDS[drag.kind], list = K.list();
  const from = list.findIndex(x => x.id === drag.id);
  let to = list.findIndex(x => x.id === over.dataset.id) + (over.classList.contains("drop-after") ? 1 : 0);
  if (to > from) to--;
  try { await reorder(K.col, list, from, to); toast("Order saved"); } catch { toast("Couldn’t reorder. Try again."); }
});
view.addEventListener("dragend", () => {
  if (drag){ drag.row.classList.remove("dragging"); drag.row.draggable = false; }
  $$(".arow.drop-before, .arow.drop-after", view).forEach(x => x.classList.remove("drop-before", "drop-after"));
  drag = null;
});

view.addEventListener("submit", async e => {
  if (e.target.id !== "pw-form") return;
  e.preventDefault();
  const err = $("#pw-err"), cur = $("#pw-cur").value, pw = $("#pw-new").value;
  if (!cur || !pw){ err.textContent = "Fill in every field."; return; }
  if (pw.length < 8){ err.textContent = "Use at least 8 characters for the new password."; return; }
  if (pw !== $("#pw-new2").value){ err.textContent = "The new passwords don’t match."; return; }
  const btn = $("button[type=submit]", e.target); btn.disabled = true;
  try {
    const u = auth.currentUser;
    await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, cur));
    await u.updatePassword(pw);
    e.target.reset(); err.textContent = ""; toast("Password updated");
  } catch (x) {
    err.textContent = x.code === "auth/invalid-credential" || x.code === "auth/wrong-password" ? "Your current password isn’t right." : x.code === "auth/weak-password" ? "Choose a stronger password." : "Couldn’t update the password. Try again.";
  } finally { btn.disabled = false; }
});

/* ---------- keyboard shortcuts: / search · N new · Ctrl+S save · Esc close ---------- */
addEventListener("keydown", e => {
  if (appEl.hidden) return;
  const typing = e.target.matches("input, textarea, select, [contenteditable]");
  if (sheetState){
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){ e.preventDefault(); sheetForm.requestSubmit(); }
    else if (e.key === "Escape"){ e.preventDefault(); closeSheet(); }
    return;
  }
  if (typing) return;
  if (e.key === "/"){ const s = $("input[type=search]", view); if (s){ e.preventDefault(); s.focus(); } }
  else if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey){
    const kind = { projects: "project", team: "member", clients: "client" }[tab]; if (kind){ e.preventDefault(); openSheet(kind, null); }
  }
});

/* ===================== Add / edit sheet ===================== */
/* Images are resized in the browser and saved with the project, so no paid file storage is needed. */
function compressImage(file, max){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = .85, out = c.toDataURL("image/jpeg", q);
      while (out.length > 700000 && q > .4){ q -= .1; out = c.toDataURL("image/jpeg", q); }
      out.length > 900000 ? rej(new Error("too_big")) : res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad_image")); };
    img.src = url;
  });
}
const SOC_HINT = { instagram: "instagram.com/name or @name", facebook: "facebook.com/name", linkedin: "linkedin.com/in/name", youtube: "youtube.com/@channel", behance: "behance.net/name", website: "yourname.com", email: "name@example.com", whatsapp: "01XXXXXXXXX" };
const xpRow = x => `<div class="xp-row"><input type="text" data-x="title" maxlength="80" placeholder="Role, e.g. Senior editor" value="${esc(x.title || "")}" aria-label="Role"><input type="text" data-x="place" maxlength="80" placeholder="Company or project" value="${esc(x.place || "")}" aria-label="Company or project"><input type="text" data-x="period" maxlength="40" placeholder="2021 – now" value="${esc(x.period || "")}" aria-label="Period"><button type="button" class="ibtn" data-xdel aria-label="Remove this experience">×</button></div>`;
// turns what the admin typed into a proper link (handles @names and missing https://)
function normSocial(k, v){
  v = v.trim(); if (!v) return "";
  if (k === "email" || k === "whatsapp") return v;
  if (v.startsWith("@")){
    const h = v.slice(1), base = { instagram: "instagram.com/", youtube: "youtube.com/@", behance: "behance.net/", facebook: "facebook.com/", linkedin: "linkedin.com/in/" }[k];
    return base ? "https://" + base + h : "";
  }
  if (/^http:\/\//i.test(v)) v = v.replace(/^http:/i, "https:");
  if (!/^https:\/\//i.test(v)) v = "https://" + v;
  try { return new URL(v).href; } catch { return ""; }
}

/* Logos keep their transparent background (saved as WebP/PNG, not JPEG). */
function compressLogo(file){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 600 / Math.max(img.naturalWidth || 600, img.naturalHeight || 600));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round((img.naturalWidth || 600) * s)); c.height = Math.max(1, Math.round((img.naturalHeight || 300) * s));
      const cx = c.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      // crop away empty transparent borders so the logo fills its box on the site
      let cut = c;
      try {
        const d = cx.getImageData(0, 0, c.width, c.height).data; let t = c.height, l = c.width, b = -1, r = -1;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 12){ if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
        if (b >= 0 && (t > 1 || l > 1 || b < c.height - 2 || r < c.width - 2)){ cut = document.createElement("canvas"); cut.width = r - l + 1; cut.height = b - t + 1; cut.getContext("2d").drawImage(c, l, t, cut.width, cut.height, 0, 0, cut.width, cut.height); }
      } catch {}
      let out = cut.toDataURL("image/webp", .9);
      if (!out.startsWith("data:image/webp")) out = cut.toDataURL("image/png");
      out.length > 600000 ? rej(new Error("too_big")) : res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad_image")); };
    img.src = url;
  });
}
const MAX_GALLERY = 12;
function galleryThumb(g){
  if (g.type === "image") return `<img src="${esc(g.src)}" alt="">`;
  const yt = youtubeId(g.url);
  return yt ? `<img src="https://i.ytimg.com/vi/${yt}/default.jpg" alt=""><span class="gv">${ICON.play}</span>` : `<span class="gv solo">${ICON.play}</span>`;
}
function renderGallery(){
  const host = $("#glist"); if (!host || !sheetState) return;
  const G = sheetState.gallery;
  if (sheetState.galleryLoading){ host.innerHTML = `<li class="gempty">Loading gallery…</li>`; return; }
  host.innerHTML = G.length ? G.map((g, i) => `<li class="gitem" draggable="true" data-gi="${i}">
      <span class="gthumb">${galleryThumb(g)}<span class="gnum">${i + 1}</span></span>
      <input type="text" data-gcap="${i}" maxlength="140" placeholder="${g.type === "video" ? "Video caption (optional)" : "Caption (optional)"}" value="${esc(g.caption || "")}" aria-label="Caption for item ${i + 1}">
      <span class="gact"><button type="button" class="ibtn" data-gmove="-1" aria-label="Move earlier"${i === 0 ? " disabled" : ""}>←</button><button type="button" class="ibtn" data-gmove="1" aria-label="Move later"${i === G.length - 1 ? " disabled" : ""}>→</button><button type="button" class="ibtn" data-gdel aria-label="Remove">×</button></span>
    </li>`).join("") : `<li class="gempty">No extra pictures or videos yet.</li>`;
  $("#g-count").textContent = `${G.length} / ${MAX_GALLERY}`;
}
async function addGalleryFiles(files){
  const msg = $("#g-msg"), G = sheetState.gallery;
  const imgs = [...files].filter(fl => fl.type.startsWith("image/"));
  if (!imgs.length){ msg.textContent = "Choose image files (JPG, PNG or WebP)."; return; }
  let added = 0;
  for (const fl of imgs){
    if (G.length >= MAX_GALLERY){ msg.textContent = `The gallery holds up to ${MAX_GALLERY} items.`; break; }
    msg.textContent = `Preparing ${added + 1} of ${imgs.length}…`;
    try { G.push({ type: "image", src: await compressImage(fl, 1600), caption: "" }); added++; renderGallery(); updateLive(); }
    catch { msg.textContent = `${fl.name} couldn’t be added.`; }
  }
  if (added){ msg.textContent = `${added} picture${added === 1 ? "" : "s"} added. Save to publish.`; sheetState.dirty = true; }
}
function transPicker(cur){
  return `<div class="tpick" role="radiogroup" aria-label="Slideshow transition">${TRANSITIONS.map(([v, label]) => `
    <label class="tp"><input type="radio" name="s-trans" value="${v}"${cur === v ? " checked" : ""}><span class="tp-demo" data-t="${v}"><i></i><i></i></span><span class="tp-l">${label}</span></label>`).join("")}</div>`;
}

function openSheet(kind, item){
  const isP = kind === "project", isM = kind === "member", isC = kind === "client";
  const K = KINDS[kind];
  sheetState = { kind, item, image: item ? (isP ? item.image : isM ? item.photo : item.logo) : null, seed: item?.seed || Math.floor(Math.random() * 1000) + 1,
    pal: item?.pal || PALETTES[Math.floor(Math.random() * PALETTES.length)], gallery: [], removed: [], galleryLoading: !!(isP && item && item.mediaCount), dirty: false };
  const v = (k, d = "") => esc(item ? item[k] ?? d : d);
  const title = (item ? "Edit " : "Add ") + K.one;
  sheetForm.innerHTML = `<div class="sheet-head"><h3 class="display">${title[0].toUpperCase() + title.slice(1)}</h3><button class="close" type="button" data-sheet-close aria-label="Close">×</button></div>
  <div class="preview" aria-live="polite"><div class="pv-m${isM ? " round" : isC ? " logo" : ""}" id="pv-m"></div><div><b id="pv-title"></b><span id="pv-sub"></span></div></div>
  ${isM ? `<div class="sheet-jump" role="group" aria-label="Jump to section"><button type="button" data-jump="s-name">Card</button><button type="button" data-jump="s-about">Profile</button><button type="button" data-jump="xp-list">Experience</button><button type="button" data-jump="soc-instagram">Social links</button></div>` : ""}
  ${isP ? `<div class="sheet-jump" role="group" aria-label="Jump to section"><button type="button" data-jump="s-title">Basics</button><button type="button" data-jump="s-services">Details</button><button type="button" data-jump="gdrop">Gallery</button><button type="button" data-jump="tpick-anchor">Transition</button></div>` : ""}
  ${isP ? `
    <div class="field"><label for="s-title">Project title</label><input type="text" id="s-title" maxlength="90" value="${v("title")}"></div>
    <div class="row2">
      <div class="field"><label for="s-cat">Main service</label><select id="s-cat">${SERVICES.map(s => `<option${item && item.cat === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field"><label for="s-year">Year <small>(optional)</small></label><input type="text" id="s-year" inputmode="numeric" maxlength="4" value="${v("year", String(new Date().getFullYear()))}"></div>
    </div>
    <label class="switch"><input type="checkbox" id="s-featured"${item && item.featured ? " checked" : ""}><span class="sw"></span><span><b>★ Feature on the home page</b><small>Featured projects come first in Selected work and the moving reels.</small></span></label>
    <div class="field"><label for="s-desc">Description</label><textarea id="s-desc" maxlength="1500" placeholder="What was the brief, what did you make, and how did it turn out?">${v("desc")}</textarea><span class="counter" data-for="s-desc"></span></div>
    <p class="sheet-sec">Project details <small>shown in the info panel when someone opens the project</small></p>
    <div class="field"><label for="s-client">Client <small>(optional)</small></label><input type="text" id="s-client" maxlength="80" list="client-list" value="${v("client")}"><datalist id="client-list">${clients.map(c => `<option>${esc(c.name)}</option>`).join("")}</datalist></div>
    <div class="field"><label for="s-services">Services provided <small>(separate with commas)</small></label><input type="text" id="s-services" maxlength="400" placeholder="Logo design, Packaging, Social kit" value="${esc(item ? item.services.join(", ") : "")}"><ul class="chip-preview" id="svc-preview"></ul></div>
    <div class="row2">
      <div class="field"><label for="s-duration">Duration <small>(optional)</small></label><input type="text" id="s-duration" maxlength="60" placeholder="e.g. 3 weeks" value="${v("duration")}"></div>
      <div class="field"><label for="s-budget">Budget <small>(optional, shown publicly)</small></label><input type="text" id="s-budget" maxlength="60" placeholder="e.g. 50,000 BDT" value="${v("budget")}"></div>
    </div>
    <div class="field"><label for="s-did">What we delivered <small>(one item per line, optional)</small></label><textarea id="s-did" style="min-height:100px" placeholder="Logo and identity system&#10;Packaging for 6 blends">${esc(item ? item.did.join("\n") : "")}</textarea></div>
    <p class="sheet-sec">Pictures and video</p>
  ` : isM ? `
    <div class="field"><label for="s-name">Full name</label><input type="text" id="s-name" autocomplete="off" maxlength="80" value="${v("name")}"></div>
    <div class="row2">
      <div class="field"><label for="s-role">Role</label><input type="text" id="s-role" list="role-list" autocomplete="off" maxlength="60" value="${v("role")}">
        <datalist id="role-list"><option>CEO</option><option>COO</option><option>Designer</option><option>Editor</option><option>Coder</option></datalist></div>
      <div class="field"><label for="s-years">Years of experience <small>(optional)</small></label><input type="number" id="s-years" min="0" max="70" inputmode="numeric" value="${item && item.years ? item.years : ""}"></div>
    </div>
    <div class="field"><label for="s-bio">Short bio <small>(shown on the card)</small></label><textarea id="s-bio" style="min-height:80px" maxlength="240" placeholder="One sentence about what they do.">${v("bio")}</textarea><span class="counter" data-for="s-bio"></span></div>
    <p class="sheet-sec">Profile <small>shown when someone clicks this member</small></p>
    <div class="field"><label for="s-about">About <small>(their story, background and what they love doing)</small></label><textarea id="s-about" style="min-height:140px" maxlength="2000" placeholder="A few sentences in their own voice.">${v("about")}</textarea><span class="counter" data-for="s-about"></span></div>
    <div class="field"><label for="s-skills">Skills <small>(separate with commas)</small></label><input type="text" id="s-skills" maxlength="400" placeholder="Brand identity, Typography, Motion graphics" value="${esc(item ? item.skills.join(", ") : "")}"></div>
    <div class="field"><span class="flabel">Experience <small style="color:var(--muted);font-weight:400">(newest first)</small></span>
      <div class="xp-list" id="xp-list">${(item && item.experience.length ? item.experience : [{}]).map(xpRow).join("")}</div>
      <button type="button" class="btn btn-ghost sm" id="xp-add" style="justify-self:start">+ Add experience</button></div>
    <p class="sheet-sec">Social links <small>leave blank to hide</small></p>
    <div class="soc-grid">${SOCIALS.map(([k, label]) => `<div class="field"><label for="soc-${k}">${label}</label><input type="${k === "email" ? "email" : "text"}" id="soc-${k}" data-soc="${k}" autocomplete="off" placeholder="${SOC_HINT[k]}" value="${esc(item && item.socials[k] ? (k === "whatsapp" ? "+" + item.socials[k] : item.socials[k]) : "")}"></div>`).join("")}</div>
  ` : `
    <div class="field"><label for="s-name">Client name</label><input type="text" id="s-name" maxlength="80" value="${v("name")}"></div>
    <div class="field"><label for="s-url">Website <small>(optional: the logo links here)</small></label><input type="text" id="s-url" inputmode="url" maxlength="300" placeholder="clientsite.com" value="${esc(item && item.url ? item.url : "")}"></div>
  `}
  <div class="field"><span class="flabel">${isP ? "Cover image" : isM ? "Photo" : "Logo"} <small style="color:var(--muted);font-weight:400">(${isC ? "PNG with a transparent background works best" : "optional"})</small></span>
    <div class="media-pick"><div class="media-prev${isC ? " logo" : ""}" id="media-prev"></div>
      <div class="media-btns"><label class="btn btn-ghost sm file-btn">Choose image<input type="file" id="media-file" accept="image/*"></label>
      <button type="button" class="btn btn-ghost sm" id="media-remove">Remove</button><p class="hint-s" id="media-msg">${isC ? "Logos are resized and keep their transparency." : "JPG, PNG or WebP. Large photos are resized automatically."}</p></div>
    </div></div>
  ${isP ? `
    <div class="field"><label for="s-video">Main video <small>(optional: YouTube or a direct .mp4 link)</small></label><input type="text" id="s-video" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${v("video")}"><small id="video-hint" style="color:var(--muted)"></small></div>
    <div class="field"><span class="flabel">Gallery <small style="color:var(--muted);font-weight:400">(extra pictures and videos for the project slideshow · <span id="g-count"></span>)</small></span>
      <label class="gdrop" id="gdrop"><input type="file" id="g-files" accept="image/*" multiple><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg><span><b>Drop pictures here</b> or click to choose. You can pick several at once.</span></label>
      <div class="gvideo"><input type="text" id="g-video" inputmode="url" placeholder="Add a video: paste a YouTube or .mp4 link"><button type="button" class="btn btn-ghost sm" id="g-video-add">Add video</button></div>
      <ul class="glist" id="glist"></ul>
      <p class="hint-s" id="g-msg">Drag items to change their order. The cover image always shows first.</p>
    </div>
    <div class="field" id="tpick-anchor"><span class="flabel">Slideshow transition</span>${transPicker(item ? item.transition : "fade")}</div>
  ` : ""}
  <p class="err-msg" id="sheet-err" aria-live="polite"></p>
  <div class="form-foot sheet-foot"><button class="btn btn-red" type="submit">Save ${K.one}</button><button class="btn btn-ghost" type="button" data-sheet-close>Cancel</button><span class="kbd-hint">Ctrl + S to save</span></div>`;
  updatePreview(); updateLive(); if (isP) renderGallery();
  sheet.hidden = false; document.body.style.overflow = "hidden";
  setTimeout(() => $("input[type=text]", sheetForm).focus(), 60);
  if (sheetState.galleryLoading){
    const st = sheetState;
    fs.collection("projects").doc(item.id).collection("media").orderBy("order").get().then(s => {
      if (sheetState !== st) return;
      st.gallery = s.docs.map(d => { const m = normMedia(d.id, d.data()); return { id: d.id, type: m.type, src: m.src, url: m.url, caption: m.caption, _cap0: m.caption, order: m.order }; }).filter(g => g.src || g.url);
      st.galleryLoading = false; renderGallery();
    }).catch(() => { st.galleryLoading = false; renderGallery(); $("#g-msg").textContent = "The gallery couldn’t load. Close and try again."; });
  }
}
function draft(){
  const val = id => ($("#" + id)?.value || "").trim(), k = sheetState.kind;
  if (k === "project") return normProject("draft", { title: val("s-title") || "Project title", cat: val("s-cat"), year: val("s-year"), client: val("s-client"), video: val("s-video"), image: sheetState.image || (sheetState.gallery.find(g => g.type === "image") || {}).src, seed: sheetState.seed, pal: sheetState.pal });
  if (k === "member") return normMember("draft", { name: val("s-name") || "Full name", role: val("s-role") || "Role", photo: sheetState.image });
  return normClient("draft", { name: val("s-name") || "Client name", logo: sheetState.image, url: normSocial("website", val("s-url")) });
}
function updateLive(){
  if (!sheetState) return;
  const d = draft(), k = sheetState.kind;
  $("#pv-m").innerHTML = k === "project" ? media(d, 240, 180)
    : k === "member" ? (d.photo ? `<img src="${esc(d.photo)}" alt="">` : `<svg viewBox="0 0 90 120"><rect width="90" height="120" fill="var(--raise)"/><text x="45" y="70" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="800" font-size="30" fill="var(--text)">${esc(initials(d.name))}</text></svg>`)
    : (d.logo ? `<img src="${esc(d.logo)}" alt="">` : `<span class="logo-word">${esc(d.name)}</span>`);
  $("#pv-title").textContent = k === "project" ? d.title : d.name;
  $("#pv-sub").textContent = k === "project" ? [d.cat, d.client, d.year].filter(Boolean).join(" · ") : k === "member" ? d.role : (d.url ? d.url.replace(/^https:\/\//, "") : "No website link");
  $$(".counter", sheetForm).forEach(c => { const el = $("#" + c.dataset.for); c.textContent = `${el.value.length} / ${el.maxLength}`; });
  const vh = $("#video-hint");
  if (vh){ const u = $("#s-video").value.trim(); vh.textContent = !u ? "" : youtubeId(u) ? "YouTube video found. Its thumbnail is used if there’s no cover image." : isDirectVideo(u) ? "Direct video found. It plays as a silent preview on the site." : /^https:\/\//.test(u) ? "Link saved, but it isn’t YouTube or .mp4, so it may not play." : "Links must start with https://"; }
  const sp = $("#svc-preview");
  if (sp) sp.innerHTML = $("#s-services").value.split(",").map(x => x.trim()).filter(Boolean).slice(0, 12).map(x => `<li>${esc(x)}</li>`).join("");
}
function updatePreview(){
  const img = sheetState.image, k = sheetState.kind;
  $("#media-prev").innerHTML = img ? `<img src="${esc(img)}" alt="">` : `<span>${k === "project" ? "No cover. The first gallery picture is used, or generated artwork." : k === "member" ? "No photo. The site shows initials." : "No logo. The name is shown in bold type."}</span>`;
  $("#media-remove").hidden = !img;
}
function closeSheet(force){
  if (!sheetState) return;
  if (!force && sheetState.dirty && !confirm("Close without saving your changes?")) return;
  sheetState = null; sheet.hidden = true; document.body.style.overflow = "";
}
sheetForm.addEventListener("input", e => {
  if (!sheetState) return;
  sheetState.dirty = true;
  const cap = e.target.dataset.gcap; if (cap !== undefined) sheetState.gallery[Number(cap)].caption = e.target.value;
  updateLive();
});
function jumpTo(id){
  const el = $("#" + id); if (!el) return;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  const fcs = el.matches("input,textarea") ? el : $("input:not([type=file]), textarea", el); if (fcs) setTimeout(() => fcs.focus({ preventScroll: true }), reduceMotion ? 0 : 400);
}
sheet.addEventListener("click", e => {
  if (e.target === sheet || e.target.closest("[data-sheet-close]")) return closeSheet();
  const j = e.target.closest("[data-jump]"); if (j) jumpTo(j.dataset.jump);
  if (e.target.closest("#xp-add")){ const list = $("#xp-list"); if (list.children.length < 10){ list.insertAdjacentHTML("beforeend", xpRow({})); $("input", list.lastElementChild).focus(); sheetState.dirty = true; } }
  const del = e.target.closest("[data-xdel]");
  if (del){ const row = del.closest(".xp-row"), list = $("#xp-list"); if (list.children.length > 1) row.remove(); else $$("input", row).forEach(i => i.value = ""); sheetState.dirty = true; }
  if (e.target.id === "media-remove"){ sheetState.image = null; sheetState.dirty = true; updatePreview(); updateLive(); }
  // gallery
  if (e.target.closest("#g-video-add")){
    const inp = $("#g-video"), u = normSocial("website", inp.value.trim());
    if (!u || !(youtubeId(u) || isDirectVideo(u))){ $("#g-msg").textContent = "Paste a YouTube link or a direct link to an .mp4 or .webm file."; return; }
    if (sheetState.gallery.length >= MAX_GALLERY){ $("#g-msg").textContent = `The gallery holds up to ${MAX_GALLERY} items.`; return; }
    sheetState.gallery.push({ type: "video", url: u, caption: "" }); inp.value = ""; sheetState.dirty = true; renderGallery();
    $("#g-msg").textContent = "Video added. Save to publish.";
  }
  const gi = e.target.closest(".gitem");
  if (gi){
    const i = Number(gi.dataset.gi), G = sheetState.gallery;
    const mv = e.target.closest("[data-gmove]");
    if (mv){ const j = i + Number(mv.dataset.gmove); if (j >= 0 && j < G.length){ [G[i], G[j]] = [G[j], G[i]]; sheetState.dirty = true; renderGallery(); } }
    if (e.target.closest("[data-gdel]")){ const [g] = G.splice(i, 1); if (g.id) sheetState.removed.push(g.id); sheetState.dirty = true; renderGallery(); updateLive(); }
  }
});
// drag & drop: files onto the drop zone, and reordering gallery items
let gdrag = null;
sheet.addEventListener("dragstart", e => { const it = e.target.closest(".gitem"); if (it){ gdrag = Number(it.dataset.gi); it.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; } });
sheet.addEventListener("dragover", e => {
  const zone = e.target.closest("#gdrop"), it = e.target.closest(".gitem");
  if (zone && e.dataTransfer.types.includes("Files")){ e.preventDefault(); zone.classList.add("over"); }
  else if (it && gdrag !== null){ e.preventDefault(); $$(".gitem.over", sheet).forEach(x => x.classList.remove("over")); it.classList.add("over"); }
});
sheet.addEventListener("dragleave", e => { const zone = e.target.closest("#gdrop"); if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove("over"); });
sheet.addEventListener("drop", e => {
  const zone = e.target.closest("#gdrop"), it = e.target.closest(".gitem");
  if (zone && e.dataTransfer.files.length){ e.preventDefault(); zone.classList.remove("over"); addGalleryFiles(e.dataTransfer.files); }
  else if (it && gdrag !== null){
    e.preventDefault(); const to = Number(it.dataset.gi), G = sheetState.gallery;
    const [m] = G.splice(gdrag, 1); G.splice(to, 0, m); sheetState.dirty = true; renderGallery();
  }
});
sheet.addEventListener("dragend", () => { gdrag = null; $$(".gitem.over, .gitem.dragging", sheet).forEach(x => x.classList.remove("over", "dragging")); });
sheet.addEventListener("change", async e => {
  if (e.target.id === "s-cat" || e.target.name === "s-trans" || e.target.id === "s-featured"){ sheetState.dirty = true; return updateLive(); }
  if (e.target.id === "g-files"){ const fl = [...e.target.files]; e.target.value = ""; return addGalleryFiles(fl); }
  if (e.target.id !== "media-file") return;
  const file = e.target.files[0], msg = $("#media-msg"); e.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")){ msg.textContent = "Choose an image file (JPG, PNG or WebP)."; return; }
  msg.textContent = "Preparing image…";
  try {
    sheetState.image = sheetState.kind === "client" ? await compressLogo(file) : await compressImage(file, sheetState.kind === "project" ? 1400 : 800);
    sheetState.dirty = true; updatePreview(); updateLive();
    $("#media-msg").textContent = `Ready (${Math.round(sheetState.image.length * 0.75 / 1024)} KB). Save to publish it.`;
  } catch (x) { msg.textContent = x.message === "too_big" ? "That image is too detailed to store. Try a smaller or simpler one." : "That file couldn’t be read as an image."; }
});

sheetForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!sheetState) return;
  const st = sheetState, { kind, item } = st, K = KINDS[kind], err = $("#sheet-err");
  const val = id => ($("#" + id)?.value || "").trim();
  if (st.galleryLoading){ err.textContent = "Wait a moment for the gallery to finish loading."; return; }
  let data;
  if (kind === "project"){
    if (!val("s-title") || !val("s-desc")){ err.textContent = "Add a project title and a description."; (val("s-title") ? $("#s-desc") : $("#s-title")).focus(); return; }
    const video = val("s-video");
    if (video && !/^https:\/\//.test(video)){ err.textContent = "The main video link must start with https://"; $("#s-video").focus(); return; }
    const firstImg = st.gallery.find(g => g.type === "image");
    data = { title: val("s-title"), cat: val("s-cat"), year: val("s-year"), client: val("s-client"), desc: val("s-desc"),
      did: val("s-did").split("\n").map(s => s.trim()).filter(Boolean), video, image: st.image || (firstImg ? firstImg.src : null),
      services: val("s-services").split(",").map(x => x.trim()).filter(Boolean).slice(0, 12),
      duration: val("s-duration"), budget: val("s-budget"), featured: $("#s-featured").checked,
      transition: ($("input[name=s-trans]:checked", sheetForm) || {}).value || "fade", mediaCount: st.gallery.length };
  } else if (kind === "member"){
    if (!val("s-name") || !val("s-role")){ err.textContent = "Add a name and a role."; (val("s-name") ? $("#s-role") : $("#s-name")).focus(); return; }
    const socials = {}, bad = [];
    $$("[data-soc]", sheetForm).forEach(inp => { const k = inp.dataset.soc, raw = inp.value.trim(); if (!raw) return; const v = normSocial(k, raw); const ok = cleanSocials({ [k]: v })[k]; ok ? socials[k] = ok : bad.push(SOCIALS.find(x => x[0] === k)[1]); });
    if (bad.length){ err.textContent = `Check these links: ${bad.join(", ")}.`; return; }
    data = { name: val("s-name"), role: val("s-role"), bio: val("s-bio"), photo: st.image || null,
      about: val("s-about"), years: Number(val("s-years")) || 0,
      skills: val("s-skills").split(",").map(x => x.trim()).filter(Boolean).slice(0, 16),
      experience: $$(".xp-row", sheetForm).map(r => ({ title: $("[data-x=title]", r).value.trim(), place: $("[data-x=place]", r).value.trim(), period: $("[data-x=period]", r).value.trim() })).filter(x => x.title || x.place),
      socials };
  } else {
    if (!val("s-name")){ err.textContent = "Add the client’s name."; $("#s-name").focus(); return; }
    const url = val("s-url") ? normSocial("website", val("s-url")) : "";
    if (val("s-url") && !url){ err.textContent = "That website link doesn’t look right."; $("#s-url").focus(); return; }
    data = { name: val("s-name"), url, logo: st.image || null };
  }
  const list = K.list();
  const btn = $("button[type=submit]", sheetForm), label = btn.textContent; btn.disabled = true; btn.textContent = "Saving…";
  try {
    const ref = item ? fs.collection(K.col).doc(item.id) : fs.collection(K.col).doc();
    if (item) await ref.update(data);
    else {
      data.order = list.length ? Math.max(...list.map(x => x.order)) + 1 : 0;
      data.createdAt = new Date().toISOString();
      if (kind === "project"){ data.seed = st.seed; data.pal = st.pal; }
      await ref.set(data);
    }
    if (kind === "project"){
      const mcol = ref.collection("media");
      for (const id of st.removed) await mcol.doc(id).delete();
      for (let i = 0; i < st.gallery.length; i++){
        const g = st.gallery[i];
        btn.textContent = `Saving gallery ${i + 1}/${st.gallery.length}…`;
        if (g.id){ if (g.order !== i || g.caption !== g._cap0) await mcol.doc(g.id).update({ order: i, caption: g.caption || "" }); }
        else await mcol.add(g.type === "image" ? { type: "image", src: g.src, caption: g.caption || "", order: i } : { type: "video", url: g.url, caption: g.caption || "", order: i });
      }
    }
    closeSheet(true); toast(item ? "Changes saved" : `${K.one[0].toUpperCase() + K.one.slice(1)} added`);
  } catch (x) {
    err.textContent = x.code === "permission-denied" ? "You don’t have permission to save this. Check firestore.rules (it needs the gallery and clients sections) and your admin email." : "Couldn’t save. Check your connection and try again.";
    btn.disabled = false; btn.textContent = label;
  }
});
})();
