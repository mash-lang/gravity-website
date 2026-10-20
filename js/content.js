/* Gravity — shared content and helpers (used by every page and the admin dashboard).
   FALLBACK_PROJECTS and FALLBACK_TEAM are shown when Firebase isn’t set up yet. */

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const anim = s => reduceMotion ? "" : s;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));


const SERVICES = ["Graphic design", "Video editing", "Broadcasting"];
const PALETTES = [
  ["#F3E7D3","#2A1E17","#FF2D55","#C98B4B"], ["#1B1430","#FF8A5B","#FFD39A","#FF2D55"], ["#0D1426","#3B6CFF","#EDE8F2","#FF2D55"],
  ["#FFE14D","#1D3BFF","#FF2D55","#111018"], ["#14091F","#B14BFF","#FF2D55","#FFC2D1"], ["#0F2A24","#2BD9A0","#F2F0E6","#FF2D55"],
  ["#E4EDE3","#1F3B2D","#E9A27C","#FF2D55"], ["#101012","#FF2D55","#F5F5F5","#FFB000"], ["#1A1530","#E9C46A","#EDE8F2","#FF2D55"]
];

/* ---------- built-in content ----------
   To add a picture without Firebase, upload it to the images folder and add  image: "images/your-file.jpg",
   to a project, or  photo: "images/name.jpg",  to a team member. */
const FALLBACK_PROJECTS = [
  {id:"northwind", title:"Northwind Coffee", cat:"Graphic design", client:"Northwind Coffee Co.", year:"2026",
   desc:"A full identity for a specialty roaster opening its second café: logo, cup and bag packaging, menus and a launch kit for social.",
   did:["Logo and identity system","Packaging for 6 blends","Menu boards and signage","Instagram launch kit"], pal:["#F3E7D3","#2A1E17","#FF2D55","#C98B4B"], seed:11},
  {id:"halcyon", title:"Halcyon Run Club launch", cat:"Video editing", client:"Halcyon Run Club", year:"2026",
   desc:"A 60-second launch film and twelve vertical cutdowns built from two days of dawn footage, graded warm and cut to the club’s own track.",
   did:["Edit and story structure","Color grade","Sound design and mix","12 vertical cutdowns"], pal:["#1B1430","#FF8A5B","#FFD39A","#FF2D55"], seed:24},
  {id:"summit", title:"Orbit Tech Summit", cat:"Broadcasting", client:"Orbit Events", year:"2026",
   desc:"Two days of conference talks streamed live to YouTube and LinkedIn with four cameras, remote guests and branded on-screen graphics.",
   did:["4-camera production","Remote guest integration","Live graphics package","Same-day highlight reel"], pal:["#0D1426","#3B6CFF","#EDE8F2","#FF2D55"], seed:37},
  {id:"kite", title:"Kite Festival posters", cat:"Graphic design", client:"City Kite Festival", year:"2025",
   desc:"A poster series and wayfinding system for a three-day outdoor festival, designed to read from across a field.",
   did:["Poster series of 5","Wayfinding signage","Tickets and wristbands","Animated social posts"], pal:["#FFE14D","#1D3BFF","#FF2D55","#111018"], seed:52},
  {id:"velvet", title:"Velvet Records music video", cat:"Video editing", client:"Velvet Records", year:"2025",
   desc:"Performance and narrative footage cut into a three-minute music video, with a stylised grade and hand-built glitch transitions.",
   did:["Edit and pacing","Stylised color grade","VFX transitions","Teasers for release week"], pal:["#14091F","#B14BFF","#FF2D55","#FFC2D1"], seed:63},
  {id:"marathon", title:"City Marathon live", cat:"Broadcasting", client:"City Marathon Committee", year:"2025",
   desc:"A five-hour live stream following the race with a moto camera, finish-line coverage and a live leaderboard overlay.",
   did:["Moto and fixed cameras","Live leaderboard graphics","Commentary audio","Finish-line replays"], pal:["#0F2A24","#2BD9A0","#F2F0E6","#FF2D55"], seed:71},
  {id:"fernway", title:"Fernway skincare packaging", cat:"Graphic design", client:"Fernway", year:"2025",
   desc:"Packaging for a five-product skincare line, with a botanical illustration system that ties the range together on shelf.",
   did:["Packaging system","Botanical illustrations","Product photography art direction","E-commerce assets"], pal:["#E4EDE3","#1F3B2D","#E9A27C","#FF2D55"], seed:85},
  {id:"atlas", title:"Atlas Fitness reels", cat:"Video editing", client:"Atlas Fitness", year:"2026",
   desc:"Thirty short-form reels a month for a gym chain, edited from member shoots with captions, music and consistent branded titles.",
   did:["30 reels per month","Captions and titles","Trend-aware editing","Monthly performance review"], pal:["#101012","#FF2D55","#F5F5F5","#FFB000"], seed:93},
  {id:"convocation", title:"Lumen University convocation", cat:"Broadcasting", client:"Lumen University", year:"2025",
   desc:"A live broadcast of the annual convocation for families watching remotely, with name captions for every graduate who crossed the stage.",
   did:["3-camera live production","Graduate name captions","Multi-platform stream","Full archive recording"], pal:["#1A1530","#E9C46A","#EDE8F2","#FF2D55"], seed:104}
];

