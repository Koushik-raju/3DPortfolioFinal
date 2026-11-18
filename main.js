// Koushik Raju — 3D room portfolio.
// Renders the room, drives the camera, and wires the overlay UI.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildRoom } from './room/world.js';
import {
  person,
  projects,
  experiments,
  experience,
  education,
  certifications,
  skills,
  about,
  contact,
} from './data.js';

/* --------------------------------- helpers -------------------------------- */

const $ = (sel) => document.querySelector(sel);
const esc = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const pad = (n) => String(n).padStart(2, '0');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const isCompact = () =>
  window.matchMedia('(max-width: 1100px) and (orientation: portrait), (max-width: 820px)').matches;

// Resolution stays near native: anything past ~1.5x is supersampling, which
// multiplies fill cost on the integrated GPUs most visitors have and buys very
// little at these viewing distances. The old 4K ceiling made the room unusable.
const maxRenderRatio = () =>
  Math.max(1, Math.min(isCompact() ? 1.25 : 1.5, (window.devicePixelRatio || 1) + 0.25));
// Start at native pixel density: smooth first, then supersample a little.
const startRenderRatio = () => Math.min(maxRenderRatio(), 1);
let resRatio = 0;

function applyResolution(next) {
  resRatio = Math.max(0.85, Math.min(maxRenderRatio(), next));
  if (!renderer) return;
  renderer.setPixelRatio(resRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setPixelRatio(resRatio);
    composer.setSize(window.innerWidth, window.innerHeight);
    if (bloom && !lowFx) bloom.setSize(window.innerWidth * 0.42, window.innerHeight * 0.42);
  }
}

const els = {
  canvas: $('#scene'),
  loader: $('#loader'),
  loaderLog: $('#loaderLog'),
  loaderFill: $('#loaderFill'),
  loaderStatus: $('#loaderStatus'),
  loaderPct: $('#loaderPct'),
  hero: $('#hero'),
  markers: $('#markers'),
  dock: $('.dock'),
  dockPill: $('#dockPill'),
  panel: $('#panel'),
  panelScroll: $('#panelScroll'),
  panelCount: $('#panelCount'),
  panelPath: $('#panelPath'),
  panelClose: $('#panelClose'),
  scrim: $('#scrim'),
  soundBtn: $('#soundBtn'),
  soundText: document.querySelector('.sound-text'),
  dragHint: $('#dragHint'),
  toast: $('#toast'),
  flatNote: $('#flatNote'),
  certNav: $('#certNav'),
  certCount: $('#certCount'),
};

const state = {
  section: null,
  hovered: null,
  booted: false,
  dragging: false,
};

let openTimer = 0;

/* -------------------------------- camera rig ------------------------------- */

// Section views are aligned to the actual screens in room/world.js at boot:
// the target is the screen centre and the angles come from its surface normal,
// so the HTML can be mapped straight into the object.
const SURFACE_RADIUS = { projects: 1.45, experience: 1.9, about: 0.9, contact: 0.72, certifications: 2.5 };
const SURFACE_SECTIONS = new Set(['projects', 'contact']);
const OBJECT_SECTIONS = new Set(['experience', 'about']);

const VIEWS = {
  home: {
    target: [-0.15, 2.0, -3.1],
    radius: 7.6,
    theta: 0.05,
    phi: 1.47,
    fov: 40,
    bias: [0, 0, 0],
    compact: { target: [-0.45, 1.95, -3.45], radius: 6.1, theta: 0.14, phi: 1.52, fov: 58 },
  },
  projects: { target: [-0.5, 2.47, -4.17], radius: 1.3, theta: 0, phi: 1.57, fov: 46, bias: [0, 0, 0] },
  experience: { target: [-2.22, 2.52, -4.12], radius: 1.35, theta: 0.33, phi: 1.57, fov: 44, bias: [0, 0, 0] },
  about: { target: [1.1, 1.6, -3.9], radius: 0.62, theta: -0.42, phi: 1.27, fov: 44, bias: [0, 0, 0] },
  contact: { target: [1.67, 1.66, -3.75], radius: 0.75, theta: 0.34, phi: 1.57, fov: 44, bias: [0, 0, 0] },
  certifications: { target: [4.26, 3.06, -4.9], radius: 2.5, theta: 0, phi: 1.57, fov: 44, bias: [0, 0, 0] },
};

const rig = {
  target: new THREE.Vector3(...VIEWS.home.target),
  bias: new THREE.Vector3(),
  radius: VIEWS.home.radius,
  theta: VIEWS.home.theta,
  phi: VIEWS.home.phi,
  fov: VIEWS.home.fov,
};
const goal = {
  target: new THREE.Vector3(...VIEWS.home.target),
  bias: new THREE.Vector3(),
  radius: VIEWS.home.radius,
  theta: VIEWS.home.theta,
  phi: VIEWS.home.phi,
  fov: VIEWS.home.fov,
};
const orbit = { theta: 0, phi: 0 };
const orbitGoal = { theta: 0, phi: 0 };
const pointer = { x: 0, y: 0, nx: 0, ny: 0 };
const parallax = { x: 0, y: 0 };

/* -------------------------------- content UI ------------------------------- */

const SECTIONS = {
  projects: { index: '01', title: 'Projects', path: '~/portfolio/projects' },
  experience: { index: '02', title: 'Experience', path: '~/portfolio/experience.log' },
  about: { index: '03', title: 'About', path: '~/portfolio/about.md' },
  contact: { index: '04', title: 'Contact', path: '~/portfolio/contact' },
};


/* ------------------------------ the open book ----------------------------- */

const BOOK_CHAPTERS = [
  ['01', 'The short version'],
  ['02', 'The path here'],
  ['03', 'The toolkit'],
  ['04', 'Selected work'],
  ['05', 'Off screen'],
  ['06', 'Say hello'],
];

function bookSheet(index, number, title, left, right) {
  return `
    <section class="book-sheet${index === 0 ? ' is-current' : ''}" data-book-sheet data-book-index="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}">
      <div class="book-page book-page--left">
        <p class="book-kicker">A working notebook · chapter ${number}</p>
        <p class="book-num">${number}</p>
        <h3 class="book-title">${title}</h3>
        ${left}
        <ol class="book-index" aria-label="Chapters">
          ${BOOK_CHAPTERS.map(
            ([num, name], i) => `<li${i === index ? ' class="is-here"' : ''}><span>${num}</span>${esc(name)}</li>`,
          ).join('')}
        </ol>
      </div>
      <div class="book-page book-page--right" data-book-page>
        ${right}
        <p class="book-folio"><span>${title}</span><span>${number} · a working notebook</span></p>
      </div>
    </section>`;
}

