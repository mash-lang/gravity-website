/* Gravity — shared behaviour for every public page:
   navigation, image-led project/team layouts, motion, and the contact forms. */
(function(){
let projects = [], team = [], activeFilter = "all";
const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
const PLAY = `<span class="play-badge" aria-hidden="true"><svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg></span>`;
const SVC_ANCHOR = { "Graphic design": "svc-design", "Video editing": "svc-video", "Broadcasting": "svc-broadcast" };

/* ===================== Nav ===================== */
const nav = $("#nav");
const onScroll = () => { const s = scrollY > 20; nav.classList.toggle("scrolled", s); document.body.classList.toggle("nav-solid", s); };
addEventListener("scroll", onScroll, {passive:true}); onScroll();
const setMenu = o => { nav.classList.toggle("open", o); $("#menu-btn").setAttribute("aria-expanded", o); };
$("#menu-btn").addEventListener("click", () => setMenu(!nav.classList.contains("open")));
document.addEventListener("click", e => { if (nav.classList.contains("open") && !e.target.closest("#nav")) setMenu(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("open")){ setMenu(false); $("#menu-btn").focus(); } });

/* ===================== Helpers that make the site easier to use ===================== */
// back to top, with a ring that fills as you scroll
const toTop = document.createElement("button");
toTop.className = "to-top"; toTop.type = "button"; toTop.setAttribute("aria-label", "Back to top");
toTop.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="trk" cx="24" cy="24" r="21"/><circle class="bar" cx="24" cy="24" r="21"/><path d="M24 31V17M17 23l7-7 7 7"/></svg>';
document.body.appendChild(toTop);
toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
const ringLen = 2 * Math.PI * 21;
const onTop = () => {
  const m = document.documentElement.scrollHeight - innerHeight, p = m > 0 ? scrollY / m : 0;
  toTop.classList.toggle("on", scrollY > 600);
  toTop.style.setProperty("--off", (ringLen * (1 - p)).toFixed(1));
};
addEventListener("scroll", onTop, { passive: true }); onTop();
// keep the floating buttons out of the way while typing (they can cover inputs on phones)
document.addEventListener("focusin", e => { if (e.target.matches("input, textarea, select")) document.body.classList.add("typing"); });
document.addEventListener("focusout", e => { if (e.target.matches("input, textarea, select")) setTimeout(() => { if (!document.activeElement.matches("input, textarea, select")) document.body.classList.remove("typing"); }, 50); });
// quick WhatsApp chat button
const WAcfg = (window.GRAVITY_CONFIG || {}).whatsapp;
const WA = String(WAcfg === undefined ? "8801736981194" : WAcfg).replace(/\D/g, "");
if (WA){
  const fab = document.createElement("a");
  fab.className = "fab-wa"; fab.href = `https://wa.me/${WA}?text=${encodeURIComponent("Hi Gravity! I’d like to ask about a project.")}`;
  fab.target = "_blank"; fab.rel = "noopener"; fab.setAttribute("aria-label", "Chat with Gravity on WhatsApp");
  fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 10.5c.5 1.6 1.9 3 3.5 3.5"/></svg><span>Chat with us</span>';
  document.body.appendChild(fab);
}

/* ===================== Building blocks ===================== */
// an image frame: .m clips and zooms on hover, .px moves for parallax
const frame = (p, w, h, live = false, px = false) => `<span class="m"><span class="px"${px ? " data-px" : ""}>${media(p, w, h, false, live)}</span></span>`;
const cursorLabel = p => p.video ? "Play" : "View";
function monoFace(m, i){
  const ang = (i * 72 + 30) * Math.PI / 180, rx = 92, ry = 30, dx = 120 + Math.cos(ang)*rx, dy = 130 + Math.sin(ang)*ry;
  return `<svg class="mono-face" viewBox="0 0 240 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="120" cy="130" rx="${rx}" ry="${ry}" fill="none" stroke="var(--line)" stroke-width="1.5" transform="rotate(-14 120 130)"/>
    <g transform="rotate(-14 120 130)">${reduceMotion ? `<circle cx="${dx}" cy="${dy}" r="7" fill="#FF2D55"/>` : `<circle r="7" fill="#FF2D55"><animateMotion dur="${6+(i%5)*1.6}s" begin="-${(i*1.3).toFixed(1)}s" repeatCount="indefinite" path="M${120-rx},130 a${rx},${ry} 0 1,0 ${2*rx},0 a${rx},${ry} 0 1,0 ${-2*rx},0"/></circle>`}</g>
    <circle cx="120" cy="130" r="54" fill="var(--deep)" stroke="var(--line)"/>
    <text x="120" y="146" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="800" font-size="44" style="font-variation-settings:'wdth' 125" fill="var(--text)">${esc(initials(m.name))}</text>
  </svg>`;
}
const portrait = (m, i) => m.photo ? `<img src="${esc(m.photo)}" alt="" loading="lazy" decoding="async">` : monoFace(m, i);

// projects ticked “Featured” in the dashboard lead the home page and the reels (all projects if fewer than 3 are featured)
const showcase = () => { const f = projects.filter(p => p.featured); return f.length >= 3 ? f.concat(projects.filter(p => !p.featured)) : projects; };

/* ===================== Bento grid (home + work page) ===================== */
const bento = $("#bento");
const SIZES = ["b-xl", "", "b-t", "", "b-w", "b-w"];   // every 6 tiles fill 3 full rows
function renderBento(){
  if (!bento) return;
  const lim = Number(bento.dataset.limit) || 0;
  let list = (lim ? showcase() : projects).filter(p => activeFilter === "all" || p.cat === activeFilter);
  if (lim) list = list.slice(0, lim);
  if (!list.length){ bento.innerHTML = `<p class="empty">New projects are on their way.</p>`; return; }
  bento.innerHTML = list.map((p, i) => `
    <button class="tile ri ${SIZES[i % 6]}" type="button" data-pid="${esc(p.id)}" data-cursor="${cursorLabel(p)}" aria-label="Open project: ${esc(p.title)}" style="--dl:${(i % 4) * 90}ms">
      ${frame(p, 640, 480, true, true)}${p.video ? PLAY : ""}
      <span class="cap2"><b>${esc(p.title)}</b><span>${esc(p.cat)}</span></span>
    </button>`).join("");
  motion.register(bento);
}
$$(".filters button").forEach(btn => btn.addEventListener("click", () => {
  $$(".filters button").forEach(b => b.setAttribute("aria-pressed", b === btn));
  activeFilter = btn.dataset.filter; renderBento();
}));

/* ===================== Moving reels of project images ===================== */
function renderReels(){
  $$("[data-reel]").forEach(track => {
    if (!projects.length){ track.innerHTML = ""; return; }
    const vertical = track.dataset.axis === "y";
    const base = showcase();
    let list = track.dataset.reel === "b" ? base.slice().reverse() : base.slice();
    while (list.length < (vertical ? 8 : 10)) list = list.concat(list);
    if (vertical && list.length % 2) list.push(list[0]);
    const item = (p, dup) => vertical
      ? `<span class="vi">${frame(p, 300, 360)}</span>`
      : `<button class="reel-item" type="button" data-pid="${esc(p.id)}" data-cursor="${cursorLabel(p)}"${dup ? ' tabindex="-1" aria-hidden="true"' : ""} aria-label="Open project: ${esc(p.title)}">${frame(p, 480, 360, true)}<span class="cap2">${esc(p.title)}</span></button>`;
    track.innerHTML = list.map(p => item(p, false)).join("") + list.map(p => item(p, true)).join("");
    motion.marquee(track);
  });
}

/* ===================== Service slideshows (home cards + services page) ===================== */
function slidesFor(cat){
  let list = projects.filter(p => p.cat === cat).slice(0, 5);
  if (!list.length) list = [normProject("ph-" + cat.length, { cat, title: cat, seed: cat.length * 13, pal: PALETTES[cat.length % PALETTES.length] })];
  return list;
}
function renderSlides(){
  $$(".svc-card[data-cat], .svc2-media[data-cat]").forEach((box, bi) => {
    const cat = box.dataset.cat, list = slidesFor(cat);
    const host = box.classList.contains("svc-card") ? $(".slides", box) : box;
    host.innerHTML = list.map((p, i) => `<span class="slide${i === 0 ? " on" : ""}">${frame(p, 600, 800, false, !box.classList.contains("svc-card"))}</span>`).join("");
    const count = $(".sc-count", box);
    if (count){ const n = projects.filter(p => p.cat === cat).length; count.textContent = n ? `${n} project${n === 1 ? "" : "s"}` : "Coming soon"; count.hidden = false; }
    if (reduceMotion || list.length < 2) return;
    let k = 0; const slides = $$(".slide", host);
    clearInterval(box._t);
    setTimeout(() => { box._t = setInterval(() => { slides[k].classList.remove("on"); k = (k + 1) % slides.length; slides[k].classList.add("on"); }, 3200); }, bi * 700);
  });
  $$(".svc2-media").forEach(b => motion.register(b.parentElement));
}

/* ===================== Team ===================== */
const ICONS = {
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  out: '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};
function renderTeam(){
  const faces = $("#faces"), crew = $("#crew");
  if (faces){
    faces.innerHTML = team.slice(0, 6).map((m, i) => `<button type="button" class="face rv" data-mid="${esc(m.id)}" data-cursor="Profile" aria-label="Open profile: ${esc(m.name)}, ${esc(m.role)}" style="--dl:${i * 90}ms"><span class="ph">${portrait(m, i)}<span class="fh" aria-hidden="true">View profile ${ICONS.arrowR}</span></span><b>${esc(m.name)}</b><span>${esc(m.role)}</span></button>`).join("") || `<p class="empty">Team profiles are coming soon.</p>`;
    motion.register(faces);
  }
  if (crew){
    crew.innerHTML = team.map((m, i) => `<article class="mate ri" tabindex="0" role="button" data-mid="${esc(m.id)}" data-cursor="Profile" aria-label="Open profile: ${esc(m.name)}, ${esc(m.role)}" style="--dl:${(i % 4) * 90}ms">
      <span class="m"><span class="px" data-px>${portrait(m, i)}</span></span>
      <span class="glare" aria-hidden="true"></span>
      ${m.years ? `<span class="yrs">${m.years}+ yrs</span>` : ""}
      <div class="info"><b>${esc(m.name)}</b><span class="role">${esc(m.role)}</span>${m.bio ? `<p>${esc(m.bio)}</p>` : ""}<span class="open-hint">View profile ${ICONS.arrowR}</span></div>
    </article>`).join("") || `<p class="empty">Team profiles are coming soon.</p>`;
    motion.register(crew);
  }
  // a link like team.html?member=m3 (or index.html?member=m3) opens that profile straight away
  const want = new URLSearchParams(location.search).get("member");
  if (mdlg && want && team.some(m => m.id === want)) setTimeout(() => openMember(want, $(`[data-mid="${CSS.escape(want)}"]`)), reduceMotion ? 0 : 500);
}

/* ---------- member profile ---------- */
const mdlg = $("#member-dlg");
let mIndex = -1, mFrom = null;
function memberHTML(m, i){
  const socials = SOCIALS.filter(([k]) => m.socials[k]);
  const icon = k => k === "email" ? ICONS.mail : k === "whatsapp" ? ICONS.chat : k === "website" ? ICONS.globe : ICONS.out;
  let k = 0; const step = () => `style="--k:${k++}"`;
  return `<div class="md-grid">
    <div class="md-photo">
      <span class="m">${portrait(m, i)}</span>
      ${team.length > 1 ? `<div class="md-nav"><button type="button" data-mnav="-1" aria-label="Previous member">${ICONS.arrowL}</button><span>${i + 1} / ${team.length}</span><button type="button" data-mnav="1" aria-label="Next member">${ICONS.arrowR}</button></div>` : ""}
    </div>
    <div class="md-body">
      <p class="md-role" ${step()}>${esc(m.role)}</p>
      <h2 class="display" id="md-name" ${step()}>${esc(m.name)}</h2>
      ${(m.years || m.skills.length || m.experience.length) ? `<div class="md-stats" ${step()}>
        ${m.years ? `<div><b data-count="${m.years}">${m.years}</b><span>years of experience</span></div>` : ""}
        ${m.skills.length ? `<div><b data-count="${m.skills.length}">${m.skills.length}</b><span>skills</span></div>` : ""}
        ${m.experience.length ? `<div><b data-count="${m.experience.length}">${m.experience.length}</b><span>${m.experience.length === 1 ? "role" : "roles"}</span></div>` : ""}
      </div>` : ""}
      ${(m.about || m.bio) ? `<p class="md-about" ${step()}>${esc(m.about || m.bio)}</p>` : ""}
      ${m.skills.length ? `<div ${step()}><h3>Skills</h3><ul class="md-skills">${m.skills.map((s, j) => `<li style="--j:${j}">${esc(s)}</li>`).join("")}</ul></div>` : ""}
      ${m.experience.length ? `<div ${step()}><h3>Experience</h3><ol class="tl">${m.experience.map((x, j) => `<li style="--j:${j}"><b>${esc(x.title)}</b>${x.place ? `<span>${esc(x.place)}</span>` : ""}${x.period ? `<time>${esc(x.period)}</time>` : ""}</li>`).join("")}</ol></div>` : ""}
      ${socials.length ? `<div ${step()}><h3>Find ${esc(m.name.split(" ")[0])} online</h3><div class="md-socials">${socials.map(([key, label], j) => `<a href="${esc(socialHref(key, m.socials[key]))}"${key === "email" ? "" : ' target="_blank" rel="noopener"'} style="--j:${j}">${icon(key)}<span>${label}</span></a>`).join("")}</div></div>` : ""}
    </div>
  </div>`;
}
function countIn(root){
  if (reduceMotion) return;
  $$("[data-count]", root).forEach(el => {
    const to = Number(el.dataset.count), t0 = performance.now();
    const f = now => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}
function fillMember(i, swap){
  mIndex = i; const m = team[i], host = $(".md-in", mdlg);
  host.innerHTML = memberHTML(m, i);
  host.classList.remove("swap"); if (swap){ void host.offsetWidth; host.classList.add("swap"); }
  countIn(host);
  try { history.replaceState(null, "", `?member=${encodeURIComponent(m.id)}`); } catch {}
}
function openMember(id, fromEl){
  if (!mdlg) return;
  const i = team.findIndex(m => m.id === id); if (i < 0) return;
  mFrom = fromEl || null;
  const frame = fromEl && ($(".m", fromEl) || $(".ph", fromEl));
  if (document.startViewTransition && frame && !reduceMotion){
    frame.style.viewTransitionName = "member-photo";
    document.startViewTransition(() => { frame.style.viewTransitionName = ""; fillMember(i); mdlg.classList.add("vt"); mdlg.showModal(); });
  } else { fillMember(i); mdlg.showModal(); }
}
function closeMember(){
  const card = $$(`[data-mid="${CSS.escape(team[mIndex]?.id || "")}"]`).find(el => el.offsetParent), frame = card && ($(".m", card) || $(".ph", card));
  const done = () => { try { history.replaceState(null, "", location.pathname); } catch {} };
  if (document.startViewTransition && frame && !reduceMotion && mdlg.open){
    const t = document.startViewTransition(() => { mdlg.close(); frame.style.viewTransitionName = "member-photo"; });
    t.finished.finally(() => { frame.style.viewTransitionName = ""; mdlg.classList.remove("vt"); done(); });
  } else { mdlg.close(); done(); }
}
if (mdlg){
  mdlg.addEventListener("click", e => {
    if (e.target === mdlg || e.target.closest("[data-close]")) return closeMember();
    const nav = e.target.closest("[data-mnav]");
    if (nav) fillMember((mIndex + Number(nav.dataset.mnav) + team.length) % team.length, true);
  });
  mdlg.addEventListener("cancel", e => { e.preventDefault(); closeMember(); });
  mdlg.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); fillMember((mIndex + (e.key === "ArrowRight" ? 1 : -1) + team.length) % team.length, true); }
  });
}
document.addEventListener("click", e => { const c = e.target.closest("[data-mid]"); if (c && !c.closest("dialog")) openMember(c.dataset.mid, c); });
document.addEventListener("keydown", e => {
  const c = e.target.closest && e.target.closest(".mate[data-mid]");
  if (c && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); openMember(c.dataset.mid, c); }
});
// cards tilt toward the cursor with a moving glare
if (finePointer && !reduceMotion){
  document.addEventListener("pointermove", e => {
    const c = e.target.closest(".mate, .face"); if (!c) return;
    const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    c.style.setProperty("--ry", ((px - .5) * 14).toFixed(2) + "deg"); c.style.setProperty("--rx", ((.5 - py) * 10).toFixed(2) + "deg");
    c.style.setProperty("--gx", (px * 100).toFixed(1) + "%"); c.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
  });
  document.addEventListener("pointerout", e => {
    const c = e.target.closest(".mate, .face"); if (!c || c.contains(e.relatedTarget)) return;
    c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg");
  });
}

