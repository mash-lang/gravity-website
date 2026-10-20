/* Gravity — admin dashboard (admin.html).
   Sign-in and permissions are handled by Firebase: only the email(s) listed in firestore.rules
   can change projects and team members or read orders. Hiding this page is just tidiness;
   the rules are what actually protect your data. */
(async function(){
const setupEl = $("#admin-setup"), loginEl = $("#admin-login"), appEl = $("#admin-app"), sheet = $("#admin-sheet"), sheetForm = $("#sheet-form");
let projects = [], team = [], orders = [], tab = "projects", sheetState = null, pendingErr = "", unsubs = [];
let toastT = 0;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

if (!Store.enabled){ setupEl.hidden = false; return; }

let fb;
try { fb = await Store.ready(true); }
catch (e) { setupEl.hidden = false; $("h2", setupEl).textContent = "Firebase couldn’t load"; $(".admin-sub", setupEl).textContent = "Check your internet connection, then reload this page."; return; }
const auth = fb.auth(), fs = fb.firestore();
// Signed-in state lasts only for this browser tab session — safer on shared computers.
try { await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION); } catch {}

/* ===================== Sign in ===================== */
function showLogin(){
  appEl.hidden = true; loginEl.hidden = false;
  $("#login-err").textContent = pendingErr; pendingErr = "";
  setTimeout(() => $("#ad-email").focus(), 50);
}
const authMessage = code => ({
  "auth/invalid-credential": "That email and password don’t match.",
  "auth/wrong-password": "That email and password don’t match.",
  "auth/user-not-found": "That email and password don’t match.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes, then try again.",
  "auth/network-request-failed": "Couldn’t reach Firebase. Check your connection and try again.",
  "auth/user-disabled": "This account has been turned off in Firebase."
  //"auth/api-key-not-valid.-please-pass-a-valid-api-key.": "The Firebase API key in js/config.js isn’t valid. Check it, then hard-refresh this page.",
}[code] || "Sign-in didn’t work. Try again.");

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#login-err"), email = $("#ad-email").value.trim(), pw = $("#ad-pw").value;
  if (!email || !pw){ err.textContent = "Enter your admin email and password."; return; }
  const btn = $("#login-btn"); btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
  try { await auth.signInWithEmailAndPassword(email, pw); }
  catch (x) { err.textContent = authMessage(x.code); }
  finally { btn.disabled = false; btn.textContent = "Sign in"; }
});
$("#forgot").addEventListener("click", async () => {
  const err = $("#login-err"), email = $("#ad-email").value.trim();
  if (!email){ err.textContent = "Enter your admin email first, then choose Forgot password."; $("#ad-email").focus(); return; }
  try { await auth.sendPasswordResetEmail(email); } catch {}
  err.textContent = "If that email has an account, a reset link is on its way. Check your inbox.";
});

auth.onAuthStateChanged(async user => {
  unsubs.forEach(u => u()); unsubs = [];
  if (!user){ showLogin(); return; }
  // Only admins can read orders, so this doubles as the admin check.
  try { await fs.collection("orders").limit(1).get(); }
  catch (x) {
    pendingErr = x.code === "permission-denied" ? "This account doesn’t have admin access. Add its email to firestore.rules." : "Couldn’t check admin access. Try again.";
    await auth.signOut(); return;
  }
  loginEl.hidden = true; appEl.hidden = false; $("#login-form").reset();
  listen(); render();
});
$("#admin-signout").addEventListener("click", async () => { await auth.signOut(); toast("Signed out"); });

/* ===================== Live data ===================== */
function listen(){
  unsubs.push(fs.collection("projects").orderBy("order").onSnapshot(s => {
    projects = s.docs.map(d => normProject(d.id, d.data())); if (tab === "projects") render();
  }, e => console.warn(e)));
  unsubs.push(fs.collection("team").orderBy("order").onSnapshot(s => {
    team = s.docs.map(d => normMember(d.id, d.data())); if (tab === "team") render();
  }, e => console.warn(e)));
  unsubs.push(fs.collection("orders").orderBy("createdAt", "desc").onSnapshot(s => {
    orders = s.docs.map(d => ({ id: d.id, ...d.data() }));
    const n = orders.filter(o => o.status !== "done").length, c = $("#new-count");
    c.hidden = !n; c.textContent = n;
    if (tab === "orders") render();
  }, e => console.warn(e)));
}