const BOOK_SHEETS = [
  bookSheet(
    0,
    '01',
    'The short version',
    `<p class="book-lede">${esc(about.paragraphs[0])}</p>
     <p class="book-sign">${esc(person.first)} ${esc(person.last)} — ${esc(person.role)}</p>`,
    `<p>${esc(about.paragraphs[1])}</p>
     <dl class="book-facts">
       ${about.facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}
     </dl>`,
  ),
  bookSheet(
    1,
    '02',
    'The path here',
    `<p class="book-lede">Two roles, one through-line: I test what I build.</p>
     <p class="book-sign">${esc(education[0].title)} · ${esc(education[0].org)}</p>`,
    `<ol class="book-timeline">
       ${experience
         .map(
           (item) => `<li>
             <span class="book-period">${esc(item.period)}</span>
             <div>
               <h4>${esc(item.role)} <em>${esc(item.org)}</em></h4>
               <p class="book-meta">${esc(item.meta)}</p>
               <ul>${item.points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>
             </div>
           </li>`,
         )
         .join('')}
     </ol>`,
  ),
  bookSheet(
    2,
    '03',
    'The toolkit',
    `<p class="book-lede">Tools I reach for, and the quality work that keeps them honest.</p>
     <p class="book-sign">Front to back, then to the edge cases.</p>`,
    `<div class="book-skills">
       ${skills
         .map(
           (group) => `<div>
             <h4>${esc(group.group)}</h4>
             <p>${group.items.map(esc).join(' · ')}</p>
           </div>`,
         )
         .join('')}
     </div>
     <p class="book-aside">The testing habit came from time on the other side of the bug report — see the cards by the desk.</p>`,
  ),
  bookSheet(
    3,
    '04',
    'Selected work',
    `<p class="book-lede">Three builds that taught me the most.</p>
     <p class="book-sign">The monitor keeps the shorter cases, and a lab of small experiments.</p>`,
    projects
      .map(
        (project) => `<article class="book-work">
          <p class="book-meta">${esc(project.kind)} · ${esc(project.year)}</p>
          <h4>${esc(project.name)}</h4>
          <p>${esc(project.detail)}</p>
          <p class="book-stack">${project.stack.map(esc).join(' / ')}</p>
          <a href="${esc(project.href)}" target="_blank" rel="noopener noreferrer">${esc(project.cta)} ↗</a>
        </article>`,
      )
      .join(''),
  ),
  bookSheet(
    4,
    '05',
    'Off screen',
    `<p class="book-lede">The parts that aren’t in a repo.</p>
     <p class="book-sign">Reading, skating, and a growing list of half-finished ideas.</p>`,
    `<p>${esc(about.paragraphs[2])}</p>
     <div class="book-tags">${about.interests.map((item) => `<span>${esc(item)}</span>`).join('')}</div>`,
  ),
  bookSheet(
    5,
    '06',
    'Say hello',
    `<p class="book-lede">${esc(contact.headline)}</p>
     <p class="book-sign">${esc(contact.note)}</p>`,
    `<a class="book-mail" href="mailto:${esc(person.email)}">${esc(person.email)}</a>
     <ul class="book-links">
       ${contact.links
         .map(
           (link) => `<li><a href="${esc(link.href)}" ${link.href.startsWith('http') || link.href.endsWith('.html') ? 'target="_blank" rel="noopener noreferrer"' : ''}><span>${esc(link.label)}</span><span>${esc(link.value)}</span><span aria-hidden="true">↗</span></a></li>`,
         )
         .join('')}
     </ul>`,
  ),
];

const PANELS = {
  projects: () => `
    <div class="section">
      <header class="section-head">
        <p class="section-kicker">01 — Selected work</p>
        <h2 class="section-title" id="panelTitle">Things I built</h2>
        <p class="section-lede">Three builds that taught me the most, and a lab of small experiments that keep the fundamentals sharp.</p>
      </header>
      <button class="surface-back" type="button" data-project-back hidden>← All projects</button>
      <div class="project-list">
        ${projects
          .map(
            (project, i) => `
          <article class="project" tabindex="0" role="button" aria-expanded="false">
            <div class="project-top">
              <span class="project-index">${pad(i + 1)}</span>
              <div class="project-head">
                <h3 class="project-name">${esc(project.name)}</h3>
                <p class="project-meta">${esc(project.kind)} · ${esc(project.year)}</p>
              </div>
            </div>
            <div class="project-screen" aria-hidden="true"><b>${pad(i + 1)}</b><span>${esc(project.kind)}</span></div>
            <p class="project-summary">${esc(project.summary)}</p>
            <p class="project-detail">${esc(project.detail)}</p>
            <dl class="project-notes">
              ${project.notes.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}
            </dl>
            <div class="project-foot">
              <div class="chips">${project.stack.map((item) => `<span class="chip">${esc(item)}</span>`).join('')}</div>
              <a class="link-arrow" href="${esc(project.href)}" target="_blank" rel="noopener noreferrer">
                ${esc(project.cta)} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>`,
          )
          .join('')}
      </div>
      <section class="panel-section">
        <h3 class="section-sub">Mini lab <span class="sub-count">06</span></h3>
        <div class="exp-grid">
          ${experiments
            .map(
              (item) => `
            <a class="exp" href="${esc(item.href)}" target="_blank" rel="noopener noreferrer">
              <span class="exp-name">${esc(item.name)}</span>
              <span class="exp-meta">${esc(item.stack)}</span>
              <span class="exp-arrow" aria-hidden="true">↗</span>
            </a>`,
            )
            .join('')}
        </div>
      </section>
      <p class="section-note">Every experiment is a single HTML file — no build step, no dependencies.</p>
    </div>`,

  experience: () => `
    <div class="inspect">
      <button class="inspect-close" type="button" data-close-inspector><span aria-hidden="true">←</span> Clip it back</button>
      <div class="inspect-left">
        <p class="inspect-kicker">02 — Picked up from the hook</p>
        <div class="inspect-stage">
          <div class="inspect-card" id="idCard" role="button" tabindex="0" aria-pressed="false" aria-label="Turn the ID card over">
            <div class="inspect-face inspect-front">
              <div class="inspect-band"><span>STUDIO PASS</span><span>KR / 01</span></div>
              <div class="inspect-photo" aria-hidden="true">KR</div>
              <div class="inspect-id">
                <p class="inspect-kicker">Name</p>
                <h3>${esc(person.first)}<br />${esc(person.last)}</h3>
                <p>${esc(person.role)}</p>
              </div>
              <div class="inspect-foot">
                <span class="barcode" aria-hidden="true"></span>
                <span>KR-2026-001</span>
              </div>
            </div>
            <div class="inspect-face inspect-back">
              <div class="inspect-band inspect-band--paper"><span>If found, please return</span><span>02 / 02</span></div>
              <h4>${esc(person.email)}</h4>
              <ul>
                <li>India · open to remote</li>
                <li>github.com/Koushik-raju</li>
                <li>linkedin.com/in/koushik-raju</li>
                <li>${esc(person.availability)}</li>
              </ul>
              <div class="inspect-sign" aria-hidden="true">K</div>
              <p class="inspect-tip">Turn the card back to see the front.</p>
            </div>
          </div>
        </div>
        <div class="inspect-card-actions">
          <button class="inspect-turn" type="button" data-id-flip>Turn the card <span aria-hidden="true">⟲</span></button>
          <span>or press Enter on the card</span>
        </div>
        <p class="inspect-room-note">The badge hangs by the workstation — drag it in the room to hear the clip swing.</p>
      </div>

      <div class="inspect-file">
        <p class="section-kicker">Personnel file</p>
        <h2 class="inspect-name" id="panelTitle">${esc(person.first)} ${esc(person.last)}</h2>
        <p class="inspect-role">${esc(person.role)}</p>
        <p class="inspect-intro">${esc(person.intro)}</p>

        <dl class="inspect-facts">
          ${about.facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}
        </dl>

        <h3 class="section-sub">The record</h3>
        <ol class="inspect-roles">
          ${experience
            .map(
              (item) => `
          <li>
            <span class="inspect-period">${esc(item.period)}</span>
            <div>
              <h4>${esc(item.role)}</h4>
              <p class="inspect-org">${esc(item.org)} · ${esc(item.meta)}</p>
              <ul>${item.points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>
            </div>
          </li>`,
            )
            .join('')}
        </ol>

        <h3 class="section-sub">Reach</h3>
        <ul class="inspect-links">
          ${contact.links
            .map(
              (link) => `
          <li>
            <a href="${esc(link.href)}" ${link.href.startsWith('http') || link.href.endsWith('.html') ? 'target="_blank" rel="noopener noreferrer"' : ''}>
              <span>${esc(link.label)}</span>
              <span>${esc(link.value)}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </li>`,
            )
            .join('')}
        </ul>

        <div class="inspect-actions">
          <a class="btn btn--amber" href="mailto:${esc(person.email)}">Write to me <span aria-hidden="true">↗</span></a>
          <button class="btn btn--ghost" type="button" data-close-inspector>Clip it back</button>
        </div>
      </div>
    </div>`,

  about: () => `
    <div class="book" data-book>
      <header class="book-bar">
        <p class="book-mark">A working <em>notebook</em></p>
        <p class="book-edition">${esc(person.first)} ${esc(person.last)} · first edition · 2026</p>
        <span class="book-count"><b data-book-current>01</b> / ${pad(BOOK_SHEETS.length)}</span>
        <button class="book-close" type="button" data-close-book><span aria-hidden="true">←</span> Close the book</button>
      </header>

      <div class="book-stage">
        <div class="book-spread" data-book-spread>
          <div class="book-page book-page--left" data-book-left></div>
          <div class="book-page book-page--right" data-book-right></div>
          <div class="book-source" data-book-source hidden>${BOOK_SHEETS.join('')}</div>
          <div class="book-turn" data-book-turn aria-hidden="true">
            <div class="book-turn-face book-page" data-book-turn-face></div>
            <div class="book-turn-back book-page" data-book-turn-back></div>
          </div>
        </div>
      </div>

      <footer class="book-foot">
        <button class="book-step" type="button" data-book-prev><span aria-hidden="true">←</span> Previous</button>
        <nav class="book-toc" aria-label="Chapters">
          ${BOOK_CHAPTERS.map(([number, title], i) => `<button type="button" data-book-jump="${i}" class="${i === 0 ? 'is-current' : ''}" aria-label="Chapter ${number}: ${esc(title)}">${number}</button>`).join('')}
        </nav>
        <button class="book-step" type="button" data-book-next>Next <span aria-hidden="true">→</span></button>
      </footer>
      <p class="book-hint" aria-hidden="true">Use ← → or click the page edge to turn</p>
    </div>`,

  contact: () => `
    <div class="section">
      <header class="section-head">
        <p class="section-kicker">04 — Say hello</p>
        <h2 class="section-title" id="panelTitle">Contact</h2>
        <p class="section-lede">${esc(contact.headline)}</p>
      </header>
      <div class="project-list">
        <article class="project">
          <div class="project-top">
            <span class="project-index">01</span>
            <div class="project-head">
              <h3 class="project-name">Email</h3>
              <p class="project-meta">The fastest way — I reply to everything</p>
            </div>
          </div>
          <a class="contact-mail" href="mailto:${esc(person.email)}">${esc(person.email)}</a>
          <p class="project-summary">${esc(contact.note)}</p>
          <div class="project-foot">
            <a class="btn btn--amber" href="mailto:${esc(person.email)}">Write an email <span aria-hidden="true">↗</span></a>
            <button class="btn btn--ghost" type="button" data-copy="${esc(person.email)}">Copy address</button>
          </div>
        </article>
        <article class="project">
          <div class="project-top">
            <span class="project-index">02</span>
            <div class="project-head">
              <h3 class="project-name">Elsewhere</h3>
              <p class="project-meta">Code, notes, the odd post</p>
            </div>
          </div>
          <ul class="contact-links">
            ${contact.links
              .map(
                (link) => `
              <li>
                <a href="${esc(link.href)}" ${link.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                  <span>${esc(link.label)}</span>
                  <span>${esc(link.value)}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>`,
              )
              .join('')}
          </ul>
        </article>
        <article class="project">
          <div class="project-top">
            <span class="project-index">03</span>
            <div class="project-head">
              <h3 class="project-name">Availability</h3>
              <p class="project-meta">Front-end, QA and testing</p>
            </div>
          </div>
          <p class="project-summary"><span class="contact-open">● ${esc(person.availability)}</span></p>
          <div class="chips">
            <span class="chip">India</span>
            <span class="chip">Open to remote</span>
            <span class="chip">2026</span>
          </div>
        </article>
      </div>
    </div>`,
};

/* ---------------------------------- loader --------------------------------- */

function runLoader(done) {
  const steps = reduceMotion
    ? [[40, 100, 'studio ready', 'ready']]
    : [
        [120, 12, 'three.js resolved · r169 (local)', 'resolving modules'],
        [420, 30, 'room geometry compiled', 'building the room'],
        [720, 48, 'textures painted · no image files', 'painting light'],
        [1000, 66, 'screens online · editor + workspace', 'wiring the desk'],
        [1260, 82, 'sections staged · 01 → 04', 'staging sections'],
        [1520, 94, 'camera rig calibrated', 'calibrating'],
        [1740, 100, 'studio ready', 'ready'],
      ];

  steps.forEach(([delay, percent, log, status]) => {
    window.setTimeout(() => {
      els.loaderFill.style.width = `${percent}%`;
      els.loaderPct.textContent = `${percent}%`;
      els.loaderStatus.textContent = status;
      if (log) {
        const li = document.createElement('li');
        li.innerHTML = `<span>✓</span>${esc(log)}`;
        els.loaderLog.appendChild(li);
        requestAnimationFrame(() => li.classList.add('is-in'));
        while (els.loaderLog.children.length > 4) els.loaderLog.removeChild(els.loaderLog.firstChild);
      }
      if (percent === 100) {
        state.booted = true;
        els.loader.classList.add('is-done');
        document.body.classList.add('is-ready');
        document.body.classList.remove('is-loading');
        done();
        window.setTimeout(() => {
          els.loader.style.display = 'none';
        }, 1200);
      }
    }, delay);
  });
}

/* ---------------------------------- audio ---------------------------------- */

let audio = null;

function makeAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  [55, 82.5, 110].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = i === 0 ? 0.5 : 0.22;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    osc.connect(gain).connect(filter).connect(master);
    osc.start();  });

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.4;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 780;
  band.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;
  noise.connect(band).connect(noiseGain).connect(master);
  noise.start();

  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.4);
  return { ctx, master };
}

