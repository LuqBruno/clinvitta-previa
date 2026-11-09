// Clinvitta — prévia conceitual (Bruno Luque).
// Motion 11.11.17 (UMD local, global `Motion`) para coreografia e cenas ligadas à rolagem;
// Lenis só para a roda do mouse (toque nativo). Sem este arquivo, todo o conteúdo fica visível.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const sceneMQ = matchMedia('(min-width: 900px) and (min-height: 560px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

/* tokens de motion (espelham as variáveis CSS) */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const DUR = { press: 0.13, control: 0.22, panel: 0.36, title: 0.95 };
const SPRING_CTA = { stiffness: 190, damping: 18 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ------------------------------------------------------------------ */
/* Topo: fundo sólido após a primeira dobra                             */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const onScrollTop = () => top.classList.toggle('is-solid', scrollY > 24);
addEventListener('scroll', onScrollTop, { passive: true });
onScrollTop();

/* ------------------------------------------------------------------ */
/* Rolagem contínua (Lenis) — roda do mouse; toque nativo               */
/* ------------------------------------------------------------------ */
let lenis = null;
let lenisRaf = 0;
function startLenis() {
  if (reduce || !window.Lenis || lenis || !fineMQ.matches) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); lenisRaf = requestAnimationFrame(raf); };
  lenisRaf = requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { cancelAnimationFrame(lenisRaf); lenis.destroy(); lenis = null; } });

function scrollToY(y) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2 });
  else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const t = id.length > 1 && document.querySelector(id);
  if (!t) return;
  e.preventDefault();
  const offset = t.id === 'inicio' ? 0 : t.getBoundingClientRect().top + scrollY - (t.id === 'salas' ? 0 : 60);
  scrollToY(offset);
  history.replaceState(null, '', id);
});

/* ------------------------------------------------------------------ */
/* Índice do topo acompanha a leitura (ix-section-spy)                  */
/* ------------------------------------------------------------------ */
const spyNav = $('[data-spy]');
const spyInd = $('[data-spy-ind]');
const spyLinks = $$('[data-spy-link]');
function setSpy(id) {
  let hit = null;
  spyLinks.forEach((l) => { const on = l.dataset.spyLink === id; l.toggleAttribute('aria-current', on); if (on) { l.setAttribute('aria-current', 'true'); hit = l; } });
  if (!spyInd) return;
  if (!hit) { spyInd.style.opacity = '0'; return; }
  spyInd.style.opacity = '1';
  spyInd.style.width = hit.offsetWidth - 24 + 'px';
  spyInd.style.transform = `translateX(${hit.offsetLeft + 12}px)`;
}
if (spyNav) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) setSpy(en.target.dataset.section); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-section]').forEach((s) => io.observe(s));
}

/* ------------------------------------------------------------------ */
/* Mola interrompível (CTA magnético)                                   */
/* ------------------------------------------------------------------ */
function springVec(apply, { stiffness = 170, damping = 20 } = {}) {
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const tick = (t) => {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016); s.last = t;
    for (const k of ['x', 'y']) {
      const v = 'v' + k, tk = 't' + k;
      const f = -stiffness * (s[k] - s[tk]) - damping * s[v];
      s[v] += f * dt; s[k] += s[v] * dt;
    }
    apply(s.x, s.y);
    if (Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.01) s.raf = requestAnimationFrame(tick);
    else { s.raf = 0; s.last = 0; }
  };
  return (x, y) => { s.tx = x; s.ty = y; if (!s.raf) s.raf = requestAnimationFrame(tick); };
}
if (!reduce && fineMQ.matches) {
  $$('[data-magnetic]').forEach((b) => {
    const go = springVec((x, y) => { b.style.translate = `${x}px ${y}px`; }, SPRING_CTA);
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      go((e.clientX - r.left - r.width / 2) * 0.22, (e.clientY - r.top - r.height / 2) * 0.32);
    });
    b.addEventListener('pointerleave', () => go(0, 0));
  });
}

/* ------------------------------------------------------------------ */
/* O corredor: perspectiva CSS 3D dirigida pela rolagem                 */
/* ------------------------------------------------------------------ */
const hall = $('[data-hall]');
const view = $('[data-hall-view]');
const world = $('[data-hall-world]');
const rooms = $$('[data-room]');
const indexBtns = $$('[data-go]');
const progBar = $('[data-hall-progress]');

