/* Gravity — shared behaviour for every public page: navigation, motion, projects, team and the contact forms. */
(function(){
let projects = [], team = [], revealNew = null, activeFilter = "all";

/* ===================== Nav ===================== */
const nav = $("#nav");
const onScroll = () => { const s = scrollY > 20; nav.classList.toggle("scrolled", s); document.body.classList.toggle("nav-solid", s); };
addEventListener("scroll", onScroll, {passive:true}); onScroll();
$("#menu-btn").addEventListener("click", () => { const o = nav.classList.toggle("open"); $("#menu-btn").setAttribute("aria-expanded", o); });

/* ===================== Projects ===================== */
const wall = $("#wall");
const PLAY = `<span class="play-badge" aria-hidden="true"><svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg></span>`;
function renderWork(){
  if (!wall) return;
  if (!projects.length){ wall.innerHTML = `<p class="empty">New projects are on their way. Check back soon.</p>`; return; }
  wall.innerHTML = projects.map(p => `
  <button class="screen" type="button" data-id="${esc(p.id)}" data-cat="${esc(p.cat)}" aria-label="Open project: ${esc(p.title)}"${activeFilter === "all" || activeFilter === p.cat ? "" : " hidden"}>
    <span class="glass">${media(p, 400, 300)}${p.video ? PLAY : ""}</span>
    <span class="cap"><b>${esc(p.title)}</b><span>${esc(p.cat)}</span></span>
  </button>`).join("");
  if (revealNew) revealNew($$(".screen", wall), 3);
}
$$(".filters button").forEach(btn => btn.addEventListener("click", () => {
  $$(".filters button").forEach(b => b.setAttribute("aria-pressed", b === btn));
  const f = activeFilter = btn.dataset.filter;
  $$(".screen", wall).forEach(s => s.hidden = !(f === "all" || s.dataset.cat === f));
  if (!reduceMotion) $$(".screen:not([hidden])", wall).forEach((s, i) => s.animate([{opacity:0, translate:"0 28px"},{opacity:1, translate:"0 0"}], {duration:700, delay:i*70, easing:"cubic-bezier(.16,1,.3,1)", fill:"backwards"}));
}));

const dlg = $("#project-dlg");
let currentProject = null;
if (wall && dlg){
  wall.addEventListener("click", e => {
    const s = e.target.closest(".screen"); if (!s) return;
    const p = projects.find(x => x.id === s.dataset.id); if (!p) return; currentProject = p;
    $("#dlg-art").innerHTML = media(p, 640, 360, true);
    $("#dlg-title").textContent = p.title;
    $("#dlg-desc").textContent = p.desc;
    $("#dlg-meta").innerHTML = [["Client", p.client], ["Service", p.cat], ["Year", p.year]].filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
    $("#dlg-did").innerHTML = p.did.map(d => `<li>${esc(d)}</li>`).join("");
    $("#dlg-did").hidden = !p.did.length;
    dlg.showModal();
  });
  $("#dlg-order").addEventListener("click", () => {
    location.href = `contact.html?service=${encodeURIComponent(currentProject.cat)}&about=${encodeURIComponent(currentProject.title)}`;
  });
  dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  dlg.addEventListener("close", () => { $("#dlg-art").innerHTML = ""; });
}

/* ===================== Team ===================== */
const grid = $("#team-grid");
function renderTeam(){
  if (!grid) return;
  if (!team.length){ grid.innerHTML = `<p class="empty">Team profiles are coming soon.</p>`; return; }
  grid.innerHTML = team.map((m, i) => {
    const ang = (i * 72 + 30) * Math.PI / 180, rx = 92, ry = 30;
    const dx = 120 + Math.cos(ang)*rx, dy = 130 + Math.sin(ang)*ry;
    const portrait = m.photo
      ? `<span class="portrait"><img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy"></span>`
      : `<span class="portrait" role="img" aria-label="${esc(m.name)}">
      <svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="120" cy="130" rx="${rx}" ry="${ry}" fill="none" stroke="var(--line)" stroke-width="1.5" transform="rotate(-14 120 130)"/>
        <g transform="rotate(-14 120 130)">${reduceMotion ? `<circle cx="${dx}" cy="${dy}" r="7" fill="#FF2D55"/>` : `<circle r="7" fill="#FF2D55"><animateMotion dur="${6+(i%5)*1.6}s" begin="-${(i*1.3).toFixed(1)}s" repeatCount="indefinite" path="M${120-rx},130 a${rx},${ry} 0 1,0 ${2*rx},0 a${rx},${ry} 0 1,0 ${-2*rx},0"/></circle>`}</g>
        <circle cx="120" cy="130" r="54" fill="var(--raise)" stroke="var(--line)"/>
        <text x="120" y="146" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="800" font-size="44" style="font-variation-settings:'wdth' 125" fill="var(--text)">${esc(initials(m.name))}</text>
      </svg>
    </span>`;
    return `<article class="person">${portrait}<h3>${esc(m.name)}</h3><p class="role">${esc(m.role)}</p>${m.bio ? `<p>${esc(m.bio)}</p>` : ""}</article>`;
  }).join("");
  if (revealNew) revealNew($$(".person", grid), 5);
}

(async () => {
  if (wall){ projects = await Store.projects(Number(wall.dataset.limit) || 0); renderWork(); }
  if (grid){ team = await Store.team(); renderTeam(); }
})();

/* ===================== Contact page: order + message ===================== */
const forms = { order: $("#form-order"), message: $("#form-message") };
const done = $("#done");
function showTab(which){
  done.classList.remove("on");
  for (const k of ["order", "message"]){
    const on = k === which;
    $("#tab-" + k).setAttribute("aria-selected", on);
    forms[k].hidden = !on;
  }
  $(".tabs").hidden = false;
}
function validate(form){
  let ok = true, first = null;
  $$(".field", form).forEach(f => {
    const el = $("input,textarea,select", f); const msg = $(".err-msg", f);
    if (!el || !msg) return;
    let err = "";
    const v = el.value.trim();
    if (el.required && !v) err = el.tagName === "TEXTAREA" ? "Add a few details so we can quote accurately." : "This field is required.";
    else if (el.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err = "Enter an email address like name@example.com.";
    f.classList.toggle("bad", !!err); msg.textContent = err;
    if (err){ ok = false; first ??= el; }
  });
  if (first) first.focus();
  return ok;
}
function summary(kind, data){
  const lines = kind === "order"
    ? [`Order: ${data.service} (${data.package})`, `Details: ${data.details}`, data.deadline && `Deadline: ${data.deadline}`, data.budget && `Budget: ${data.budget}`, `Name: ${data.name}`, data.company && `Company: ${data.company}`, `Email: ${data.email}`, data.phone && `Phone: ${data.phone}`]
    : [`Message${data.subject ? ": " + data.subject : ""}`, data.message, `From: ${data.name} <${data.email}>`];
  return lines.filter(Boolean).join("\n");
}
async function submit(kind, form){
  if (!validate(form)) return;
  const data = Object.fromEntries(new FormData(form).entries());
  for (const k in data) data[k] = String(data[k]).trim();
  const ref = "GR-" + Date.now().toString(36).toUpperCase().slice(-6);
  const btn = $("button[type=submit]", form), label = btn.textContent;
  btn.disabled = true; btn.textContent = kind === "order" ? "Placing order…" : "Sending…";
  const saved = await Store.submit(kind, data, ref);
  btn.disabled = false; btn.textContent = label;
  form.hidden = true; $(".tabs").hidden = true;
  const text = summary(kind, data), mail = esc(Store.contactEmail);
  if (saved){
    done.innerHTML = `<h3 class="display">${kind === "order" ? "Order placed." : "Message sent."}</h3>
      <p>Your reference is <span class="ref">${ref}</span>. We’ll reply to <b>${esc(data.email)}</b> within one working day${kind === "order" ? " to confirm scope and price" : ""}.</p>
      <button class="btn btn-ghost" type="button" id="again">${kind === "order" ? "Place another order" : "Send another message"}</button>`;
    form.reset();
  } else {
    done.innerHTML = `<h3 class="display">Almost there.</h3>
      <p>This page couldn’t send your ${kind} right now. Email it to <a href="mailto:${mail}">${mail}</a> with the details below and quote reference <span class="ref">${ref}</span>.</p>
      <pre id="sum">${esc(text)}</pre>
      <div class="form-foot"><button class="btn btn-red" type="button" id="copy">Copy details</button><button class="btn btn-ghost" type="button" id="again">Back to the form</button></div>`;
    $("#copy").addEventListener("click", async e => {
      try { await navigator.clipboard.writeText(`Reference ${ref}\n` + text); e.target.textContent = "Copied"; }
      catch { const s = getSelection(), r = document.createRange(); r.selectNodeContents($("#sum")); s.removeAllRanges(); s.addRange(r); e.target.textContent = "Selected, press Ctrl+C"; }
    });
  }
  done.classList.add("on"); done.focus();
  $("#again").addEventListener("click", () => showTab(kind));
}
if (forms.order){
  $("#tab-order").addEventListener("click", () => showTab("order"));
  $("#tab-message").addEventListener("click", () => showTab("message"));
  $$("form").forEach(form => form.addEventListener("input", e => {
    const f = e.target.closest(".field"); if (f && f.classList.contains("bad")) { f.classList.remove("bad"); $(".err-msg", f).textContent = ""; }
  }));
  forms.order.addEventListener("submit", e => { e.preventDefault(); submit("order", forms.order); });
  forms.message.addEventListener("submit", e => { e.preventDefault(); submit("message", forms.message); });
  // links like contact.html?service=Video%20editing&about=Atlas%20Fitness%20reels or ?tab=message
  const q = new URLSearchParams(location.search);
  if (q.get("tab") === "message") showTab("message");
  const svc = q.get("service");
  if (svc && SERVICES.includes(svc)) $(`#form-order input[name=service][value="${svc}"]`).checked = true;
  const about = q.get("about");
  if (about) $("#o-details").value = `Something similar to “${about.slice(0, 120)}”: `;
}

/* ===================== Motion across the page ===================== */
(function motion(){
  // scroll progress line under the nav
  const prog = $("#progress");
  const setP = () => { const m = document.documentElement.scrollHeight - innerHeight; prog.style.setProperty("--p", m > 0 ? (scrollY / m).toFixed(4) : 0); };
  addEventListener("scroll", setP, {passive:true}); addEventListener("resize", setP); setP();

  // headings rise in word by word
  function split(el){
    const text = el.textContent.trim(); el.setAttribute("aria-label", text);
    el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(" ");
    el.classList.add("split");
  }
  const targets = [];
  $$("h1.display, h2.display").forEach(h => { split(h); targets.push(h); });

  // everything else drifts up into place, staggered
  const groups = { ".sec-head .lede":0, ".sec-head .more":0, ".page-head .lede":0, ".filters":0, ".svc":0, ".svc-mini":0, ".cta-row":0, ".direct li":3, ".panel":0, ".foot > div":3, ".legal":0 };
  for (const [sel, cols] of Object.entries(groups)){
    $$(sel).forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--dl", (cols ? (i % cols) * 110 : 120) + "ms"); targets.push(el); });
  }
  $$(".svc li").forEach(li => li.style.setProperty("--i", [...li.parentElement.children].indexOf(li)));

  const track = $("#band-track"), band = track ? track.parentElement : null;
  const words = ["Graphic design", "Video editing", "Broadcasting", "Design it", "Cut it", "Stream it"];
  const set = words.map((w, i) => `<span class="${i % 2 ? "o" : ""}">${w}</span><svg viewBox="0 0 986 1334"><use href="#g-mark"/></svg>`).join("");
  if (track) track.innerHTML = set + set;

  if (reduceMotion){ targets.forEach(t => { t.classList.add("in"); t.classList.remove("rv"); }); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add("in"); io.unobserve(el);
    if (el.classList.contains("rv")) setTimeout(() => el.classList.remove("rv", "in"), 2100);
  }), {rootMargin:"0px 0px -10% 0px", threshold:0.05});
  targets.forEach(t => io.observe(t));
  // projects and team arrive from the database, so they register as they render
  revealNew = (els, cols) => els.forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--dl", (i % cols) * 110 + "ms"); io.observe(el); });
  if (wall && $$(".screen", wall).length) revealNew($$(".screen", wall), 3);
  if ($$(".person").length) revealNew($$(".person"), 5);

  // screens tilt toward the cursor with a moving glare
  if (wall && matchMedia("(hover:hover)").matches){
    wall.addEventListener("pointermove", e => {
      const s = e.target.closest(".screen"); if (!s) return;
      const g = $(".glass", s), b = g.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      g.style.setProperty("--ty", ((px - .5) * 12).toFixed(2) + "deg");
      g.style.setProperty("--tx", ((.5 - py) * 9).toFixed(2) + "deg");
      g.style.setProperty("--mx", (px * 100).toFixed(1) + "%"); g.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    });
    wall.addEventListener("pointerout", e => {
      const s = e.target.closest(".screen"); if (!s || s.contains(e.relatedTarget)) return;
      const g = $(".glass", s); g.style.setProperty("--tx", "0deg"); g.style.setProperty("--ty", "0deg");
    });
  }

  // marquee band: drifts on its own, speeds up and follows your scroll direction
  let bx = 0, lastY = scrollY, vel = 0, dir = -1, bandOn = true, footOn = false;
  if (band) new IntersectionObserver(([e]) => bandOn = e.isIntersecting).observe(band); else bandOn = false;

  // footer wordmark: letters are pulled toward the cursor
  const big = $("#big-word");
  big.setAttribute("aria-label", big.textContent);
  big.innerHTML = [...big.textContent].map(c => `<span class="ch" aria-hidden="true">${esc(c)}</span>`).join("");
  const chars = $$(".ch", big).map(el => ({el, y:0, x:0, r:0}));
  const fm = {x:0, y:0, on:false};
  const foot = $("footer");
  foot.addEventListener("pointermove", e => { fm.x = e.clientX; fm.y = e.clientY; fm.on = true; });
  foot.addEventListener("pointerleave", () => fm.on = false);
  new IntersectionObserver(([e]) => footOn = e.isIntersecting).observe(foot);

  function tick(){
    const dy = scrollY - lastY; lastY = scrollY;
    vel += (dy - vel) * 0.1;
    if (Math.abs(dy) > 0.5) dir = dy > 0 ? -1 : 1;
    if (bandOn){
      const half = track.scrollWidth / 2;
      bx += dir * (0.7 + Math.min(Math.abs(vel), 60) * 0.35);
      if (bx <= -half) bx += half; if (bx > 0) bx -= half;
      track.style.transform = `translate3d(${bx.toFixed(1)}px,0,0)`;
    }
    if (footOn){
      for (const c of chars){
        const b = c.el.getBoundingClientRect();
        const cx = b.left + b.width / 2 - c.x, cy = b.top + b.height / 2 - c.y;
        let tx = 0, ty = 0, tr = 0;
        if (fm.on){
          const dx = fm.x - cx, ddy = fm.y - cy;
          const f = Math.exp(-(dx*dx + ddy*ddy) / (2 * 170 * 170));
          tx = dx * 0.22 * f; ty = ddy * 0.4 * f; tr = dx * 0.06 * f;
        }
        c.x += (tx - c.x) * 0.12; c.y += (ty - c.y) * 0.12; c.r += (tr - c.r) * 0.12;
        c.el.style.transform = `translate(${c.x.toFixed(2)}px,${c.y.toFixed(2)}px) rotate(${c.r.toFixed(2)}deg)`;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

})();
