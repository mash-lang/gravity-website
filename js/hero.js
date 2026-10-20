/* Gravity — home page hero: the 3D mark and its orbiting debris field. */
(function(){
if (!document.querySelector(".hero")) return;
/* ===================== Hero: 3D mark + orbiting debris ===================== */
const mono = $("#mono");
const LAYERS = 22;
for (let i = LAYERS - 1; i >= 0; i--) {
  const t = i / (LAYERS - 1);
  const shade = i === 0 ? "#FF2D55" : `rgb(${Math.round(150 - t*95)},${Math.round(14 - t*8)},${Math.round(44 - t*22)})`;
  mono.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 986 1334" fill="${shade}" style="transform:translateZ(${-i*1.7}px)"><use href="#g-mark"/></svg>`);
}

(function field(){
  const hero = $(".hero"), back = $("#field-back"), front = $("#field-front");
  const bx = back.getContext("2d"), fx = front.getContext("2d");
  let W=0, H=0, dpr=1, cx=0, cy=0, R=100, colors={};
  const mouse = {x:-9999, y:-9999, nx:0, ny:0, sx:0, sy:0, on:false};
  const small = matchMedia("(max-width:860px)").matches;
  const N = small ? 420 : 950;
  const P = [];
  const r0 = rng(7);
  const gauss = () => (r0()+r0()+r0()-1.5)/1.5;
  for (let i=0;i<N;i++){
    const belt = r0() < .72;
    const rr = belt ? 1.25 + Math.pow(r0(),1.6)*0.75 : 2.0 + r0()*1.9;
    P.push({ r:rr, th:r0()*Math.PI*2, y:gauss()*0.05*rr, size:.6 + Math.pow(r0(),3)*2.6, red:r0()<.18, spin:r0()*Math.PI, ox:0, oy:0 });
  }
  const rings = [1.22, 1.62, 2.05, 2.9];

  function readColors(){
    const cs = getComputedStyle(document.documentElement);
    colors.dust = cs.getPropertyValue("--dust").trim();
    colors.glow = cs.getPropertyValue("--glow").trim();
  }
  function size(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    const b = hero.getBoundingClientRect(); W = b.width; H = b.height;
    for (const c of [back, front]) { c.width = W*dpr; c.height = H*dpr; }
    bx.setTransform(dpr,0,0,dpr,0,0); fx.setTransform(dpr,0,0,dpr,0,0);
    const m = mono.getBoundingClientRect();
    cx = m.left - b.left + m.width/2; cy = m.top - b.top + m.height/2;
    R = m.height * 0.5;
  }
  readColors(); size();
  addEventListener("resize", () => { size(); if (reduceMotion) draw(0); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); if (reduceMotion) draw(0); });

  hero.addEventListener("pointermove", e => {
    const b = hero.getBoundingClientRect();
    mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; mouse.on = true;
    mouse.nx = (mouse.x / W) * 2 - 1; mouse.ny = (mouse.y / H) * 2 - 1;
  });
  hero.addEventListener("pointerleave", () => { mouse.on = false; mouse.nx = 0; mouse.ny = 0; });

  const F = 1100;
  function project(x, y, z, tilt, roll){
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const y1 = y*ct - z*st, z1 = y*st + z*ct;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const x2 = x*cr - y1*sr, y2 = x*sr + y1*cr;
    const s = F / (F + z1);
    return [cx + x2*s, cy + y2*s, z1, s];
  }

  let last = performance.now(), T = 0, running = true, raf = 0;
  function draw(dt){
    T += dt;
    mouse.sx += (mouse.nx - mouse.sx) * 0.05; mouse.sy += (mouse.ny - mouse.sy) * 0.05;
    const tilt = 0.34 + Math.sin(T*0.00012)*0.05 + mouse.sy*0.14;
    const roll = -0.32 + Math.sin(T*0.00009)*0.04 + mouse.sx*0.1;
    mono.style.transform = `rotateY(${-22 + mouse.sx*26 + Math.sin(T*0.0004)*6}deg) rotateX(${8 - mouse.sy*14}deg) translateY(${Math.sin(T*0.0009)*6}px)`;

    const intro = reduceMotion ? 1 : 1 - Math.pow(1 - Math.min(1, T/2400), 3);
    const RS = R * (0.3 + 0.7*intro);
    bx.clearRect(0,0,W,H); fx.clearRect(0,0,W,H);

    // orbit lines, split into the half behind the mark and the half in front of it
    for (const rr of rings){
      const steps = 120, rad = rr*RS;
      for (const [ctx, wantFront] of [[bx,false],[fx,true]]){
        ctx.beginPath(); let pen = false;
        for (let i=0;i<=steps;i++){
          const a = i/steps*Math.PI*2;
          const [px,py,pz] = project(Math.cos(a)*rad, 0, Math.sin(a)*rad, tilt, roll);
          if ((pz < 0) === wantFront){ pen ? ctx.lineTo(px,py) : ctx.moveTo(px,py); pen = true; } else pen = false;
        }
        ctx.strokeStyle = `rgba(${colors.glow},${(rr < 2 ? .42 : .2)*intro})`; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    // debris: Kepler-ish speeds (inner orbits faster); the cursor acts as a second gravity well
    const sig2 = 2 * Math.pow(Math.max(120, R*0.9), 2);
    for (const p of P){
      p.th += dt * 0.00042 * Math.pow(1.25 / p.r, 1.5) * (1 + 4*(1-intro));
      const rad = p.r*RS;
      const [px,py,pz,s] = project(Math.cos(p.th)*rad, p.y*RS, Math.sin(p.th)*rad, tilt, roll);
      let tx = 0, ty = 0;
      if (mouse.on){
        const dx = mouse.x - px, dy = mouse.y - py;
        const k = 0.55 * Math.exp(-(dx*dx+dy*dy)/sig2);
        tx = dx*k; ty = dy*k;
      }
      p.ox += (tx - p.ox)*0.07; p.oy += (ty - p.oy)*0.07;
      const ctx = pz < 0 ? fx : bx;
      const depth = Math.max(.15, Math.min(1, s*s)) * intro;
      const sz = p.size * s;
      ctx.fillStyle = p.red ? `rgba(${colors.glow},${.9*depth})` : `rgba(${colors.dust},${.75*depth})`;
      ctx.save(); ctx.translate(px+p.ox, py+p.oy); ctx.rotate(p.spin + p.th*2);
      ctx.fillRect(-sz/2,-sz/2,sz,sz*0.8); ctx.restore();
    }

    if (mouse.on){
      fx.beginPath(); fx.arc(mouse.x, mouse.y, 22, 0, Math.PI*2);
      fx.strokeStyle = `rgba(${colors.glow},.6)`; fx.lineWidth = 1; fx.stroke();
      fx.beginPath(); fx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI*2); fx.fillStyle = `rgba(${colors.glow},1)`; fx.fill();
    }
  }
  function loop(now){ const dt = Math.min(50, now - last); last = now; draw(dt); if (running) raf = requestAnimationFrame(loop); }
  if (reduceMotion){ draw(0); return; }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running){ running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting){ running = false; cancelAnimationFrame(raf); }
  }).observe(hero);
  raf = requestAnimationFrame(loop);
})();

})();