const DEPTH = 3300;            // fundo do corredor (px)
const SEG = 550;               // segmentos de parede/piso/teto
const PERSP = 760;
const SIGNS = [                // placas salientes, faceadas para quem caminha
  { d: 900, side: 'l', n: 'Sala 01', t: 'Biomedicina\nestética' },
  { d: 1500, side: 'r', n: 'Sala 02', t: 'Terapia\ncapilar' },
  { d: 2100, side: 'l', n: 'Sala 03', t: 'Odontologia' },
  { d: 2700, side: 'r', n: 'Sala 04', t: 'Nutrição' },
];
const STOPS = [...SIGNS.map((s) => s.d - 540), DEPTH - 940];   // posição da "câmera" diante de cada placa
const INTRO = 0.07;            // trecho inicial parado na entrada
const CHUNK = (1 - INTRO) / STOPS.length;

let hallState = null;          // { segs, signs, lamps, cleanup }

function buildWorld() {
  world.textContent = '';
  const segs = [];
  const n = Math.ceil(DEPTH / SEG);
  const shade = (i, k) => { const t = Math.min(1, (i + k) / n); return `rgb(${Math.round(lerp(243, 222, t))},${Math.round(lerp(239, 214, t))},${Math.round(lerp(233, 204, t))})`; };
  for (let i = 0; i < n; i++) {
    const near = -i * SEG;
    const mk = (cls, transform, size) => {
      const e = document.createElement('div');
      e.className = cls;
      Object.assign(e.style, size, { transform });
      e.style.setProperty('--c0', shade(i, 0));
      e.style.setProperty('--c1', shade(i, 1));
      world.appendChild(e);
      segs.push({ e, far: near - SEG });
      return e;
    };
    mk('hw-wall hw-wall--l', `translateZ(${near}px) rotateY(90deg)`, { width: SEG + 1 + 'px' });
    mk('hw-wall hw-wall--r', `translateZ(${near - SEG}px) rotateY(-90deg)`, { width: SEG + 1 + 'px' });
    mk('hw-floor', `translateZ(${near}px) rotateX(90deg)`, { height: SEG + 1 + 'px', backgroundPosition: `0 ${i * SEG}px` });
    mk('hw-ceil', `translateZ(${near}px) rotateX(-90deg)`, { height: SEG + 1 + 'px' });
  }
  const end = document.createElement('div');
  end.className = 'hw-end';
  end.style.transform = `translateZ(${-DEPTH}px)`;
  end.innerHTML = '<span class="hw-end__art"></span><span class="hw-end__tag">e outras áreas</span>';
  world.appendChild(end);

  const signs = SIGNS.map((s) => {
    const e = document.createElement('div');
    e.className = `hw-sign hw-sign--${s.side}`;
    e.innerHTML = `<div class="hw-sign__card"><span class="hw-sign__n">${s.n}</span><span class="hw-sign__t">${s.t.replace('\n', '<br>')}</span></div>`;
    e.style.top = '27%';
    e.style.left = s.side === 'l' ? '0px' : 'calc(100% - 236px)';
    e.style.transform = `translateZ(${-s.d}px)`;
    world.appendChild(e);
    return { e, d: s.d };
  });
  const lamps = SIGNS.flatMap((s) => {
    const e = document.createElement('div');
    e.className = 'hw-lamp';
    e.style.top = '14%';
    e.style.left = s.side === 'l' ? '-6px' : 'calc(100% - 64px)';
    e.style.transform = `translateZ(${-(s.d + 160)}px)`;
    world.appendChild(e);
    return [{ e, d: s.d + 160 }];
  });
  return { segs, signs, lamps };
}

function camAt(p) {
  // retorna posição da câmera (T) e a sala ativa para o progresso p (0..1)
  if (p <= INTRO) return { T: 0, active: -1 };
  const q = (p - INTRO) / CHUNK;
  const k = Math.min(STOPS.length - 1, Math.floor(q));
  const f = q - k;
  const from = k === 0 ? 0 : STOPS[k - 1] + 50;
  const travel = 0.42;
  const T = f < travel ? lerp(from, STOPS[k], easeInOut(f / travel)) : lerp(STOPS[k], STOPS[k] + 50, (f - travel) / (1 - travel));
  return { T, active: f > 0.24 || k > 0 ? (f > 0.24 ? k : k - 1) : -1 };
}

