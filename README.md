# Koushik Raju — 3D Room Portfolio

A single-page portfolio built as a room you can look around: a desk at dusk, a
city through the window, and the work itself on the monitor. No frameworks, no
build step, no image assets — the room and every texture are generated in the
browser, and Three.js is vendored locally.

## Run it

The site uses ES modules, so it needs to be served over HTTP (`file://` will be
blocked by the browser).

```bash
node serve.mjs
# → http://127.0.0.1:5173
```

Any static server works instead — for example `npx serve` — as long as the
folder is the web root. If the port is already taken, `PORT=5175 node serve.mjs`
starts it elsewhere.

## Controls

- **Drag** anywhere on the room to look around; the camera drifts back with a
  little inertia.
- **Move the pointer** for a gentle parallax over the room.
- **Click a numbered marker** in the room, the dock at the bottom, or press
  **1–4** to open Projects, Experience, About or Contact. Hit boxes sit on the
  object itself — the monitor, the badge, the notebook, the letter — so clicking
  a shelf or the certificate wall no longer opens the wrong thing.
- **Projects:** the monitor's HTML is projected straight onto its glass. Each
  project is a window on the monitor — click it to open the case, then use *All
  projects* to go back.
- **Experience:** a lit pegboard beside the desk holds one lanyard per role.
  Click a card and the camera moves in while the card turns over, showing that
  role’s dates and the full record on the card itself — nothing opens in a page.
  Click it again to turn it back, or drag it to swing it.
- **About:** the hardback notebook on the bookshelf lifts out, turns and opens,
  then becomes an open book with six chapters — the short version, the path
  here, the toolkit, selected work, off screen and contact. Turn the pages with
  the arrows, the chapter numbers or a click on the page edge.
- **Certifications:** click the frames on the wall (or the *05 Certifications*
  marker). The frames lift off the wall into an arc, and the chosen certificate
  floats forward; step through them with the arrows or open the full list.
- **Escape**, *Back to the room*, *Clip it back* or *Close the book* returns you
  to the room.
- **Sound** (top right) fades in a quiet generated room tone — there are no
  audio files. It is off until you ask for it.
- Deep links work: `/#projects`, `/#contact`, etc.

## Where to edit content

Everything the site says lives in **`data.js`** — name, role, projects,
experience, education, certifications, skills, about copy and contact links.
The 3D scene reads section anchors from this file, but you can change the words
without touching the scene.

The certificate wall draws the first six entries of `certifications`; the full
list lives in `Certification.html`, which is linked from the Experience and
Contact panels. The mini-games in the root folder are linked from Projects.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | page shell, loader, hero, dock, display |
| `style.css` | the whole design system, in-world screen styles and responsive rules |
| `main.js` | renderer, camera rig, screen projection, markers, panels, reader, sound, loader |
| `room/world.js` | room geometry, props, lights, the 3D badge/notebook and the screen anchors |
| `room/textures.js` | canvas textures (wood, plaster, rug, city, screens, posters, certificates, card, notebook) |
| `data.js` | portfolio content |
| `serve.mjs` | dependency-free static server |
| `vendor/three/` | Three.js r169 + the addons used (vendored, no CDN needed) |

## Notes

- **Content in the objects.** Projects and Contact are projected onto their
  physical surfaces: `main.js` projects the four corners of each screen anchor
  every frame, and the camera is aimed along the surface normal. The letter
  grows out of the envelope when Contact opens. Experience and About raise the
  actual object first, then open their reading surfaces full-screen.
- **Real objects.** The experience cards are geometry on a lit pegboard: a
  woven strap, a brass clip, and a plastic card with a printed front and back
  for each role. They hang as damped pendulums (`room/world.js`), can be dragged
  by the card, and turn over on click. The certificate frames are meshes too:
  they lift off the wall and fan into an arc. The notebook is a hardback with
  board covers, nine paper layers, a printed spine and cover; it lifts out of
  the shelf, turns, and its pages splay with a turning leaf. All of these
  animations and the drag physics stop for `prefers-reduced-motion`.
- **Every screen.** Type, spacing, panels, the reader and the badge all use
  fluid `clamp()` sizing, `dvh` heights and safe-area insets, so the site works
  from a folded 280px phone and short landscape crops up to ultrawide monitors.
  The reader turns its rail into a horizontal chapter strip on phones.
- **Performance.** Pixel ratio is capped at 1.35 (1.2 compact), bloom renders at
  half resolution, shadows are rendered once rather than every frame, and the
  screen canvas redraws at about 5 fps. If the first 60 frames average below
  ~38 fps the page drops bloom, the animated grain and its render scale to 0.8
  automatically. If a device cannot create a WebGL context, the page falls back
  to a readable flat layout instead of a blank canvas.
- **Accessibility.** Sections are reachable by keyboard: the project windows,
  the badge card and the chapter list respond to Enter and Space, the canvas has
  a label, and `prefers-reduced-motion` disables the intro, drift, physics and
  long transitions.
- **Fonts** are the only network dependency (Google Fonts: Space Grotesk,
  Instrument Serif, JetBrains Mono); the CSS falls back to system faces offline.
- **No personal data is invented.** The location is intentionally "India · open
  to remote" and the project years are approximate — edit `data.js` if you want
  them exact.