function toggleSound() {
  if (!audio) audio = makeAudio();
  if (!audio) return;
  const on = els.soundBtn.getAttribute('aria-pressed') !== 'true';
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  const now = audio.ctx.currentTime;
  audio.master.gain.cancelScheduledValues(now);
  audio.master.gain.linearRampToValueAtTime(on ? 0.5 : 0, now + (on ? 1.2 : 0.5));
  els.soundBtn.setAttribute('aria-pressed', String(on));
  els.soundText.textContent = on ? 'Sound on' : 'Sound off';
}

function ping(freq = 620, volume = 0.05) {
  if (!audio || audio.ctx.state !== 'running' || els.soundBtn.getAttribute('aria-pressed') !== 'true') return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + 0.65);
}

/* ---------------------------------- toast ---------------------------------- */

let toastTimer = 0;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove('is-on'), 2200);
}

/* ------------------------------- panel control ------------------------------ */

function wirePanel() {
  els.panelScroll.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(value);
        showToast('Email copied');
      } catch {
        showToast('Copy blocked — select it manually');
      }
    });
  });

  wireProjectWindows();
  wireInspector();
  wireReader();
  wireBook();
}

function wireProjectWindows() {
  const list = els.panelScroll.querySelector('.project-list');
  if (!list) return;
  const back = els.panelScroll.querySelector('[data-project-back]');
  const cards = [...list.querySelectorAll('.project')];

  const reset = () => {
    list.classList.remove('has-active');
    cards.forEach((card) => {
      card.classList.remove('is-active');
      card.setAttribute('aria-expanded', 'false');
    });
    if (back) back.hidden = true;
  };

  const open = (card) => {
    if (card.classList.contains('is-active')) return;
    list.classList.add('has-active');
    cards.forEach((item) => {
      const active = item === card;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-expanded', active ? 'true' : 'false');
    });
    if (back) {
      back.hidden = false;
      back.focus({ preventScroll: true });
    }
    els.panelScroll.scrollTo({ top: 0, behavior: 'smooth' });
  };

  cards.forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      open(card);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(card);
      }
    });
  });

  back?.addEventListener('click', reset);
}