function setActive(i, M) {
  if (hallState.active === i) return;
  const prev = hallState.active;
  hallState.active = i;
  hall.dataset.active = String(i);
  rooms.forEach((r, j) => {
    const on = j === i;
    r.classList.toggle('is-active', on);
    if (hallState.scene) r.inert = !on;
  });
  indexBtns.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  hallState.signs.forEach((s, j) => s.e.classList.toggle('is-on', j === i));
  const r = rooms[i];
  if (!r || !M) return;
  // painel abre do lado da placa: esquerda (salas 01/03), direita (02/04), centro (fundo)
  const side = i === 4 ? 'c' : i % 2 === 0 ? 'l' : 'r';
  const fromClip = side === 'l' ? 'inset(0% 100% 0% 0% round 6px)' : side === 'r' ? 'inset(0% 0% 0% 100% round 6px)' : 'inset(50% 0% 50% 0% round 6px)';
  const dir = prev > i ? -1 : 1;
  M.animate(r, { opacity: [0, 1], transform: [`translateY(${14 * dir}px)`, 'translateY(0px)'] }, { duration: DUR.panel, ease: EASE_OUT });
  const fig = $('.room__fig', r);
  if (fig) M.animate(fig, { clipPath: [fromClip, 'inset(0% 0% 0% 0% round 6px)'] }, { duration: 0.55, ease: EASE_IN_OUT });
  const plate = $('.plate', r);
  if (plate) M.animate(plate, { transform: [`translateX(${side === 'r' ? 18 : -18}px)`, 'translateX(0px)'], opacity: [0, 1] }, { duration: DUR.panel, ease: EASE_OUT });
}

function renderHall(p) {
  const st = hallState;
  const { T, active } = camAt(p);
  world.style.transform = `translate3d(0,0,${T.toFixed(1)}px)`;
  if (progBar) progBar.style.transform = `scaleX(${p.toFixed(4)})`;
  for (const s of st.segs) {
    const hide = s.far + T > PERSP - 2;   // segmento inteiro atrás da câmera
    if (s.hidden !== hide) { s.e.style.visibility = hide ? 'hidden' : ''; s.hidden = hide; }
  }
  for (const s of st.signs) {
    const z = -s.d + T;                    // distância relativa ao plano da tela
    const o = clamp((-160 - z) / 200);    // some antes de passar pela câmera
    s.e.style.opacity = o.toFixed(3);
  }
  for (const l of st.lamps) l.e.style.opacity = clamp((PERSP * 0.6 + l.d - T) / 300).toFixed(3);
  setActive(active, window.Motion);
}

function progressFor(i) { return INTRO + CHUNK * (i + 0.62); }