/* ===================== Project details (opens from any tile or reel item) ===================== */
const pdlg = $("#project-dlg");
let pIndex = -1, galTimer = 0, gal = null;
const mediaCache = {};
const SVG = {
  l: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  r: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg>'
};
function slideHTML(item, p, i){
  if (item.type === "video"){
    const yt = youtubeId(item.url);
    const poster = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : (p.image || "");
    return `<div class="gal-slide${i === 0 ? " is-on is-first" : ""}" data-kind="video" data-url="${esc(item.url)}" data-yt="${yt || ""}">
      ${poster ? `<img src="${esc(poster)}" alt="" class="gal-poster">` : ""}<button class="gal-play" type="button" aria-label="Play video">${SVG.play}</button>
      ${item.caption ? `<span class="gal-cap">${esc(item.caption)}</span>` : ""}</div>`;
  }
  return `<div class="gal-slide${i === 0 ? " is-on is-first" : ""}" data-kind="image">${item.src ? `<img src="${esc(item.src)}" alt="${esc(item.caption || p.title)}" ${i ? 'loading="lazy"' : ""}>` : art(p, 1280, 720)}${item.caption ? `<span class="gal-cap">${esc(item.caption)}</span>` : ""}</div>`;
}
function gallerySlides(p, extra){
  const list = [];
  if (p.image) list.push({ type: "image", src: p.image });
  if (p.video) list.push({ type: "video", url: p.video });
  extra.forEach(m => { if (!(m.type === "image" && m.src === p.image) && !(m.type === "video" && m.url === p.video)) list.push(m); });
  if (!list.length) list.push({ type: "image", src: null });
  return list;
}
function projectHTML(p, slides, i){
  const info = [["Client", p.client], ["Service", p.cat], ["Duration", p.duration], ["Budget", p.budget], ["Year", p.year]].filter(r => r[1]);
  let k = 0; const st = () => `style="--k:${k++}"`;
  return `<div class="gal" data-trans="${esc(p.transition)}" tabindex="-1">
      <div class="gal-stage">${slides.map((m, j) => slideHTML(m, p, j)).join("")}</div>
      ${slides.length > 1 ? `<button class="gal-arrow prev" type="button" data-gal="-1" aria-label="Previous picture">${SVG.l}</button><button class="gal-arrow next" type="button" data-gal="1" aria-label="Next picture">${SVG.r}</button>
      <span class="gal-count"><b>1</b> / ${slides.length}</span><span class="gal-bar"><i></i></span>` : ""}
    </div>
    ${slides.length > 1 ? `<div class="gal-thumbs" role="tablist" aria-label="Pictures">${slides.map((m, j) => {
      const yt = m.type === "video" && youtubeId(m.url);
      const th = m.type === "image" ? (m.src ? `<img src="${esc(m.src)}" alt="" loading="lazy">` : art(p, 160, 90)) : (yt ? `<img src="https://i.ytimg.com/vi/${yt}/default.jpg" alt="" loading="lazy">` : `<span class="vt-ico">${SVG.play}</span>`);
      return `<button type="button" role="tab" data-goto="${j}" aria-label="Show ${m.type === "video" ? "video" : "picture"} ${j + 1}"${j === 0 ? ' aria-selected="true"' : ""}>${th}${m.type === "video" ? `<span class="th-play">${SVG.play}</span>` : ""}</button>`;
    }).join("")}</div>` : ""}
    <div class="pd-body">
      <div class="pd-main">
        <p class="pd-cat" ${st()}>${esc(p.cat)}${p.year ? ` · ${esc(p.year)}` : ""}</p>
        <h2 class="display" id="pd-title" ${st()}>${esc(p.title)}</h2>
        ${p.desc ? `<p class="pd-desc" ${st()}>${esc(p.desc)}</p>` : ""}
        ${p.did.length ? `<div ${st()}><h3>What we delivered</h3><ul class="pd-did">${p.did.map((d, j) => `<li style="--j:${j}">${esc(d)}</li>`).join("")}</ul></div>` : ""}
      </div>
      <aside class="pd-side" ${st()}>
        ${info.length ? `<dl class="pd-info">${info.map(r => `<div><dt>${r[0]}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>` : ""}
        ${p.services.length ? `<h3>Services provided</h3><ul class="pd-services">${p.services.map((x, j) => `<li style="--j:${j}">${esc(x)}</li>`).join("")}</ul>` : ""}
        <button class="btn btn-red pd-cta" type="button" data-similar>Order something similar</button>
        ${projects.length > 1 ? `<div class="pd-nav"><button type="button" data-pnav="-1">${SVG.l}<span>Previous</span></button><span>${i + 1} / ${projects.length}</span><button type="button" data-pnav="1"><span>Next</span>${SVG.r}</button></div>` : ""}
      </aside>
    </div>`;
}
/* ---------- gallery: fade / slide / zoom / Ken Burns, arrows, thumbnails, swipe, autoplay ---------- */
function setupGallery(root){
  const slides = $$(".gal-slide", root), g = { root, slides, i: 0, n: slides.length };
  if (g.n < 2){ activate(g, 0); gal = g; return; }
  const go = (j, dir) => {
    j = (j + g.n) % g.n; if (j === g.i) return;
    dir = dir || (j > g.i ? 1 : -1);
    const from = slides[g.i], to = slides[j];
    root.style.setProperty("--dir", dir);
    from.classList.remove("is-on", "is-first"); from.classList.add("is-out");
    to.classList.remove("is-out"); void to.offsetWidth; to.classList.add("is-on");
    setTimeout(() => from.classList.remove("is-out"), 900);
    deactivate(from); g.i = j; activate(g, j);
    $(".gal-count b", root).textContent = j + 1;
    $$(".gal-thumbs button", pdlg).forEach((b, k) => { b.setAttribute("aria-selected", k === j); if (k === j) b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); });
    restart();
  };
  g.go = go;
  const restart = () => {
    clearTimeout(galTimer);
    const bar = $(".gal-bar i", root); if (bar){ bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
    if (reduceMotion || g.paused || slides[g.i].dataset.kind === "video") { root.classList.add("held"); return; }
    root.classList.remove("held");
    galTimer = setTimeout(() => go(g.i + 1, 1), 5200);
  };
  g.restart = restart;
  root.addEventListener("pointerenter", () => { g.paused = true; restart(); });
  root.addEventListener("pointerleave", () => { g.paused = false; restart(); });
  // swipe
  let sx = null;
  root.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") sx = e.clientX; });
  root.addEventListener("pointerup", e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) go(g.i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
  activate(g, 0); restart(); gal = g;
}
function activate(g, j){
  const s = g.slides[j]; if (!s || s.dataset.kind !== "video") return;
  if (s.dataset.playing) return;
  // videos start when shown; YouTube loads only after a click to keep the window fast
  if (!s.dataset.yt && isDirectVideo(s.dataset.url)){ s.insertAdjacentHTML("beforeend", `<video src="${esc(s.dataset.url)}" controls autoplay muted playsinline></video>`); s.dataset.playing = "1"; }
}
function deactivate(s){ const v = $("video", s); if (v) v.pause(); const f = $("iframe", s); if (f){ f.remove(); delete s.dataset.playing; } }
function playYouTube(s){
  if (!s || s.dataset.playing) return;
  const yt = s.dataset.yt;
  s.insertAdjacentHTML("beforeend", yt ? `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0" title="Project video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
    : `<video src="${esc(s.dataset.url)}" controls autoplay playsinline></video>`);
  s.dataset.playing = "1"; clearTimeout(galTimer);
}
async function fillProject(i, swap){
  pIndex = i; const p = projects[i], host = $(".pd-in", pdlg);
  let extra = mediaCache[p.id];
  const draw = () => {
    clearTimeout(galTimer);
    host.innerHTML = projectHTML(p, gallerySlides(p, extra || []), i);
    host.classList.remove("swap"); if (swap){ void host.offsetWidth; host.classList.add("swap"); }
    setupGallery($(".gal", host));
  };
  draw();
  try { history.replaceState(null, "", `?project=${encodeURIComponent(p.id)}`); } catch {}
  if (!extra && p.mediaCount){
    extra = mediaCache[p.id] = await Store.media(p.id);
    if (pIndex === i && extra.length) draw();
  }
}
function openProject(id, fromEl){
  if (!pdlg) return;
  const i = projects.findIndex(x => x.id === id); if (i < 0) return;
  const frame = fromEl && $(".m", fromEl);
  if (document.startViewTransition && frame && !reduceMotion){
    frame.style.viewTransitionName = "project-media";
    document.startViewTransition(() => { frame.style.viewTransitionName = ""; fillProject(i); pdlg.showModal(); });
  } else { fillProject(i); pdlg.showModal(); }
}
function closeProject(){
  clearTimeout(galTimer);
  const p = projects[pIndex], card = p && $$(`[data-pid="${CSS.escape(p.id)}"]`).find(el => el.offsetParent && el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight), frame = card && $(".m", card);
  const done = () => { $(".pd-in", pdlg).innerHTML = ""; try { history.replaceState(null, "", location.pathname); } catch {} };
  if (document.startViewTransition && frame && !reduceMotion && pdlg.open){
    const t = document.startViewTransition(() => { pdlg.close(); frame.style.viewTransitionName = "project-media"; });
    t.finished.finally(() => { frame.style.viewTransitionName = ""; done(); });
  } else { pdlg.close(); done(); }
}
document.addEventListener("click", e => { const t = e.target.closest("[data-pid]"); if (t && !t.closest("dialog")) openProject(t.dataset.pid, t); });
if (pdlg){
  pdlg.addEventListener("click", e => {
    if (e.target === pdlg || e.target.closest("[data-close]")) return closeProject();
    const a = e.target.closest("[data-gal]"); if (a && gal && gal.go) return gal.go(gal.i + Number(a.dataset.gal), Number(a.dataset.gal));
    const t = e.target.closest("[data-goto]"); if (t && gal && gal.go) return gal.go(Number(t.dataset.goto));
    const pl = e.target.closest(".gal-play"); if (pl) return playYouTube(pl.closest(".gal-slide"));
    const n = e.target.closest("[data-pnav]"); if (n) return fillProject((pIndex + Number(n.dataset.pnav) + projects.length) % projects.length, true);
    if (e.target.closest("[data-similar]")){ const p = projects[pIndex]; location.href = `contact.html?service=${encodeURIComponent(p.cat)}&about=${encodeURIComponent(p.title)}`; }
  });
  pdlg.addEventListener("cancel", e => { e.preventDefault(); closeProject(); });
  pdlg.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea")) return;
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && gal && gal.go){ e.preventDefault(); const d = e.key === "ArrowRight" ? 1 : -1; gal.go(gal.i + d, d); }
  });
}