/* ------------------------------ the badge view ----------------------------- */

// The big card in the inspector keeps the turn-over the hanging card had. The
// physical swinging happens on the badge in the room.
function wireInspector() {
  const card = els.panelScroll.querySelector('#idCard');
  if (!card) return;
  const setFlipped = (value) => {
    card.classList.toggle('is-flipped', value);
    card.setAttribute('aria-pressed', String(value));
  };
  card.addEventListener('click', () => setFlipped(!card.classList.contains('is-flipped')));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFlipped(!card.classList.contains('is-flipped'));
    }
  });
  els.panelScroll.querySelector('[data-id-flip]')?.addEventListener('click', () => {
    setFlipped(!card.classList.contains('is-flipped'));
  });
  els.panelScroll.querySelector('[data-close-inspector]')?.addEventListener('click', () => closeSection());
}

/* ------------------------------ the notebook ------------------------------- */

function wireReader() {
  const scroller = els.panelScroll;
  const chapters = [...scroller.querySelectorAll('[data-reader-chapter]')];
  const buttons = [...scroller.querySelectorAll('[data-chapter]')];
  if (!chapters.length || !buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = scroller.querySelector(`#${button.dataset.chapter}`);
      if (!target) return;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  scroller.querySelectorAll('[data-close-reader]').forEach((button) => {
    button.addEventListener('click', () => closeSection());
  });

  updateReaderScroll();
}

function updateReaderScroll() {
  if (state.section !== 'about') return;
  const scroller = els.panelScroll;
  const bar = scroller.querySelector('[data-reader-progress]');
  const chapters = [...scroller.querySelectorAll('[data-reader-chapter]')];
  const buttons = [...scroller.querySelectorAll('[data-chapter]')];
  if (!bar || !chapters.length) return;
  const max = scroller.scrollHeight - scroller.clientHeight;
  bar.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0})`;

  const mark = scroller.getBoundingClientRect().top + Math.min(180, scroller.clientHeight * 0.28);
  let current = chapters[0];
  chapters.forEach((chapter) => {
    if (chapter.getBoundingClientRect().top <= mark) current = chapter;
  });
  buttons.forEach((button) => button.classList.toggle('is-current', button.dataset.chapter === current.id));
}

function applyView(name) {
  const view = VIEWS[name] || VIEWS.home;
  const compact = isCompact() ? view.compact : null;
  goal.target.set(...(compact ? compact.target : view.target));
  goal.bias.set(...(view.bias || [0, 0, 0]));
  goal.radius = (compact ? compact.radius : view.radius) * (isCompact() && !compact ? 1.12 : 1);
  goal.fov = compact ? compact.fov : isCompact() ? Math.min(view.fov + 8, 58) : view.fov;
  goal.theta = compact ? compact.theta : view.theta;
  goal.phi = compact ? compact.phi : view.phi;
  orbitGoal.theta = 0;
  orbitGoal.phi = 0;
}

/* --------------------------- in-world screen ------------------------------ */

// Once the room exists, aim each section camera at the centre of its screen
// and match the surface normal, so the projected HTML sits dead flat on it.
function alignViewsToScreens() {
  if (!room?.screens) return;
  const q = new THREE.Quaternion();
  const normal = new THREE.Vector3();
  const centre = new THREE.Vector3();
  Object.entries(room.screens).forEach(([id, mesh]) => {
    const view = VIEWS[id];
    if (!view) return;
    mesh.updateWorldMatrix(true, false);
    centre.setFromMatrixPosition(mesh.matrixWorld);
    q.setFromRotationMatrix(mesh.matrixWorld);
    normal.set(0, 0, 1).applyQuaternion(q).normalize();
    view.target = [centre.x, centre.y, centre.z];
    view.theta = Math.atan2(normal.x, normal.z);
    view.phi = Math.acos(Math.max(-1, Math.min(1, normal.y)));
    view.radius = SURFACE_RADIUS[id] || view.radius;
  });

  // Objects that are inspected up close rather than mapped as a screen.
  Object.entries(room.focusPoints || {}).forEach(([id, focus]) => {
    const view = VIEWS[id];
    if (!view) return;
    view.target = [focus.position.x, focus.position.y, focus.position.z];
    view.theta = Math.atan2(focus.normal.x, focus.normal.z);
    view.phi = Math.acos(Math.max(-1, Math.min(1, focus.normal.y)));
    view.radius = SURFACE_RADIUS[id] || view.radius;
  });
}

// Sections are read on the screen that owns them: the monitor for projects,
// the laptop lid for contact. The camera flies in close enough that the
// projected sheet fills the glass, which is what makes the type legible.
// Narrow viewports keep the full sheet, since a phone cannot frame a monitor.
const isMapped = () => !!state.section && SURFACE_SECTIONS.has(state.section) && window.innerWidth > 900;
const surfacePoint = new THREE.Vector3();
let surfaceW = -1;
let surfaceH = -1;
let surfaceLeft = -1;
let surfaceTop = -1;

function syncSurface() {
  const mapped = isMapped();
  els.panel.classList.toggle('is-surface', mapped);
  document.body.classList.toggle('surface-open', mapped);
  surfaceW = -1;
  surfaceH = -1;
  surfaceLeft = -1;
  surfaceTop = -1;
  if (!mapped) {
    ['left', 'top', 'width', 'height'].forEach((prop) => els.panel.style.removeProperty(prop));
  }
}

// Project the four corners of the screen quad and turn them into the CSS box
// the content should occupy. Called every frame; width/height only update when
// they actually move, so the content is not re-laid out for every pixel of drift.
function updateSurface() {
  if (!state.section || !SURFACE_SECTIONS.has(state.section)) return;
  // while the panel is still hidden, leave it alone: the camera is in flight
  // and re-laying the content out every frame would cost more than it shows
  if (!els.panel.classList.contains('open')) return;
  // self-heal if a resize slipped past the listener (or the viewport crossed
  // the mobile breakpoint while the tab was in the background)
  const mapped = isMapped();
  if (mapped !== els.panel.classList.contains('is-surface')) syncSurface();
  if (!mapped) return;
  if (!camera || !room?.screens) return;
  const mesh = room.screens[state.section];
  if (!mesh) return;
  const [w, h] = mesh.userData.size;
  mesh.updateWorldMatrix(true, false);
  const corners = [
    [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2],
  ].map(([x, y]) => {
    surfacePoint.set(x, y, 0).applyMatrix4(mesh.matrixWorld).project(camera);
    return {
      x: (surfacePoint.x * 0.5 + 0.5) * window.innerWidth,
      y: (-surfacePoint.y * 0.5 + 0.5) * window.innerHeight,
    };
  });
  const [tl, tr, br, bl] = corners;
  const left = (tl.x + bl.x) / 2;
  const right = (tr.x + br.x) / 2;
  const top = (tl.y + tr.y) / 2;
  const bottom = (bl.y + br.y) / 2;
  const width = right - left;
  const height = bottom - top;
  if (!(width > 40 && height > 40)) return;
  const style = els.panel.style;
  // round to whole pixels and only write when the box really moved, so the
  // browser is not asked to re-lay the panel out every frame
  if (Math.abs(left - surfaceLeft) > 0.5 || Math.abs(top - surfaceTop) > 0.5) {
    style.left = `${Math.round(left)}px`;
    style.top = `${Math.round(top)}px`;
    surfaceLeft = left;
    surfaceTop = top;
  }
  if (Math.abs(width - surfaceW) > 1 || Math.abs(height - surfaceH) > 1) {
    style.width = `${Math.round(width)}px`;
    style.height = `${Math.round(height)}px`;
    surfaceW = width;
    surfaceH = height;
  }
}

function updateDock() {
  const buttons = [...els.dock.querySelectorAll('button')];
  buttons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.go === state.section);
  });
  const active = buttons.find((button) => button.classList.contains('is-active'));
  if (!active) {
    els.dock.classList.remove('has-active');
    return;
  }
  els.dock.classList.add('has-active');
  els.dockPill.style.width = `${active.offsetWidth}px`;
  els.dockPill.style.transform = `translateX(${active.offsetLeft - 6}px)`;
}

/* ------------------------------ object views ------------------------------ */

// Experience and certifications are read in the room: the camera moves to the
// object and the HTML layer only offers a small control card, never a page.
let bookTurn = null;
let focusedCard = null;

// The card is 0.27 x 0.39 in the room. Frame the whole card with air around
// it; pushing the camera in until the print touches the edges reads as a crop.
const CARD_SIZE = { w: 0.27, h: 0.39 };
function fitCardRadius(fov = 42) {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const tan = Math.tan((fov * Math.PI) / 360);
  const byHeight = CARD_SIZE.h / (2 * tan * 0.74);
  const byWidth = CARD_SIZE.w / (2 * tan * aspect * 0.8);
  return Math.max(byHeight, byWidth);
}

function aimAtCard(index) {
  const point = room?.cardPoints?.[index];
  if (!point) return false;
  goal.target.set(point.x, point.y, point.z);
  goal.radius = fitCardRadius(42);
  goal.fov = 42;
  goal.theta = 0;
  goal.phi = Math.PI / 2;
  return true;
}

function enterObjectView(id) {
  window.clearTimeout(openTimer);
  if (els.certNav) els.certNav.hidden = true;
  els.panel.classList.remove('open');
  els.panel.classList.remove('is-surface', 'is-reader', 'is-inspector', 'is-book');
  els.panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('panel-open', 'surface-open');
  document.body.classList.add('object-focus');
  ['left', 'top', 'width', 'height'].forEach((prop) => els.panel.style.removeProperty(prop));
  state.section = id;
  applyView(id);
  updateDock();
  if (history.replaceState) history.replaceState(null, '', `#${id}`);
  if (renderer) renderer.shadowMap.needsUpdate = true;
}