const FALLBACK_TEAM = [
  {name:"Maya Torres", role:"CEO", bio:"Sets direction, signs off on every project, and is who you call when it matters."},
  {name:"Daniel Okafor", role:"COO", bio:"Runs schedules, budgets and crews so deadlines actually hold."},
  {name:"Lena Fischer", role:"Designer", bio:"Leads identity, social and print work from first sketch to final files."},
  {name:"Jonah Reyes", role:"Editor", bio:"Cuts, grades and finishes every frame we deliver."},
  {name:"Priya Nair", role:"Coder", bio:"Builds our web projects, broadcast graphics and the tools behind them."}
];


/* ---------- normalising ---------- */
const safeImg = u => (typeof u === "string" && /^(data:image\/|https:\/\/|images\/|\.\/)/.test(u)) ? u : null;
const safeVideo = u => (typeof u === "string" && /^https:\/\//.test(u)) ? u : "";
function normProject(id, d){
  d = d || {};
  return { id: String(id).replace(/[^\w-]/g, ""), title: d.title || "Untitled project", cat: SERVICES.includes(d.cat) ? d.cat : "Graphic design",
    client: d.client || "", year: String(d.year || ""), desc: d.desc || "", did: Array.isArray(d.did) ? d.did : [],
    pal: Array.isArray(d.pal) && d.pal.length === 4 ? d.pal : PALETTES[0], seed: Number(d.seed) || 1,
    image: safeImg(d.image), video: safeVideo(d.video), order: Number(d.order) || 0 };
}
function normMember(id, d){
  d = d || {};
  return { id: String(id), name: d.name || "New member", role: d.role || "", bio: d.bio || "", photo: safeImg(d.photo), order: Number(d.order) || 0 };
}
const initials = n => String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

/* ---------- generated artwork for projects without an image ---------- */
/* ===================== Project artwork (placeholders — swap for real images) ===================== */
function art(p, w=400, h=300){
  const r = rng(p.seed), [a,b,c,d] = p.pal;
  let s = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.title)} preview">`;
  if (p.cat === "Graphic design"){
    s += `<rect width="${w}" height="${h}" fill="${a}"/>`;
    const big = 90 + r()*70;
    s += `<circle cx="${w*(.55+r()*.3)}" cy="${h*(.3+r()*.3)}" r="${big}" fill="${c}">${anim(`<animate attributeName="r" values="${big};${big*1.08};${big}" dur="${5+r()*3}s" repeatCount="indefinite"/>`)}</circle>`;
    s += `<rect x="${w*.08}" y="${h*(.12+r()*.2)}" width="${w*(.28+r()*.18)}" height="${h*.62}" rx="${r()*30}" fill="${b}"/>`;
    s += `<rect x="${w*(.5+r()*.2)}" y="${h*.62}" width="${w*.32}" height="${h*.22}" fill="${d}">${anim(`<animateTransform attributeName="transform" type="translate" values="0 0;-18 0;0 0" dur="${6+r()*3}s" repeatCount="indefinite"/>`)}</rect>`;
    for (let i=0;i<4;i++) s += `<rect x="${w*.12}" y="${h*(.7+i*.05)}" width="${w*(.12 + r()*.2)}" height="5" fill="${a}" opacity=".9"/>`;
    s += `<g fill="${b}">${Array.from({length:12},(_,i)=>`<circle cx="${w*.62 + (i%4)*14}" cy="${h*.12 + Math.floor(i/4)*14}" r="3"/>`).join("")}</g>`;
  } else if (p.cat === "Video editing"){
    s += `<defs><linearGradient id="sky${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
    s += `<rect width="${w}" height="${h}" fill="url(#sky${p.id})"/>`;
    s += `<circle cx="${w*(.3+r()*.4)}" cy="${h*.48}" r="${38+r()*30}" fill="${c}" opacity=".95">${anim(`<animate attributeName="cy" values="${h*.4};${h*.56};${h*.4}" dur="${10+r()*4}s" repeatCount="indefinite"/>`)}</circle>`;
    let path = `M0 ${h*.62}`; for (let x=0;x<=w;x+=40) path += ` L${x} ${h*(.5 + r()*.16)}`; path += ` L${w} ${h} L0 ${h}Z`;
    s += `<path d="${path}" fill="${a}" opacity=".85"/>`;
    s += `<rect x="0" y="0" width="${w}" height="${h*.1}" fill="#000"/><rect x="0" y="${h*.78}" width="${w}" height="${h*.22}" fill="#000" opacity=".82"/>`;
    let x = 14; while (x < w-14){ const cw = 18 + r()*60; s += `<rect x="${x}" y="${h*.84}" width="${Math.min(cw, w-14-x)}" height="${h*.05}" rx="2" fill="${r()<.3?d:c}" opacity="${.55+r()*.45}"/>`; x += cw + 3; }
    let x2 = 14; while (x2 < w-14){ const cw = 30 + r()*70; s += `<rect x="${x2}" y="${h*.91}" width="${Math.min(cw, w-14-x2)}" height="${h*.035}" rx="2" fill="#8E88A8" opacity=".5"/>`; x2 += cw + 3; }
    const ph = w*(.25+r()*.5);
    s += `<g><rect x="${ph}" y="${h*.8}" width="2" height="${h*.17}" fill="#FF2D55"/><path d="M${ph-6} ${h*.8} h14 l-6 7z" fill="#FF2D55"/>${anim(`<animateTransform attributeName="transform" type="translate" values="${14-ph} 0;${w-14-ph} 0" dur="7s" begin="-${((ph-14)/(w-28)*7).toFixed(2)}s" repeatCount="indefinite"/>`)}</g>`;
    s += `<text x="${w-14}" y="${h*.065}" text-anchor="end" font-family="Archivo,sans-serif" font-size="12" fill="#EEEAF4" opacity=".8">00:0${Math.floor(r()*9)}:${String(Math.floor(r()*59)).padStart(2,"0")}:${String(Math.floor(r()*24)).padStart(2,"0")}</text>`;
  } else {
    s += `<rect width="${w}" height="${h}" fill="${a}"/>`;
    s += `<rect x="${w*.1}" y="${h*.56}" width="${w*.8}" height="${h*.08}" fill="${b}" opacity=".6"/>`;
    for (let i=0;i<5;i++){ const lx = w*(.15 + i*.17), sw = 6 + r()*6; s += `<path d="M${lx} 0 L${lx-30-r()*20} ${h*.6} L${lx+30+r()*20} ${h*.6}Z" fill="${c}" opacity="${.06+r()*.1}">${anim(`<animateTransform attributeName="transform" type="rotate" values="${-sw} ${lx} 0;${sw} ${lx} 0;${-sw} ${lx} 0" dur="${4+r()*4}s" repeatCount="indefinite"/>`)}</path>`; }
    const nf = 1 + Math.floor(r()*4); for (let i=0;i<nf;i++){ const fx = w*(.5 + (i-(nf-1)/2)*.17); s += `<rect x="${fx-9}" y="${h*.36}" width="18" height="${h*.2}" rx="9" fill="${c}" opacity=".85"/><circle cx="${fx}" cy="${h*.32}" r="10" fill="${c}" opacity=".85"/>`; }
    s += `<rect x="${w*.06}" y="${h*.72}" width="${w*.62}" height="${h*.13}" fill="${d}"/><rect x="${w*.06}" y="${h*.85}" width="${w*.5}" height="${h*.07}" fill="${c}"/>`;
    s += `<rect x="${w*.09}" y="${h*.76}" width="${w*.3}" height="7" fill="#fff"/><rect x="${w*.09}" y="${h*.79+6}" width="${w*.2}" height="5" fill="#fff" opacity=".75"/>`;
    s += `<rect x="${w*.09}" y="${h*.875}" width="${w*.26}" height="5" fill="${a}" opacity=".8"/>`;
    s += `<rect x="14" y="14" width="56" height="22" rx="4" fill="#FF2D55"/><circle cx="26" cy="25" r="4" fill="#fff">${anim('<animate attributeName="opacity" values="1;.15;1" dur="1.4s" repeatCount="indefinite"/>')}</circle><text x="34" y="29.5" font-family="Archivo,sans-serif" font-weight="700" font-size="12" fill="#fff">Live</text>`;
  }
  return s + `</svg>`;
}


function youtubeId(u){ const m = String(u).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : null; }
function media(item, w, h, inDialog = false){
  if (inDialog && item.video){
    const yt = youtubeId(item.video);
    if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${esc(item.title)} video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    return `<video src="${esc(item.video)}" controls playsinline${item.image ? ` poster="${esc(item.image)}"` : ""}></video>`;
  }
  if (item.image) return `<img src="${esc(item.image)}" alt="" loading="lazy">`;
  return art(item, w, h);
}
