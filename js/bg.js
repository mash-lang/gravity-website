/* Gravity — always-on background: drifting glows, slow orbit rings and a field of dust.
   Dust has depth: near specks move more with the cursor and the scroll, and streak when you scroll fast.
   Pauses automatically when the tab is hidden; draws a single still frame for reduced-motion users. */
(function(){
const c = document.getElementById("bg-fx"); if (!c) return;
const ctx = c.getContext("2d");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const darkQ = matchMedia("(prefers-color-scheme: dark)");
let W = 0, H = 0, dpr = 1, dust = [], col = {}, dark = true;
let mx = 0, my = 0, tmx = 0, tmy = 0, lastY = scrollY, vel = 0;

function read(){
  const cs = getComputedStyle(document.documentElement);
  col.dust = cs.getPropertyValue("--dust").trim() || "238,234,244";
  col.glow = cs.getPropertyValue("--glow").trim() || "255,45,85";
  const t = document.documentElement.dataset.theme;
  dark = t ? t === "dark" : darkQ.matches;
}
function size(){
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = innerWidth; H = innerHeight;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = W < 760 ? 70 : 150;
  while (dust.length < n) dust.push(spawn(true));
  dust.length = n;
}
function spawn(any){
  const z = .25 + Math.random() * .75;
  return { x: Math.random() * W, y: any ? Math.random() * H : (Math.random() < .5 ? -5 : H + 5), z,
    r: .5 + Math.pow(Math.random(), 2) * 1.6 * z, vx: (Math.random() - .5) * .12, vy: -(.03 + Math.random() * .1),
    tw: Math.random() * 6.28, red: Math.random() < .12 };
}
function glow(x, y, r, rgb, a){
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function frame(t){
  ctx.clearRect(0, 0, W, H);
  const dy = scrollY - lastY; lastY = scrollY;
  vel += (dy - vel) * .12;
  mx += (tmx - mx) * .04; my += (tmy - my) * .04;
  const k = dark ? 1 : .55, R = Math.max(W, H) * .55, sy = scrollY * .04;

  // slow-moving glows (brand red, violet, warm red)
  glow(W * (.25 + .18 * Math.sin(t * .00007)) + mx * 30, H * (.25 + .12 * Math.cos(t * .00009)), R, col.glow, .11 * k);
  glow(W * (.8 + .12 * Math.cos(t * .00006)) + mx * 20, H * (.65 + .15 * Math.sin(t * .00008)), R * .9, "122,92,255", .08 * k);
  glow(W * (.5 + .3 * Math.sin(t * .00004 + 2)), H * (1.05 + .1 * Math.cos(t * .00005)), R * .8, "255,90,60", .06 * k);

  // orbit rings, slowly turning and drifting up as you scroll
  ctx.save();
  ctx.translate(W * .82 + mx * 18, H * .3 - (sy * 3) % (H * 1.6) + my * 12 + H * .3);
  ctx.rotate(-.28 + Math.sin(t * .00005) * .06);
  ctx.strokeStyle = `rgba(${col.glow},${.08 * k})`; ctx.lineWidth = 1;
  for (const s of [1, 1.45, 1.95]){ ctx.beginPath(); ctx.ellipse(0, 0, W * .32 * s, W * .085 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
  const a = t * .00018; ctx.fillStyle = `rgba(${col.glow},${.6 * k})`;
  ctx.beginPath(); ctx.arc(Math.cos(a) * W * .32 * 1.45, Math.sin(a) * W * .085 * 1.45, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // dust with depth
  const streak = Math.abs(vel) > 1.5;
  for (const p of dust){
    p.x += p.vx * p.z; p.y += p.vy * p.z - vel * .35 * p.z;
    if (p.y < -10 || p.y > H + 10 || p.x < -10 || p.x > W + 10){ Object.assign(p, spawn(false)); p.y = vel > 0 ? H + 5 : -5; }
    const x = p.x + mx * 26 * p.z, y = p.y + my * 18 * p.z;
    const alpha = (.18 + .5 * p.z) * (.65 + .35 * Math.sin(t * .0018 + p.tw)) * (dark ? 1 : .7);
    const rgb = p.red ? col.glow : col.dust;
    if (streak){
      ctx.strokeStyle = `rgba(${rgb},${alpha * .8})`; ctx.lineWidth = p.r;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + vel * 1.4 * p.z); ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (!still) requestAnimationFrame(frame);
}

read(); size();
addEventListener("resize", () => { size(); if (still) frame(0); });
darkQ.addEventListener("change", () => { read(); if (still) frame(0); });
addEventListener("pointermove", e => { tmx = e.clientX / W * 2 - 1; tmy = e.clientY / H * 2 - 1; }, { passive: true });
requestAnimationFrame(frame);
})();