function closeObjectView({ silent = false } = {}) {
  window.clearTimeout(openTimer);
  if (els.certNav) els.certNav.hidden = true;
  state.section = null;
  focusedCard = null;
  document.body.classList.remove('object-focus');
  if (window.__room) window.__room.setCertFocus(false);
  applyView('home');
  updateDock();
  if (renderer) renderer.shadowMap.needsUpdate = true;
  if (history.replaceState) history.replaceState(null, '', window.location.pathname);
  if (!silent) ping(420, 0.03);
}

function focusRack(index) {
  if (!room) return;
  const wasHere = state.section === 'experience';
  enterObjectView('experience');
  room.setCertFocus(false);
  focusedCard = typeof index === 'number' ? index : null;
  if (typeof index === 'number') {
    aimAtCard(index);
    const flipped = room.flipCard(index);
    ping(flipped ? 700 : 520, 0.04);
  } else if (!wasHere) {
    ping(560, 0.045);
  }
}

function focusCertificates(index) {
  if (!room) return;
  enterObjectView('certifications');
  const total = Math.min(certifications.length, room.certCards?.length || certifications.length);
  const next = typeof index === 'number' ? index : room.getCertSelected();
  room.setCertFocus(true, Math.max(0, Math.min(total - 1, next)));
  if (els.certNav) els.certNav.hidden = false;
  paintCertNav();
  ping(720, 0.04);
}

// The certificate wall is navigated in the room, so it needs a small control
// card of its own: the frames themselves are small targets across the room.
function paintCertNav() {
  if (!room || !els.certCount) return;
  const total = Math.min(certifications.length, room.certCards?.length || certifications.length);
  const index = Math.max(0, Math.min(total - 1, room.getCertSelected()));
  els.certCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
}

function stepCertificates(dir) {
  if (state.section !== 'certifications' || !room) return;
  const total = Math.min(certifications.length, room.certCards?.length || certifications.length);
  if (!total) return;
  const next = ((room.getCertSelected() + dir) % total + total) % total;
  room.focusCert(next);
  paintCertNav();
  ping(620, 0.035);
}