function setupHall(M) {
  teardownHall();
  const scene = !!M && !reduce && sceneMQ.matches;
  hallState = { scene, active: -2, signs: [], segs: [], lamps: [], cleanups: [] };
  if (!scene) {
    hall.classList.remove('hall--scene');
    delete hall.dataset.active;
    rooms.forEach((r) => { r.inert = false; r.classList.remove('is-active'); r.style.opacity = ''; r.style.transform = ''; });
    return;
  }
  hall.classList.add('hall--scene');
  Object.assign(hallState, buildWorld());
  const onProg = (pp) => renderHall(clamp(typeof pp === 'number' ? pp : pp?.y?.progress ?? 0));
  hallState.cleanups.push(M.scroll(onProg, { target: hall, offset: ['start start', 'end end'] }));
  // estado inicial coerente mesmo antes do primeiro evento de rolagem
  const r = hall.getBoundingClientRect();
  renderHall(clamp(-r.top / Math.max(1, hall.offsetHeight - innerHeight)));
}
function teardownHall() {
  if (!hallState) return;
  hallState.cleanups.forEach((c) => typeof c === 'function' && c());
  world.textContent = '';
  world.style.transform = '';
  rooms.forEach((r) => { r.classList.remove('is-active'); r.inert = false; });
  hallState = null;
}
indexBtns.forEach((b) => b.addEventListener('click', () => {
  const i = +b.dataset.go;
  if (hallState?.scene) {
    const y = hall.offsetTop + progressFor(i) * (hall.offsetHeight - innerHeight);
    scrollToY(y);
  } else {
    rooms[i]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
}));

/* ------------------------------------------------------------------ */
/* Motion: coreografia                                                  */
/* ------------------------------------------------------------------ */
const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');

if (M) {
  const { animate, scroll, inView, stagger } = M;
  root.classList.add('motion-ready');
  setupHall(M);
  sceneMQ.addEventListener('change', () => setupHall(M));

  if (!reduce) {
    /* ---- Assinatura 1: entrada do hero (texto disponível de imediato) ---- */
    animate('.hero__title .line > span', { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: DUR.title, delay: stagger(0.09), ease: EASE_OUT });
    animate('.hero .eyebrow, .hero__lead, .hero__actions, .hero__note', { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0)'] }, { duration: 0.7, delay: stagger(0.08, { startDelay: 0.25 }), ease: EASE_OUT });
    animate('.hero__frame', { clipPath: ['inset(0 0 100% 0 round 4px)', 'inset(0 0 0% 0 round 4px)'] }, { duration: 1.25, delay: 0.1, ease: EASE_IN_OUT });
    animate('.hero__frame img', { transform: ['scale(1.12)', 'scale(1)'] }, { duration: 1.8, delay: 0.1, ease: EASE_OUT });
    animate('.hero__cap', { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] }, { duration: 0.6, delay: 1.1, ease: EASE_OUT });
    // brilho dourado percorre o letreiro uma única vez
    animate('.hero__glint i', { transform: ['translateX(-120%) skewX(-12deg)', 'translateX(260%) skewX(-12deg)'] }, { duration: 1.6, delay: 1.15, ease: [0.45, 0, 0.2, 1] });
    // linha de LED do topo (pseudo-elemento): transição CSS acionada por classe
    requestAnimationFrame(() => root.classList.add('led-on'));

    /* ---- Narrativa 1: ao sair do hero, a recepção se aproxima (image-zoom) ---- */
    const heroImg = $('.hero__frame img');
    scroll((p) => { const v = typeof p === 'number' ? p : 0; heroImg.style.scale = String(1 + v * 0.1); }, { target: $('.hero'), offset: ['start start', 'end start'] });

    /* ---- títulos em máscara de linhas (line-mask) ---- */
    $$('[data-lines]').forEach((h) => {
      if (h.closest('.hero')) return;
      inView(h, () => { animate($$('.line > span', h), { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: DUR.title, delay: stagger(0.08), ease: EASE_OUT }); }, { amount: 0.4 });
    });
    $$('.eyebrow').forEach((e) => {
      if (e.closest('.hero')) return;
      inView(e, () => { animate(e, { opacity: [0, 1], transform: ['translateX(-10px)', 'translateX(0)'] }, { duration: 0.6, ease: EASE_OUT }); }, { amount: 0.6 });
    });

    /* ---- Narrativa 2: fotos assentam no recorte (image-zoom) ---- */
    $$('[data-zoom] img').forEach((img) => {
      scroll((p) => { const v = typeof p === 'number' ? p : 0; img.style.scale = String(1.14 - 0.14 * clamp(v * 1.6)); }, { target: img.closest('[data-zoom]'), offset: ['start end', 'end start'] });
    });

    /* ---- trilho de luz da lista (celular): acende com a leitura ---- */
    const roomsList = $('[data-rooms]');
    scroll((p) => { if (!hallState?.scene) roomsList.style.setProperty('--led-p', clamp((typeof p === 'number' ? p : 0) * 1.15).toFixed(3)); }, { target: roomsList, offset: ['start 70%', 'end 70%'] });
    rooms.forEach((r) => inView(r, () => { r.classList.add('is-lit'); return () => r.classList.remove('is-lit'); }, { margin: '-30% 0px -40% 0px' }));

    /* ---- Narrativa 3: três impressões convergem no título do contato (ed-ink-register) ---- */
    const inks = $$('.contact__title .ink');
    const main = $('.contact__title .ink__main');
    scroll((p) => {
      const v = clamp((typeof p === 'number' ? p : 0) * 1.5);
      const e = 1 - Math.pow(1 - v, 3);
      inks[0].style.transform = `translate(${(-22 * (1 - e)).toFixed(1)}px, ${(12 * (1 - e)).toFixed(1)}px)`;
      inks[1].style.transform = `translate(${(20 * (1 - e)).toFixed(1)}px, ${(-10 * (1 - e)).toFixed(1)}px)`;
      inks.forEach((i) => (i.style.opacity = (0.85 * (1 - e) + 0.0).toFixed(3)));
      main.style.opacity = (0.15 + 0.85 * e).toFixed(3);
    }, { target: $('.contact'), offset: ['start end', 'center center'] });
  } else {
    rooms.forEach((r) => r.classList.add('is-lit'));
  }
}