/* ===================== Views ===================== */
$$(".admin-tabs button").forEach(b => b.addEventListener("click", () => { tab = b.dataset.atab; render(); }));
function render(){
  $$(".admin-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.atab === tab));
  const v = $("#admin-view");
  if (tab === "projects") v.innerHTML = listView("project", projects);
  else if (tab === "team") v.innerHTML = listView("member", team);
  else if (tab === "orders") v.innerHTML = ordersView();
  else v.innerHTML = accountView();
}
function listView(kind, list){
  const isP = kind === "project";
  const rows = list.map((x, i) => `<li class="arow" data-id="${esc(x.id)}">
    <span class="athumb${isP ? "" : " round"}">${isP ? media(x, 160, 120) : (x.photo ? `<img src="${esc(x.photo)}" alt="">` : `<b>${esc(initials(x.name))}</b>`)}</span>
    <span class="ainfo"><b>${esc(isP ? x.title : x.name)}</b><span>${esc(isP ? [x.cat, x.year, x.video ? "has video" : ""].filter(Boolean).join(", ") : x.role)}</span></span>
    <span class="aact">
      <button class="ibtn" type="button" data-act="up"${i === 0 ? " disabled" : ""} aria-label="Move up">↑</button>
      <button class="ibtn" type="button" data-act="down"${i === list.length - 1 ? " disabled" : ""} aria-label="Move down">↓</button>
      <button class="btn btn-ghost sm" type="button" data-act="edit">Edit</button>
      <button class="btn btn-ghost sm danger" type="button" data-act="delete">Delete</button>
    </span>
  </li>`).join("");
  const n = list.length, noun = isP ? (n === 1 ? "project" : "projects") : (n === 1 ? "member" : "members");
  return `<div class="admin-head"><div><h2 class="display">${isP ? "Projects" : "Team members"}</h2><p>${n} ${noun} on the site, in the order shown. Changes go live as soon as you save.</p></div>
    <button class="btn btn-red" type="button" data-act="add" data-kind="${kind}">${isP ? "Add project" : "Add member"}</button></div>
    ${n ? `<ul class="alist" data-kind="${kind}">${rows}</ul>` : `<div class="aempty">
      <p>${isP ? "No projects yet. Add your first one, or start with the sample projects and edit them." : "No team members yet. Add someone, or start with the sample team and edit it."}</p>
      <button class="btn btn-ghost starter" type="button" data-act="starter" data-kind="${kind}">${isP ? "Add the 9 sample projects" : "Add the 5 sample members"}</button></div>`}`;
}
function ordersView(){
  const fmt = o => o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString() : "";
  const items = orders.map(o => `<div class="inbox-item${o.status === "done" ? " done" : ""}" data-id="${esc(o.id)}">
      <h4><span class="tag${o.status === "done" ? " done" : ""}">${o.status === "done" ? "Done" : (o.kind === "order" ? "New order" : "New message")}</span>${esc(o.kind === "order" ? `${o.service || ""}, ${o.package || ""}` : (o.subject || "No subject"))}</h4>
      <div class="when">${esc(o.ref)} · ${esc(fmt(o))} · ${esc(o.name)} · <a href="mailto:${esc(o.email)}?subject=${encodeURIComponent("Re: your Gravity " + (o.kind || "order") + " " + (o.ref || ""))}">${esc(o.email)}</a>${o.phone ? " · " + esc(o.phone) : ""}</div>
      <p>${esc(o.kind === "order" ? [o.details, o.deadline && "Deadline: " + o.deadline, o.budget && "Budget: " + o.budget, o.company && "Company: " + o.company].filter(Boolean).join("\n") : o.message)}</p>
      <div class="row-act">
        <button class="btn btn-ghost sm" type="button" data-act="toggle-done">${o.status === "done" ? "Mark as new" : "Mark as done"}</button>
        <button class="btn btn-ghost sm danger" type="button" data-act="order-del">Delete</button>
      </div>
    </div>`).join("");
  return `<div class="admin-head"><div><h2 class="display">Orders and messages</h2><p>Newest first. New ones appear here automatically.</p></div></div>
    ${orders.length ? `<div style="display:grid;gap:.75rem">${items}</div>` : `<div class="aempty">No orders or messages yet.</div>`}`;
}
function accountView(){
  return `<div class="admin-head"><div><h2 class="display">Account</h2><p>Signed in as ${esc(auth.currentUser?.email || "")}.</p></div></div>
    <form class="admin-card" id="pw-form" novalidate>
      <h3 style="margin:0">Change password</h3>
      <div class="field"><label for="pw-cur">Current password</label><input type="password" id="pw-cur" autocomplete="current-password"></div>
      <div class="field"><label for="pw-new">New password</label><input type="password" id="pw-new" autocomplete="new-password"></div>
      <div class="field"><label for="pw-new2">Repeat new password</label><input type="password" id="pw-new2" autocomplete="new-password"></div>
      <p class="err-msg" id="pw-err" aria-live="polite"></p>
      <div class="form-foot"><button class="btn btn-red" type="submit">Update password</button></div>
    </form>
    <p class="note">To add another admin, create their account in Firebase → Authentication, then add their email to the list in firestore.rules and publish the rules.</p>`;
}

/* ===================== Actions ===================== */
async function reorder(col, list, from, to){
  const arr = list.slice(); const [m] = arr.splice(from, 1); arr.splice(to, 0, m);
  const batch = fs.batch();
  arr.forEach((x, i) => { if (x.order !== i) batch.update(fs.collection(col).doc(x.id), { order: i }); });
  await batch.commit();
}
async function addStarter(kind){
  const batch = fs.batch(), now = new Date().toISOString();
  if (kind === "project") FALLBACK_PROJECTS.forEach((p, i) => {
    const { id, ...rest } = p; batch.set(fs.collection("projects").doc(id), { ...rest, image: null, video: "", order: i, createdAt: now });
  });
  else FALLBACK_TEAM.forEach((m, i) => batch.set(fs.collection("team").doc("m" + (i + 1)), { ...m, photo: null, order: i, createdAt: now }));
  await batch.commit();
}
$("#admin-view").addEventListener("click", async e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (act === "add") return openSheet(b.dataset.kind, null);
  if (act === "starter"){ b.disabled = true; b.textContent = "Adding…"; try { await addStarter(b.dataset.kind); toast("Samples added"); } catch { toast("Couldn’t add the samples. Try again."); b.disabled = false; } return; }
  if (act === "toggle-done" || act === "order-del" || act === "order-confirm"){
    const id = b.closest(".inbox-item").dataset.id, ref = fs.collection("orders").doc(id), o = orders.find(x => x.id === id);
    if (act === "toggle-done"){ try { await ref.update({ status: o.status === "done" ? "new" : "done" }); } catch { toast("Couldn’t update. Try again."); } }
    else if (act === "order-del"){ b.dataset.act = "order-confirm"; b.textContent = "Confirm delete"; b.classList.add("btn-red"); }
    else { b.disabled = true; try { await ref.delete(); toast("Deleted"); } catch { toast("Couldn’t delete. Try again."); b.disabled = false; } }
    return;
  }
  const row = b.closest(".arow"), kind = b.closest(".alist")?.dataset.kind; if (!row || !kind) return;
  const isP = kind === "project", list = isP ? projects : team, col = isP ? "projects" : "team";
  const idx = list.findIndex(x => x.id === row.dataset.id), item = list[idx]; if (!item) return;
  if (act === "edit") openSheet(kind, item);
  else if (act === "up" || act === "down"){
    $$(".ibtn", $("#admin-view")).forEach(x => x.disabled = true);
    try { await reorder(col, list, idx, act === "up" ? idx - 1 : idx + 1); } catch { toast("Couldn’t reorder. Try again."); render(); }
  }
  else if (act === "delete"){
    row.querySelector(".aact").innerHTML = `<span class="confirm">Delete ${isP ? "this project" : "this member"}?</span><button class="btn btn-red sm" type="button" data-act="confirm-del">Delete</button><button class="btn btn-ghost sm" type="button" data-act="cancel-del">Cancel</button>`;
    $("[data-act=cancel-del]", row).focus();
  }
  else if (act === "cancel-del") render();
  else if (act === "confirm-del"){
    b.disabled = true; b.textContent = "Deleting…";
    try { await fs.collection(col).doc(item.id).delete(); toast(`${isP ? item.title : item.name} deleted`); }
    catch { toast("Couldn’t delete. Try again."); render(); }
  }
});
$("#admin-view").addEventListener("submit", async e => {
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
function openSheet(kind, item){
  const isP = kind === "project";
  sheetState = { kind, item, image: item ? (isP ? item.image : item.photo) : null };
  const v = (k, d = "") => esc(item ? item[k] ?? d : d);
  sheetForm.innerHTML = `<div class="sheet-head"><h3 class="display">${item ? (isP ? "Edit project" : "Edit member") : (isP ? "Add project" : "Add member")}</h3><button class="close" type="button" data-sheet-close aria-label="Close">×</button></div>
  ${isP ? `
    <div class="field"><label for="s-title">Project title</label><input type="text" id="s-title" value="${v("title")}"></div>
    <div class="row2">
      <div class="field"><label for="s-cat">Service</label><select id="s-cat">${SERVICES.map(s => `<option${item && item.cat === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field"><label for="s-year">Year <small>(optional)</small></label><input type="text" id="s-year" inputmode="numeric" value="${v("year", String(new Date().getFullYear()))}"></div>
    </div>
    <div class="field"><label for="s-client">Client <small>(optional)</small></label><input type="text" id="s-client" value="${v("client")}"></div>
    <div class="field"><label for="s-desc">Description</label><textarea id="s-desc" placeholder="What was the brief, and what did you make?">${v("desc")}</textarea></div>
    <div class="field"><label for="s-did">What we did <small>(one item per line, optional)</small></label><textarea id="s-did" style="min-height:110px">${esc(item ? item.did.join("\n") : "")}</textarea></div>
    <div class="field"><label for="s-video">Video link <small>(optional: YouTube or a direct .mp4 link)</small></label><input type="text" id="s-video" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${v("video")}"></div>
  ` : `
    <div class="field"><label for="s-name">Full name</label><input type="text" id="s-name" autocomplete="off" value="${v("name")}"></div>
    <div class="field"><label for="s-role">Role</label><input type="text" id="s-role" list="role-list" autocomplete="off" value="${v("role")}">
      <datalist id="role-list"><option>CEO</option><option>COO</option><option>Designer</option><option>Editor</option><option>Coder</option></datalist></div>
    <div class="field"><label for="s-bio">Short bio <small>(optional)</small></label><textarea id="s-bio" style="min-height:100px" placeholder="One or two sentences about what they do.">${v("bio")}</textarea></div>
  `}
  <div class="field"><span class="flabel">${isP ? "Cover image" : "Photo"} <small style="color:var(--muted);font-weight:400">(optional)</small></span>
    <div class="media-pick"><div class="media-prev" id="media-prev"></div>
      <div class="media-btns"><label class="btn btn-ghost sm file-btn">Choose image<input type="file" id="media-file" accept="image/*"></label>
      <button type="button" class="btn btn-ghost sm" id="media-remove">Remove</button><p class="hint-s" id="media-msg">JPG, PNG or WebP. Large photos are resized automatically.</p></div>
    </div></div>
  <p class="err-msg" id="sheet-err" aria-live="polite"></p>
  <div class="form-foot"><button class="btn btn-red" type="submit">${isP ? "Save project" : "Save member"}</button><button class="btn btn-ghost" type="button" data-sheet-close>Cancel</button></div>`;
  updatePreview();
  sheet.hidden = false; document.body.style.overflow = "hidden";
  setTimeout(() => $("input[type=text]", sheetForm).focus(), 60);
}
function updatePreview(){
  const img = sheetState.image, isP = sheetState.kind === "project";
  $("#media-prev").innerHTML = img ? `<img src="${esc(img)}" alt="">` : `<span>${isP ? "No image. The site shows generated artwork." : "No photo. The site shows initials."}</span>`;
  $("#media-remove").hidden = !img;
}
function closeSheet(){ sheetState = null; sheet.hidden = true; document.body.style.overflow = ""; }
sheet.addEventListener("click", e => {
  if (e.target === sheet || e.target.closest("[data-sheet-close]")) closeSheet();
  if (e.target.id === "media-remove"){ sheetState.image = null; updatePreview(); }
});
sheet.addEventListener("change", async e => {
  if (e.target.id !== "media-file") return;
  const file = e.target.files[0], msg = $("#media-msg"); e.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")){ msg.textContent = "Choose an image file (JPG, PNG or WebP)."; return; }
  msg.textContent = "Preparing image…";
  try { sheetState.image = await compressImage(file, sheetState.kind === "project" ? 1400 : 800); updatePreview(); $("#media-msg").textContent = "Ready. Save to publish it."; }
  catch (x) { msg.textContent = x.message === "too_big" ? "That image is too detailed to store. Try a smaller or simpler one." : "That file couldn’t be read as an image."; }
});
addEventListener("keydown", e => { if (e.key === "Escape" && sheetState) closeSheet(); });
sheetForm.addEventListener("submit", async e => {
  e.preventDefault();
  const { kind, item } = sheetState, isP = kind === "project", err = $("#sheet-err");
  const val = id => ($("#" + id)?.value || "").trim();
  let data;
  if (isP){
    if (!val("s-title") || !val("s-desc")){ err.textContent = "Add a project title and a description."; (val("s-title") ? $("#s-desc") : $("#s-title")).focus(); return; }
    const video = val("s-video");
    if (video && !/^https:\/\//.test(video)){ err.textContent = "The video link must start with https://"; $("#s-video").focus(); return; }
    data = { title: val("s-title"), cat: val("s-cat"), year: val("s-year"), client: val("s-client"), desc: val("s-desc"),
      did: val("s-did").split("\n").map(s => s.trim()).filter(Boolean), video, image: sheetState.image || null };
  } else {
    if (!val("s-name") || !val("s-role")){ err.textContent = "Add a name and a role."; (val("s-name") ? $("#s-role") : $("#s-name")).focus(); return; }
    data = { name: val("s-name"), role: val("s-role"), bio: val("s-bio"), photo: sheetState.image || null };
  }
  const col = isP ? "projects" : "team", list = isP ? projects : team;
  const btn = $("button[type=submit]", sheetForm), label = btn.textContent; btn.disabled = true; btn.textContent = "Saving…";
  try {
    if (item) await fs.collection(col).doc(item.id).update(data);
    else {
      data.order = list.length ? Math.max(...list.map(x => x.order)) + 1 : 0;
      data.createdAt = new Date().toISOString();
      if (isP){ data.seed = Math.floor(Math.random() * 1000) + 1; data.pal = PALETTES[Math.floor(Math.random() * PALETTES.length)]; }
      await fs.collection(col).add(data);
    }
    closeSheet(); toast(item ? "Changes saved" : (isP ? "Project added" : "Member added"));
  } catch (x) {
    err.textContent = x.code === "permission-denied" ? "You don’t have permission to save. Check the admin email in firestore.rules." : "Couldn’t save. Check your connection and try again.";
    btn.disabled = false; btn.textContent = label;
  }
});
})();