/* -------------------------------- the book -------------------------------- */

function wireBook() {
  const book = els.panelScroll.querySelector('[data-book]');
  if (!book) {
    bookTurn = null;
    return;
  }
  const source = book.querySelector('[data-book-source]');
  const sheets = [...source.querySelectorAll('[data-book-sheet]')];
  const pages = sheets.map((sheet) => ({
    left: sheet.querySelector('.book-page--left').innerHTML,
    right: sheet.querySelector('.book-page--right').innerHTML,
  }));
  const leftPage = book.querySelector('[data-book-left]');
  const rightPage = book.querySelector('[data-book-right]');
  const turnFace = book.querySelector('[data-book-turn-face]');
  const turnBack = book.querySelector('[data-book-turn-back]');
  const counter = book.querySelector('[data-book-current]');
  const dots = [...book.querySelectorAll('[data-book-jump]')];
  const instant = reduceMotion || window.matchMedia('(max-width: 820px)').matches;
  const count = pages.length;
  let index = 0;
  let turning = false;
  let timer = 0;

  const paintMeta = () => {
    dots.forEach((dot, i) => dot.classList.toggle('is-current', i === index));
    if (counter) counter.textContent = pad(index + 1);
  };

  const show = (next) => {
    index = next;
    leftPage.innerHTML = pages[index].left;
    rightPage.innerHTML = pages[index].right;
    paintMeta();
  };

  const go = (delta) => {
    if (!count || turning || !delta) return;
    const target = (index + delta + count) % count;
    if (target === index) return;
    if (instant || Math.abs(delta) !== 1) {
      show(target);
      return;
    }
    turning = true;
    const dir = delta > 0 ? 1 : -1;

    // The leaf is already filled before it moves, and the page underneath
    // changes at the same moment, so the turn never shows a blank side.
    if (dir > 0) {
      turnFace.innerHTML = pages[index].right;
      turnBack.innerHTML = pages[target].left;
      rightPage.innerHTML = pages[target].right;
    } else {
      turnFace.innerHTML = pages[index].left;
      turnBack.innerHTML = pages[target].right;
      leftPage.innerHTML = pages[target].left;
    }

    book.classList.toggle('is-back', dir < 0);
    book.classList.add('is-turning');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      index = target;
      if (dir > 0) leftPage.innerHTML = pages[target].left;
      else rightPage.innerHTML = pages[target].right;
      paintMeta();
      book.classList.remove('is-turning', 'is-back');
      turning = false;
    }, 640);
  };

  bookTurn = go;
  book.querySelector('[data-book-next]')?.addEventListener('click', () => go(1));
  book.querySelector('[data-book-prev]')?.addEventListener('click', () => go(-1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i - index)));
  book.querySelectorAll('[data-close-book]').forEach((button) => button.addEventListener('click', () => closeSection()));

  const stage = book.querySelector('.book-spread');
  stage?.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) return;
    if (window.matchMedia('(max-width: 820px)').matches) return;
    const rect = stage.getBoundingClientRect();
    go(event.clientX > rect.left + rect.width / 2 ? 1 : -1);
  });

  show(0);
}

function openSection(id, { silent = false } = {}) {
  // experience lives on the hanging cards, never in a page
  if (id === 'experience' && renderer) {
    focusRack();
    return;
  }
  if (!SECTIONS[id]) return;
  if (state.section === id) return;
  document.body.classList.remove('object-focus');
  state.section = id;
  els.panel.dataset.section = id;
  if (els.certNav) els.certNav.hidden = true;
  els.panelScroll.innerHTML = PANELS[id]();
  els.panelPath.textContent = SECTIONS[id].path;
  els.panelCount.textContent = `${SECTIONS[id].index} / 04`;
  els.panel.setAttribute('aria-labelledby', 'panelTitle');
  els.panel.removeAttribute('aria-label');
  els.panel.classList.toggle('is-book', id === 'about');
  els.panel.classList.toggle('is-reader', false);
  els.panel.classList.toggle('is-inspector', id === 'experience');
  els.panelScroll.scrollTop = 0;
  syncSurface();
  window.clearTimeout(openTimer);
  const reveal = () => {
    if (state.section !== id) return;
    els.panel.classList.add('open');
    updateSurface();
    if (id === 'about') updateReaderScroll();
    const focusTarget = id === 'about'
      ? els.panelScroll.querySelector('[data-close-book]')
      : id === 'experience'
        ? els.panelScroll.querySelector('[data-id-flip]')
        : els.panelClose;
    window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 240);
  };
  // the object sections get a beat for the badge to straighten or the book to
  // lift before the paper comes over the room
  const delay = OBJECT_SECTIONS.has(id) ? (window.innerWidth > 900 ? (id === 'about' ? 900 : 620) : 240) : isMapped() ? 420 : 0;
  if (delay) openTimer = window.setTimeout(reveal, delay);
  else reveal();
  els.panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('panel-open');
  applyView(id);
  updateDock();
  wirePanel();
  if (renderer) renderer.shadowMap.needsUpdate = true;
  if (window.__room) {
    window.__room.setScreenMode(id === 'projects' ? 'projects' : 'home');
    window.__room.setBookOpen(id === 'about');
  }
  if (history.replaceState) history.replaceState(null, '', `#${id}`);
  if (!silent) ping(id === 'contact' ? 740 : 560, 0.045);
}

function closeSection({ silent = false } = {}) {
  if (els.certNav) els.certNav.hidden = true;
  if (!state.section) return;
  if (state.section === 'experience' || state.section === 'certifications') {
    closeObjectView({ silent });
    return;
  }
  window.clearTimeout(openTimer);
  state.section = null;
  els.panel.classList.remove('open');
  // never hide the panel while focus is still inside it
  const focusWasInside = els.panel.contains(document.activeElement);
  if (focusWasInside) document.activeElement.blur();
  els.panel.setAttribute('aria-hidden', 'true');
  if (focusWasInside) {
    window.setTimeout(() => document.querySelector('.brand')?.focus({ preventScroll: true }), 0);
  }
  document.body.classList.remove('panel-open');
  if (window.__room) {
    window.__room.setScreenMode('home');
    window.__room.setBookOpen(false);
    window.__room.setCardHold(false);
  }
  applyView('home');
  updateDock();
  if (renderer) renderer.shadowMap.needsUpdate = true;
  if (history.replaceState) history.replaceState(null, '', window.location.pathname);
  if (!silent) ping(420, 0.03);
  // let the screen fade out where it is, then hand the panel back to the
  // default full-screen presentation for small viewports
  window.setTimeout(() => {
    if (state.section) return;
    els.panel.classList.remove('is-surface');
    els.panel.classList.remove('is-reader');
    els.panel.classList.remove('is-book');
    els.panel.classList.remove('is-inspector');
    document.body.classList.remove('surface-open');
    surfaceW = -1;
    surfaceH = -1;
    surfaceLeft = -1;
    surfaceTop = -1;
    ['left', 'top', 'width', 'height'].forEach((prop) => els.panel.style.removeProperty(prop));
  }, 620);
}