/* ===================== Clients: logo rails ===================== */
// Many logo files have wide empty borders; crop to the visible part so all logos look the same size.
const trimJobs = {};
function trimLogo(img){
  const src = img.getAttribute("src"); if (!src || src.startsWith("data:image/png;trim")) return;
  if (!trimJobs[src]) trimJobs[src] = new Promise(done => {
    const probe = new Image();
    probe.onload = () => {
      try {
        const w = probe.naturalWidth, h = probe.naturalHeight; if (!w || !h) return done(null);
        const s = Math.min(1, 400 / Math.max(w, h)), cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
        const c = document.createElement("canvas"); c.width = cw; c.height = ch;
        const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(probe, 0, 0, cw, ch);
        const d = x.getImageData(0, 0, cw, ch).data;
        let t = ch, l = cw, b = -1, r = -1;
        for (let y = 0; y < ch; y++) for (let xx = 0; xx < cw; xx++) if (d[(y * cw + xx) * 4 + 3] > 12){ if (y < t) t = y; if (y > b) b = y; if (xx < l) l = xx; if (xx > r) r = xx; }
        if (b < 0 || (t <= 1 && l <= 1 && b >= ch - 2 && r >= cw - 2)) return done(null);
        const o = document.createElement("canvas"); o.width = r - l + 1; o.height = b - t + 1;
        o.getContext("2d").drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height);
        done(o.toDataURL("image/png"));
      } catch { done(null); }
    };
    probe.onerror = () => done(null);
    probe.src = src;
  });
  trimJobs[src].then(url => { if (url && img.getAttribute("src") === src) img.src = url; });
}
async function renderClients(){
  const sec = $("#clients"); if (!sec) return;
  const clients = await Store.clients();
  if (!clients.length){ sec.hidden = true; return; }
  sec.hidden = false;
  $$("[data-clients]", sec).forEach((track, ti) => {
    let list = ti ? clients.slice().reverse() : clients.slice();
    if (ti && clients.length < 6){ track.parentElement.hidden = true; return; }
    while (list.length < 8) list = list.concat(list);
    const item = (c, dup) => {
      const inner = c.logo ? `<img src="${esc(c.logo)}" alt="${dup ? "" : esc(c.name)}" loading="lazy">` : `<span class="logo-word">${esc(c.name)}</span>`;
      const attrs = `class="logo-item" title="${esc(c.name)}"${dup ? ' aria-hidden="true" tabindex="-1"' : ""}`;
      return c.url ? `<a ${attrs} href="${esc(c.url)}" target="_blank" rel="noopener" data-cursor="Visit">${inner}</a>` : `<span ${attrs}>${inner}</span>`;
    };
    track.innerHTML = list.map(c => item(c, false)).join("") + list.map(c => item(c, true)).join("");
    $$("img", track).forEach(trimLogo);
    motion.marquee(track);
  });
  motion.register(sec);
}

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