/* ---------------------------------- 3D boot -------------------------------- */

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

const scene = new THREE.Scene();
let camera = null;
let renderer = null;
let composer = null;
let bloom = null;
let lowFx = false;
let perfAcc = 0;
let perfFrames = 0;
let room = null;
let raycaster = null;
const clock = new THREE.Clock();

function init3D() {
  if (!supportsWebGL()) return false;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: els.canvas,
      // the scene is drawn into the composer's own target, so multisampling on
      // the canvas never shows; it only costs memory bandwidth
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return false;
  }

  // Integrated and software GPUs cannot carry the bloom pass and ten lights at
  // a usable frame rate: skip the composer for them from the first frame
  // instead of waiting for the adaptive loop to notice.
  if (weakGpu(renderer)) useLowFx();

  applyResolution(startRenderRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // the room is static: render its shadows once, then only when an object
  // section opens or closes, instead of re-rendering the depth maps every frame
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  camera = new THREE.PerspectiveCamera(rig.fov, window.innerWidth / window.innerHeight, 0.1, 60);
  camera.position.set(2.0, 2.97, 7.05);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.14;

  room = buildRoom(renderer);
  scene.add(room.scene);
  alignViewsToScreens();

  if (!lowFx) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth * 0.42, window.innerHeight * 0.42),
      isCompact() ? 0.18 : 0.22,
      0.62,
      0.94,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  raycaster = new THREE.Raycaster();
  window.__room = room;
  document.fonts?.ready.then(() => room.redraw());
  return true;
}

function updateCamera(dt, t) {
  const ease = 1 - Math.exp(-dt * 2.2);
  rig.target.lerp(goal.target, ease);
  rig.bias.lerp(goal.bias, ease);
  rig.radius += (goal.radius - rig.radius) * ease;
  rig.theta += (goal.theta - rig.theta) * ease;
  rig.phi += (goal.phi - rig.phi) * ease;
  rig.fov += (goal.fov - rig.fov) * ease;

  const orbitEase = 1 - Math.exp(-dt * 9);
  orbit.theta += (orbitGoal.theta - orbit.theta) * orbitEase;
  orbit.phi += (orbitGoal.phi - orbit.phi) * orbitEase;

  const pointerEase = 1 - Math.exp(-dt * 3.5);
  const edge = state.section ? 0 : 1;
  parallax.x += (pointer.nx * edge - parallax.x) * pointerEase;
  parallax.y += (pointer.ny * edge - parallax.y) * pointerEase;

  // the camera never sits perfectly still: a slow drift holds the eye, and a
  // shallow breath on the dolly keeps the frame from reading as a still
  const still = reduceMotion || !!state.section;
  const idle = still ? 0 : Math.sin(t * 0.16) * 0.02;
  const breath = still ? 0 : Math.sin(t * 0.21) * 0.045;
  const theta = rig.theta + orbit.theta + idle + parallax.x * 0.028;
  const phi = THREE.MathUtils.clamp(rig.phi + orbit.phi + parallax.y * 0.018, 0.7, 2.15);
  const radius = rig.radius + breath;

  camera.position.set(
    rig.target.x + radius * Math.sin(phi) * Math.sin(theta),
    rig.target.y + radius * Math.cos(phi),
    rig.target.z + radius * Math.sin(phi) * Math.cos(theta),
  );

  camera.lookAt(lookTarget.copy(rig.target).add(rig.bias));

  const aspect = window.innerWidth / window.innerHeight;
  if (Math.abs(camera.aspect - aspect) > 0.0001) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  if (Math.abs(camera.fov - rig.fov) > 0.01) {
    camera.fov = rig.fov;
    camera.updateProjectionMatrix();
  }
}

let lastMarkerUpdate = 0;
const projected = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function updateMarkers(t) {
  if (!room || !state.booted || t - lastMarkerUpdate < 0.033) return;
  lastMarkerUpdate = t;
  const hide = !!state.section;
  room.hotspots.forEach((hotspot) => {
    const marker = hotspot.marker;
    if (!marker) return;
    if (hotspot.anchorObject) hotspot.anchorObject.getWorldPosition(projected);
    else projected.copy(hotspot.anchor);
    projected.project(camera);
    const inFront = projected.z < 1;
    const onScreen = Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.15;
    const visible = inFront && onScreen && !hide;
    if (visible) {
      marker.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
      marker.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
    marker.classList.toggle('is-visible', visible);
  });
}

function buildMarkers() {
  if (!room) return;
  room.hotspots.forEach((hotspot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker';
    button.dataset.section = hotspot.id;
    const index = SECTIONS[hotspot.id]?.index || (hotspot.id === 'certifications' ? '05' : '');
    button.innerHTML = `<i aria-hidden="true"></i><span class="m-num">${index}</span><span class="m-label">${esc(hotspot.label)}</span>`;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (hotspot.id === 'experience') focusRack();
      else if (hotspot.id === 'certifications') focusCertificates();
      else openSection(hotspot.id);
    });
    button.addEventListener('mouseenter', () => {
      state.hovered = hotspot.id;
      hoverCursor(hotspot.label);
      room.hotspots.forEach((h) => h.marker?.classList.toggle('is-hot', h.id === hotspot.id));
    });
    button.addEventListener('mouseleave', () => {
      state.hovered = null;
      hoverCursor(null);
      button.classList.remove('is-hot');
    });
    els.markers.appendChild(button);
    hotspot.marker = button;
  });
}

/* ------------------------------- interactions ------------------------------ */

const drag = { x: 0, y: 0, moved: 0, active: false, id: null, press: null, card: false };
let lastHoverPick = 0;

function pickObject(clientX, clientY) {
  if (!raycaster || !room || !camera) return null;
  const ndc = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(room.pickables || [], false);
  return hits[0]?.object.userData ?? null;
}

function setHover(hit) {
  const key = hit ? `${hit.section}:${hit.card ?? hit.cert ?? ''}` : null;
  if (key === state.hovered) return;
  state.hovered = key;
  if (!room) return;
  let label = null;
  if (hit?.section) {
    if (typeof hit.card === 'number') label = `Turn the ${experience[hit.card]?.org || ''} card`;
    else if (typeof hit.cert === 'number') label = certifications[hit.cert]?.name || 'Certificate';
    else label = room.hotspots.find((hotspot) => hotspot.id === hit.section)?.label || null;
  }
  hoverCursor(label);
  room.hotspots.forEach((hotspot) => hotspot.marker?.classList.toggle('is-hot', hotspot.id === hit?.section));
}

function setNDC(clientX, clientY) {
  pointer.x = clientX;
  pointer.y = clientY;
  pointer.nx = (clientX / window.innerWidth) * 2 - 1;
  pointer.ny = (clientY / window.innerHeight) * 2 - 1;
}