/* ===================== Motion ===================== */
var motion = (function(){
  const api = { register(){}, marquee(){} };
  // scroll progress line under the nav
  const prog = $("#progress");
  const setP = () => { const m = document.documentElement.scrollHeight - innerHeight; prog.style.setProperty("--p", m > 0 ? (scrollY / m).toFixed(4) : 0); };
  addEventListener("scroll", setP, {passive:true}); addEventListener("resize", setP); setP();

  // headings rise in word by word
  $$("h1.display, h2.display").forEach(el => {
    const text = el.textContent.trim(); el.setAttribute("aria-label", text);
    el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(" ");
    el.classList.add("split");
  });
  const groups = [".page-head .lede", ".hero .tag", ".filters", ".cta-row", ".direct li", ".panel", ".foot > div", ".legal", ".kicker-link", ".svc2 .one", ".svc2 .chips", ".svc2 .meta2", ".svc-card"];
  groups.forEach(sel => $$(sel).forEach((el, i) => { el.classList.add("rv"); if (!el.style.getPropertyValue("--dl")) el.style.setProperty("--dl", (i % 4) * 100 + "ms"); }));

  // band words
  const band = $("#band-track");
  if (band){
    const words = ["Graphic design", "Video editing", "Broadcasting", "Design it", "Cut it", "Stream it"];
    const set = words.map((w, i) => `<span class="${i % 2 ? "o" : ""}">${w}</span><svg viewBox="0 0 986 1334"><use href="#g-mark"/></svg>`).join("");
    band.innerHTML = set + set; band.dataset.follow = "1"; band.dataset.speed = "0.7"; band.dataset.dir = "-1";
  }

  if (reduceMotion){
    $$(".split, .rv").forEach(el => { el.classList.add("in"); el.classList.remove("rv"); });
    api.register = root => $$(".rv, .ri", root).forEach(el => el.classList.remove("rv", "ri"));
    api.register(document);
    return api;
  }

  // reveal: text drifts up, images wipe in; classes are removed afterwards so hover effects take over
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add("in"); io.unobserve(el);
    if (el.classList.contains("rv") || el.classList.contains("ri")) setTimeout(() => el.classList.remove("rv", "ri", "in"), 2400);
  }), {rootMargin:"0px 0px -8% 0px", threshold:0.05});
  $$(".split, .rv, .ri").forEach(el => io.observe(el));

  // silent video previews play only while visible
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting){ if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
  }), {threshold:0.2});

  // parallax inside image frames
  const pxSet = new Set();
  const pio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? pxSet.add(e.target) : pxSet.delete(e.target)));

  api.register = root => {
    $$(".rv, .ri", root).forEach(el => io.observe(el));
    $$("video[data-src]", root).forEach(v => vio.observe(v));
    $$("[data-px]", root).forEach(el => pio.observe(el));
  };
  api.register(document);

  // marquees: band, image reels, contact column
  const tracks = [];
  api.marquee = track => {
    let t = tracks.find(x => x.el === track);
    if (!t){
      t = { el: track, pos: 0, on: true, hover: 1, y: track.dataset.axis === "y" };
      tracks.push(t);
      new IntersectionObserver(([e]) => t.on = e.isIntersecting).observe(track.parentElement);
      track.parentElement.addEventListener("pointerenter", () => t.hover = 0.15);
      track.parentElement.addEventListener("pointerleave", () => t.hover = 1);
    }
    t.pos = Number(track.dataset.dir) > 0 ? -(t.y ? track.scrollHeight : track.scrollWidth) / 2 : 0;
    api.register(track);
  };
  if (band) api.marquee(band);

  // cursor companion
  let cur = null, cx = -100, cy = -100, tx = -100, ty = -100;
  if (finePointer){
    cur = document.createElement("div"); cur.className = "cursor"; cur.setAttribute("aria-hidden", "true"); cur.innerHTML = "<b></b>";
    document.body.appendChild(cur);
    addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; cur.classList.add("on"); }, {passive:true});
    document.addEventListener("pointerleave", () => cur.classList.remove("on"));
    document.addEventListener("pointerover", e => {
      const big = e.target.closest("[data-cursor]"), link = e.target.closest("a, button, label, select");
      cur.classList.toggle("big", !!big); cur.classList.toggle("link", !big && !!link);
      if (big) cur.firstChild.textContent = big.dataset.cursor;
      const field = e.target.closest("input, textarea, iframe, dialog"); cur.style.opacity = field ? "0" : "";
    });
    // magnetic buttons
    document.addEventListener("pointermove", e => {
      const b = e.target.closest(".btn"); if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`;
    });
    document.addEventListener("pointerout", e => { const b = e.target.closest(".btn"); if (b && !b.contains(e.relatedTarget)) b.style.translate = ""; });
  }

  // footer wordmark: letters are pulled toward the cursor
  const big = $("#big-word");
  big.setAttribute("aria-label", big.textContent);
  big.innerHTML = [...big.textContent].map(c => `<span class="ch" aria-hidden="true">${esc(c)}</span>`).join("");
  const chars = $$(".ch", big).map(el => ({el, y:0, x:0, r:0}));
  const fm = {x:0, y:0, on:false};
  const foot = $("footer"); let footOn = false;
  foot.addEventListener("pointermove", e => { fm.x = e.clientX; fm.y = e.clientY; fm.on = true; });
  foot.addEventListener("pointerleave", () => fm.on = false);
  new IntersectionObserver(([e]) => footOn = e.isIntersecting).observe(foot);

  // page transitions: curtain sweeps in before leaving for another page on this site
  const pt = $(".pt");
  if (pt){
    document.addEventListener("click", e => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      e.preventDefault(); pt.classList.add("leave");
      setTimeout(() => location.href = url.href, 460);
    });
    addEventListener("pageshow", e => { if (e.persisted) pt.classList.remove("leave"); });
  }

  let lastY = scrollY, vel = 0, dirScroll = -1, skew = 0;
  // scroll effects: image groups lean with scroll speed, big headings drift at their own pace
  $$(".bento, .svc-cards, .faces, .crew, .cta-media").forEach(el => el.dataset.skew = "");
  const driftSet = new Set();
  const dio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? driftSet.add(e.target) : driftSet.delete(e.target)));
  $$(".page-head h1, .sec-title h2, .cta-block h2, .svc2 h2").forEach(el => dio.observe(el));
  function tick(){
    const dy = scrollY - lastY; lastY = scrollY;
    vel += (dy - vel) * 0.1;
    if (Math.abs(dy) > 0.5) dirScroll = dy > 0 ? -1 : 1;
    for (const t of tracks){
      if (!t.on) continue;
      const half = (t.y ? t.el.scrollHeight : t.el.scrollWidth) / 2; if (!half) continue;
      const dir = t.el.dataset.follow ? dirScroll : Number(t.el.dataset.dir || -1);
      t.pos += dir * (Number(t.el.dataset.speed || .5) + Math.min(Math.abs(vel), 60) * 0.3) * t.hover;
      if (t.pos <= -half) t.pos += half; if (t.pos > 0) t.pos -= half;
      t.el.style.transform = t.y ? `translate3d(0,${t.pos.toFixed(1)}px,0)` : `translate3d(${t.pos.toFixed(1)}px,0,0)`;
    }
    skew += (Math.max(-2.5, Math.min(2.5, vel * .08)) - skew) * .12;
    if (Math.abs(skew) > .01 || skew !== 0){ const sk = Math.abs(skew) < .02 ? 0 : skew; $$("[data-skew]").forEach(el => el.style.transform = sk ? `skewY(${sk.toFixed(2)}deg)` : ""); if (!sk) skew = 0; }
    const vh = innerHeight;
    for (const el of driftSet){
      const r = el.getBoundingClientRect();
      el.style.transform = `translate3d(0,${(((r.top + r.height / 2) - vh / 2) / vh * -28).toFixed(1)}px,0)`;
    }
    for (const el of pxSet){
      const r = el.parentElement.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(0,${(off * -7).toFixed(2)}%,0)`;
    }
    if (cur){
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    }
    if (footOn){
      for (const c of chars){
        const b = c.el.getBoundingClientRect();
        const ccx = b.left + b.width / 2 - c.x, ccy = b.top + b.height / 2 - c.y;
        let ttx = 0, tty = 0, tr = 0;
        if (fm.on){
          const dx = fm.x - ccx, ddy = fm.y - ccy;
          const f = Math.exp(-(dx*dx + ddy*ddy) / (2 * 170 * 170));
          ttx = dx * 0.22 * f; tty = ddy * 0.4 * f; tr = dx * 0.06 * f;
        }
        c.x += (ttx - c.x) * 0.12; c.y += (tty - c.y) * 0.12; c.r += (tr - c.r) * 0.12;
        c.el.style.transform = `translate(${c.x.toFixed(2)}px,${c.y.toFixed(2)}px) rotate(${c.r.toFixed(2)}deg)`;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return api;
})();

/* ===================== Load content ===================== */
(async () => {
  if ($("[data-reel], #bento, .svc-card, .svc2-media")){
    projects = await Store.projects();
    renderReels(); renderSlides(); renderBento();
    const want = new URLSearchParams(location.search).get("project");
    if (pdlg && want && projects.some(p => p.id === want)) setTimeout(() => openProject(want, $(`[data-pid="${CSS.escape(want)}"]`)), reduceMotion ? 0 : 500);
  }
  renderClients();
  if ($("#faces, #crew")){ team = await Store.team(); renderTeam(); }
})();

})();