function hoverCursor(label) {
  els.canvas.style.cursor = label ? 'pointer' : '';
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const objectView = state.section === 'experience' || state.section === 'certifications';
  if (state.section && !objectView) return;
  setNDC(event.clientX, event.clientY);
  drag.active = true;
  drag.id = event.pointerId;
  drag.x = event.clientX;
  drag.y = event.clientY;
  drag.moved = 0;
  const hit = pickObject(event.clientX, event.clientY);
  drag.press = hit;
  drag.card = typeof hit?.card === 'number' ? hit.card : -1;
  if (drag.card >= 0) room.beginCardDrag(event.clientX, drag.card);
  state.dragging = true;
  els.canvas.setPointerCapture?.(event.pointerId);
  document.body.classList.add('has-explored');
}

function onPointerMove(event) {
  setNDC(event.clientX, event.clientY);
  if (drag.active) {
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.card >= 0) {
      room.moveCardDrag(event.clientX);
      return;
    }
    if (state.section) return;
    orbitGoal.theta = THREE.MathUtils.clamp(orbitGoal.theta - dx * 0.0032, -0.62, 0.62);
    orbitGoal.phi = THREE.MathUtils.clamp(orbitGoal.phi - dy * 0.0022, -0.16, 0.16);
    return;
  }
  if (!room) return;
  if (state.section && state.section !== 'experience' && state.section !== 'certifications') return;
  // the pick is a raycast through a handful of boxes; 30 a second is plenty
  const now = performance.now();
  if (now - lastHoverPick < 32) return;
  lastHoverPick = now;
  setHover(pickObject(event.clientX, event.clientY));
}

function onPointerUp() {
  if (!drag.active) return;
  drag.active = false;
  state.dragging = false;
  els.canvas.releasePointerCapture?.(drag.id);
  if (drag.card >= 0) {
    room.endCardDrag();
    drag.card = -1;
  }

  const wasClick = drag.moved < 8;
  const target = drag.press;
  drag.press = null;
  if (wasClick && target) {
    if (typeof target.card === 'number') focusRack(target.card);
    else if (typeof target.cert === 'number') focusCertificates(target.cert);
    else if (target.section === 'experience') focusRack();
    else if (target.section === 'certifications') focusCertificates();
    else if (target.section) openSection(target.section);
  } else if (wasClick && !target && (state.section === 'experience' || state.section === 'certifications')) {
    closeSection();
  }
  setHover(pickObject(pointer.x, pointer.y));
}

/* ----------------------------------- boot ---------------------------------- */

function wireUI() {
  document.querySelectorAll('[data-go]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.go;
      if (state.section === id) closeSection();
      else openSection(id);
    });
  });

  document.querySelectorAll('[data-home]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      closeSection();
    });
  });

  els.panelClose.addEventListener('click', () => closeSection());
  els.scrim.addEventListener('click', () => closeSection());
  els.soundBtn.addEventListener('click', toggleSound);
  els.certNav?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cert-step]');
    if (!button) return;
    stepCertificates(Number(button.dataset.certStep));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSection();
      return;
    }
    if (event.key === '0') {
      closeSection();
      return;
    }
    if (state.section === 'certifications' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      const total = room?.certCards?.length || 0;
      if (total) {
        const next = (room.getCertSelected() + (event.key === 'ArrowRight' ? 1 : -1) + total) % total;
        room.focusCert(next);
        paintCertNav();
        ping(660, 0.035);
      }
      return;
    }
    if (state.section === 'about' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      bookTurn?.(event.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (['1', '2', '3', '4'].includes(event.key) && !event.metaKey && !event.ctrlKey) {
      const ids = ['projects', 'experience', 'about', 'contact'];
      const id = ids[Number(event.key) - 1];
      if (state.section === id) closeSection();
      else openSection(id);
    }
  });

  els.canvas.addEventListener('pointerdown', onPointerDown);
  els.canvas.addEventListener('pointermove', onPointerMove);
  els.canvas.addEventListener('pointerup', onPointerUp);
  els.canvas.addEventListener('pointercancel', onPointerUp);
  els.panelScroll.addEventListener('scroll', updateReaderScroll, { passive: true });
  els.canvas.addEventListener('pointerleave', () => {
    if (!drag.active) {
      state.hovered = null;
      hoverCursor(null);
    }
  });

  if (finePointer) {
    window.addEventListener('mousemove', (event) => setNDC(event.clientX, event.clientY));
  }

  window.addEventListener('resize', () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    applyResolution(resRatio || startRenderRatio());
    bloom && (bloom.strength = isCompact() ? 0.13 : 0.16);
    applyView(state.section || 'home');
    if (state.section === 'experience' && focusedCard !== null) aimAtCard(focusedCard);
    syncSurface();
    updateSurface();
    updateDock();
  });

  updateDock();
  document.fonts?.ready.then(updateDock);
}

function weakGpu(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '');
    return /intel|uhd graphics|hd graphics|swiftshader|llvmpipe|mali|adreno|powervr/i.test(name);
  } catch {
    return false;
  }
}

function useLowFx() {
  if (lowFx) return;
  lowFx = true;
  document.body.classList.add('is-lowfx');
  // Drop the bloom pass before the resolution: softness is more noticeable
  // than a missing glow.
  if (bloom) bloom.enabled = false;
  if (composer) composer = null;
}

function frame() {
  requestAnimationFrame(frame);
  if (!renderer || !camera) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  room.update(t, dt);
  updateCamera(dt, t);
  updateSurface();
  if (composer) composer.render();
  else renderer.render(scene, camera);

  // Dynamic resolution. Resolution is shed before effects, and only once it
  // is at native does the bloom pass go; it climbs again when frames are fast.
  if (document.visibilityState === 'visible') {
    perfAcc += Math.min(dt, 0.1);
    perfFrames += 1;
    if (perfFrames >= 30) {
      const avg = perfAcc / perfFrames;
      // back off quickly (each step reallocates the composer targets), climb
      // only when frames are comfortably fast
      if (avg > 0.026) {
        if (resRatio > 1.0) applyResolution(resRatio - 0.2);
        else if (!lowFx) useLowFx();
        else applyResolution(resRatio - 0.15);
      } else if (avg > 0.019) {
        if (resRatio > 1.0) applyResolution(resRatio - 0.1);
        else if (!lowFx) useLowFx();
      } else if (!lowFx && avg < 0.0125 && resRatio < maxRenderRatio() - 0.01) {
        applyResolution(resRatio + 0.1);
      }
      perfAcc = 0;
      perfFrames = 0;
    }
  }
  updateMarkers(t);
}

function start() {
  const ok = init3D();
  wireUI();

  if (ok) {
    buildMarkers();
    applyView('home');
    requestAnimationFrame(frame);
  } else {
    document.body.classList.add('no-webgl');
    els.flatNote.hidden = false;
    els.canvas.style.display = 'none';
    els.markers.style.display = 'none';
    if (els.dragHint) els.dragHint.style.display = 'none';
  }

  runLoader(() => {
    const hash = window.location.hash.replace('#', '');
    if (SECTIONS[hash]) window.setTimeout(() => openSection(hash, { silent: true }), 500);
    else if (hash === 'experience') window.setTimeout(() => focusRack(), 500);
    else if (hash === 'certifications') window.setTimeout(() => focusCertificates(), 500);
  });
}

start();
