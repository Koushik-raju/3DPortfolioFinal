// Builds the whole room procedurally: shell, furniture, props, lighting.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTextures, rnd, rand, MONO, SANS } from './textures.js';
import { experience } from '../data.js';

const TAU = Math.PI * 2;

function rounded(w, h, d, r = 0.02, seg = 2) {
  const safe = Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 0.002));
  return new RoundedBoxGeometry(w, h, d, seg, safe);
}

function add(parent, geo, mat, pos = [0, 0, 0], opts = {}) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  if (opts.rot) mesh.rotation.set(...opts.rot);
  mesh.castShadow = !!opts.cast;
  mesh.receiveShadow = !!opts.receive;
  parent.add(mesh);
  return mesh;
}

function box(parent, w, h, d, mat, pos, opts = {}) {
  return add(parent, rounded(w, h, d, opts.r ?? 0.02, opts.seg ?? 2), mat, pos, opts);
}

function cyl(parent, rt, rb, h, mat, pos, opts = {}) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, opts.segments ?? 24, 1, !!opts.open);
  return add(parent, geo, mat, pos, opts);
}

function plane(parent, w, h, mat, pos, opts = {}) {
  return add(parent, new THREE.PlaneGeometry(w, h), mat, pos, opts);
}

function tube(parent, points, radius, mat, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, opts.segments ?? 40, radius, 6, false);
  return add(parent, geo, mat, [0, 0, 0], opts);
}

export function buildRoom(renderer) {
  const T = createTextures(renderer, experience);
  const scene = new THREE.Scene();
  // daylight: a warm, hazy room instead of a night interior
  scene.background = new THREE.Color(0xcdd6d6);
  scene.fog = new THREE.FogExp2(0xcdd6d6, 0.015);

  const M = {
    floor: new THREE.MeshPhysicalMaterial({
      map: T.floor,
      color: 0xf0e2cb,
      // the plank grain doubles as relief, so the boards catch the light
      bumpMap: T.floor,
      bumpScale: 0.012,
      roughness: 0.56,
      metalness: 0.03,
      clearcoat: 0.14,
      clearcoatRoughness: 0.66,
      envMapIntensity: 0.55,
    }),
    wall: new THREE.MeshStandardMaterial({
      map: T.wall,
      bumpMap: T.wall,
      bumpScale: 0.005,
      roughness: 0.92,
      metalness: 0,
    }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xd2c8b7, roughness: 0.95 }),
    walnut: new THREE.MeshPhysicalMaterial({
      color: 0x4a3629,
      bumpMap: T.grain,
      bumpScale: 0.004,
      roughness: 0.54,
      clearcoat: 0.1,
      clearcoatRoughness: 0.6,
    }),
    walnutDark: new THREE.MeshStandardMaterial({
      color: 0x2b211b,
      bumpMap: T.grain,
      bumpScale: 0.003,
      roughness: 0.62,
    }),
    metal: new THREE.MeshStandardMaterial({ color: 0x15151a, metalness: 0.86, roughness: 0.42 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08a5e, metalness: 1, roughness: 0.36 }),
    leather: new THREE.MeshPhysicalMaterial({
      color: 0x5a4133,
      bumpMap: T.leather,
      bumpScale: 0.003,
      roughness: 0.6,
      sheen: 0.26,
      sheenColor: 0x9c7a5e,
      sheenRoughness: 0.66,
      clearcoat: 0.04,
      clearcoatRoughness: 0.55,
    }),
    leatherDark: new THREE.MeshStandardMaterial({ color: 0x3d2d24, roughness: 0.7 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xd8cfbf, roughness: 0.84 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe4dbc9, roughness: 0.9 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2e4035, roughness: 0.56, side: THREE.DoubleSide }),
    greenDark: new THREE.MeshStandardMaterial({ color: 0x1e2c24, roughness: 0.64, side: THREE.DoubleSide }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xc6bbae, roughness: 0.42 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0x8a5b46, roughness: 0.76 }),
    curtain: new THREE.MeshStandardMaterial({ color: 0xbdae97, roughness: 0.96, side: THREE.DoubleSide }),
    shade: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7, side: THREE.DoubleSide }),
    fabricShade: new THREE.MeshStandardMaterial({ color: 0xcdbca4, roughness: 0.88, side: THREE.DoubleSide, emissive: 0x7d4a24, emissiveIntensity: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdcecf7,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.06,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    }),
    screen: new THREE.MeshBasicMaterial({ map: T.screenTexture, toneMapped: false }),
    miniScreen: new THREE.MeshBasicMaterial({ map: T.miniTexture, toneMapped: false }),
    laptopScreen: new THREE.MeshBasicMaterial({ map: T.laptopTexture, toneMapped: false }),
  };

  // A broad dusk shadow map leaves furniture looking pasted on. A soft
  // occlusion patch under each piece grounds it against the floor.
  const contactShadow = (w, d, x, z, opacity = 0.42, y = 0.012) => {
    const mat = new THREE.MeshBasicMaterial({
      map: T.blob,
      color: 0x000000,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = plane(scene, w, d, mat, [x, y, z], { rot: [-Math.PI / 2, 0, 0] });
    mesh.renderOrder = 2;
    return mesh;
  };

  /* ------------------------------- the shell ------------------------------- */

  add(scene, new THREE.PlaneGeometry(12, 10.2), M.floor, [0, 0, 0], {
    rot: [-Math.PI / 2, 0, 0],
    receive: true,
  });
  add(scene, new THREE.PlaneGeometry(12, 10.2), M.ceiling, [0, 4.58, 0], { rot: [Math.PI / 2, 0, 0], cast: true });

  // back wall, cut for the window behind the desk
  const winX = [-3.3, 2.7];
  const winY = [1.35, 3.55];
  const winW = winX[1] - winX[0];
  const winH = winY[1] - winY[0];
  const winCX = (winX[0] + winX[1]) / 2;
  const winCY = (winY[0] + winY[1]) / 2;

  box(scene, winX[0] + 6.15, 4.6, 0.2, M.wall, [(winX[0] - 6.15) / 2, 2.3, -5.08], { receive: true, cast: true });
  box(scene, 6.15 - winX[1], 4.6, 0.2, M.wall, [(winX[1] + 6.15) / 2, 2.3, -5.08], { receive: true, cast: true });
  box(scene, winW, winY[0], 0.2, M.wall, [winCX, winY[0] / 2, -5.08], { receive: true, cast: true });
  box(scene, winW, 4.6 - winY[1], 0.2, M.wall, [winCX, winY[1] + (4.6 - winY[1]) / 2, -5.08], { receive: true, cast: true });

  box(scene, 0.2, 4.6, 10.2, M.wall, [-6.05, 2.3, 0], { receive: true, cast: true });
  box(scene, 0.2, 4.6, 10.2, M.wall, [6.05, 2.3, 0], { receive: true, cast: true });

  // baseboards
  box(scene, 11.8, 0.12, 0.05, M.walnutDark, [0, 0.06, -4.94]);
  box(scene, 0.05, 0.12, 10, M.walnutDark, [-5.93, 0.06, 0]);
  box(scene, 0.05, 0.12, 10, M.walnutDark, [5.93, 0.06, 0]);

  // ceiling beams
  [-3.4, 0, 3.4].forEach((z) => box(scene, 12, 0.16, 0.22, M.walnutDark, [0, 4.5, z]));

  /* -------------------------------- window --------------------------------- */

  const city = plane(scene, winW + 1.8, winH + 2.1, new THREE.MeshBasicMaterial({ map: T.city }), [winCX, winCY, -6.15]);
  city.material.toneMapped = true;

  plane(scene, winW, winH, M.glass, [winCX, winCY, -4.97]);

  const frameMat = M.metal;
  box(scene, 0.1, winH + 0.14, 0.13, frameMat, [winX[0], winCY, -4.95], { cast: true });
  box(scene, 0.1, winH + 0.14, 0.13, frameMat, [winX[1], winCY, -4.95], { cast: true });
  box(scene, winW + 0.16, 0.1, 0.13, frameMat, [winCX, winY[0], -4.95], { cast: true });
  box(scene, winW + 0.16, 0.1, 0.13, frameMat, [winCX, winY[1], -4.95], { cast: true });
  // The mullions and transoms cast, so the sunlight lands as a grid of panes
  // rather than one soft wash across the floor. They are deliberately chunky:
  // thin bars blur away in the shadow map by the time they reach the rug.
  [-1.3, 0.7].forEach((x) => box(scene, 0.12, winH, 0.07, frameMat, [x, winCY, -4.94], { cast: true }));
  [1.9, 2.9].forEach((y) => box(scene, winW, 0.11, 0.07, frameMat, [winCX, y, -4.94], { cast: true }));
  box(scene, winW + 0.44, 0.09, 0.36, M.walnut, [winCX, winY[0] - 0.03, -4.86], { r: 0.02, receive: true, cast: true });

  function curtain(xPos, width, height) {
    const geo = new THREE.PlaneGeometry(width, height, 40, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wave = Math.sin((x / width) * Math.PI * 10) * 0.05 + Math.sin((x / width) * Math.PI * 22) * 0.014;
      pos.setZ(i, wave * (0.65 + 0.35 * Math.cos((y / height) * Math.PI)));
    }
    geo.computeVertexNormals();
    return add(scene, geo, M.curtain, [xPos, 2.34, -4.78], { cast: true });
  }
  curtain(winX[0] - 0.32, 0.78, 4.12);
  curtain(winX[1] + 0.28, 0.6, 4.12);
  const rod = cyl(scene, 0.022, 0.022, winW + 1.2, M.brass, [winCX, 4.42, -4.74], { rot: [0, 0, Math.PI / 2] });
  rod.castShadow = false;

  // the bright haze that pools in from the window
  plane(
    scene,
    winW + 0.3,
    winH + 0.2,
    new THREE.MeshBasicMaterial({ map: T.glow, color: 0xfff0d8, transparent: true, opacity: 0.26, depthWrite: false, blending: THREE.AdditiveBlending }),
    [winCX, winCY, -4.93],
  );

  /* --------------------------------- desk ---------------------------------- */

  const desk = new THREE.Group();
  desk.position.set(-0.45, 0, -4.05);
  scene.add(desk);

  box(desk, 4.8, 0.09, 1.46, M.walnut, [0, 1.34, 0], { r: 0.03, cast: true, receive: true });
  box(desk, 4.56, 0.006, 0.022, M.brass, [0, 1.388, 0.56]);
  box(desk, 0.075, 1.3, 1.3, M.metal, [-2.32, 0.65, 0], { cast: true });
  box(desk, 0.075, 1.3, 1.3, M.metal, [2.32, 0.65, 0], { cast: true });
  box(desk, 4.5, 0.08, 0.06, M.metal, [0, 1.24, -0.52]);
  box(desk, 4.4, 0.03, 1.2, M.walnutDark, [0, 1.25, 0]);

  // drawers, right side
  for (let i = 0; i < 2; i += 1) {
    const y = 1.08 - i * 0.42;
    box(desk, 1.0, 0.36, 1.12, M.walnut, [1.55, y, 0.02], { r: 0.015, cast: true });
    box(desk, 0.22, 0.018, 0.02, M.brass, [1.55, y + 0.04, 0.59]);
  }

  // under-desk light strip
  const stripMat = new THREE.MeshStandardMaterial({ color: 0xffb27a, emissive: 0xff8a3d, emissiveIntensity: 0.55 });
  box(desk, 3.9, 0.012, 0.03, stripMat, [0, 1.27, 0.58]);

  /* -------------------------------- monitors -------------------------------- */

  // Invisible quads the real HTML content is projected onto. Each one sits a
  // hair in front of a screen so the panel can be mapped into the object's
  // perspective instead of floating above the room.
  const surfaceMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  const screens = {};
  const surface = (parent, w, h, pos) => {
    const mesh = plane(parent, w, h, surfaceMat, pos);
    mesh.userData.size = [w, h];
    mesh.renderOrder = -1;
    return mesh;
  };

  const mon = new THREE.Group();
  mon.position.set(-0.05, 0, -0.16);
  desk.add(mon);

  box(mon, 1.54, 0.92, 0.045, M.metal, [0, 2.47, 0], { r: 0.012, cast: true });
  plane(mon, 1.46, 0.84, M.screen, [0, 2.47, 0.038]);
  screens.projects = surface(mon, 1.46, 0.84, [0, 2.47, 0.047]);
  // neck runs from the foot on the desk all the way up to the panel, so the
  // screen is visibly mounted instead of hovering over the desktop
  box(mon, 0.1, 0.62, 0.09, M.metal, [0, 1.72, -0.02], { cast: true });
  box(mon, 0.62, 0.025, 0.3, M.metal, [0, 1.395, 0.06], { r: 0.012, cast: true });
  const monitorLed = box(mon, 0.05, 0.012, 0.01, new THREE.MeshStandardMaterial({ color: 0xffb27a, emissive: 0xff8a3d, emissiveIntensity: 2.6 }), [0, 2.02, 0.038]);

  // glow behind the monitor
  plane(
    mon,
    2.6,
    1.7,
    new THREE.MeshBasicMaterial({ map: T.glow, color: 0x7d9dff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }),
    [0, 2.4, -0.11],
  );

  // webcam
  box(mon, 0.12, 0.035, 0.05, M.metal, [0, 2.96, 0.01], { r: 0.01 });
  cyl(mon, 0.014, 0.014, 0.02, new THREE.MeshStandardMaterial({ color: 0x05050a, metalness: 0.5, roughness: 0.2 }), [0, 2.96, 0.042], { rot: [Math.PI / 2, 0, 0] });

  // vertical second monitor
  const side = new THREE.Group();
  side.position.set(-1.78, 0, -0.1);
  side.rotation.y = 0.33;
  desk.add(side);
  box(side, 0.68, 1.08, 0.05, M.metal, [0, 2.52, 0], { r: 0.015, cast: true });
  plane(side, 0.62, 1.0, M.miniScreen, [0, 2.52, 0.028]);
  box(side, 0.08, 0.57, 0.07, M.metal, [0, 1.695, -0.02], { cast: true });
  box(side, 0.44, 0.02, 0.24, M.metal, [0, 1.4, 0.04], { r: 0.01, cast: true });

  // laptop
  const laptop = new THREE.Group();
  laptop.position.set(1.55, 0, 0.2);
  laptop.rotation.y = -0.42;
  desk.add(laptop);
  box(laptop, 0.68, 0.028, 0.46, M.metal, [0, 1.4, 0], { r: 0.012, cast: true });
  box(laptop, 0.6, 0.004, 0.24, new THREE.MeshStandardMaterial({ color: 0x24212a, roughness: 0.7 }), [0, 1.416, 0.06]);
  const lid = new THREE.Group();
  lid.position.set(0, 1.41, -0.23);
  lid.rotation.x = -0.3;
  laptop.add(lid);
  box(lid, 0.68, 0.44, 0.02, M.metal, [0, 0.2, 0], { r: 0.012, cast: true });
  plane(lid, 0.6, 0.37, M.laptopScreen, [0, 0.2, 0.012]);
  // Contact is read on this screen, not on a floating page: the mapped quad
  // sits just in front of the laptop display and inherits its lid angle.
  screens.contact = surface(lid, 0.58, 0.35, [0, 0.2, 0.014]);

  /* ------------------------------ desk objects ------------------------------ */

  const matte = new THREE.MeshStandardMaterial({ color: 0x17141a, roughness: 0.85 });
  box(desk, 1.6, 0.008, 0.58, matte, [-0.02, 1.392, 0.56], { r: 0.006 });

  // keyboard
  const keyboard = new THREE.Group();
  keyboard.position.set(-0.06, 1.4, 0.52);
  desk.add(keyboard);
  box(keyboard, 1.04, 0.034, 0.34, new THREE.MeshStandardMaterial({ color: 0x211d26, roughness: 0.6 }), [0, 0, 0], { r: 0.014, cast: true });
  const keyGeo = rounded(0.058, 0.014, 0.058, 0.006, 2);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x322c39, roughness: 0.5 });
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, 14 * 4);
  const dummy = new THREE.Object3D();
  let k = 0;
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 14; c += 1) {
      dummy.position.set(-0.47 + c * 0.072, 0.024, -0.105 + r * 0.07);
      dummy.updateMatrix();
      keys.setMatrixAt(k, dummy.matrix);
      k += 1;
    }
  }
  keys.instanceMatrix.needsUpdate = true;
  desk.add(keys);
  const spacebar = box(desk, 0.42, 0.016, 0.05, keyMat, [-0.06, 1.424, 0.72], { r: 0.008 });

  // mouse
  const mouse = new THREE.Group();
  mouse.position.set(0.66, 1.4, 0.6);
  mouse.rotation.y = 0.18;
  desk.add(mouse);
  add(mouse, rounded(0.085, 0.04, 0.14, 0.02, 3), new THREE.MeshStandardMaterial({ color: 0x24202a, roughness: 0.45 }), [0, 0.022, 0], { cast: true });
  cyl(mouse, 0.012, 0.012, 0.008, M.metal, [0, 0.045, 0.02], { rot: [0, 0, Math.PI / 2], segments: 12 });

  // mug + steam
  const mug = new THREE.Group();
  mug.position.set(1.02, 1.4, 0.24);
  desk.add(mug);
  cyl(mug, 0.082, 0.074, 0.115, M.ceramic, [0, 0.058, 0], { segments: 28, cast: true });
  cyl(mug, 0.074, 0.074, 0.008, new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.35 }), [0, 0.112, 0]);
  add(mug, new THREE.TorusGeometry(0.05, 0.011, 8, 18, Math.PI * 1.35), M.ceramic, [0.082, 0.06, 0], { rot: [0, 0, -0.5] });

  const steamMats = [];
  for (let i = 0; i < 3; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ map: T.steam, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = plane(scene, 0.16, 0.3, mat, [0.57, 1.63 + i * 0.09, -3.81]);
    steamMats.push({ mesh: s, phase: i * 0.9 });
  }

  // notebook + pen
  const nb = new THREE.Group();
  nb.position.set(-1.12, 1.4, 0.5);
  nb.rotation.y = 0.16;
  desk.add(nb);
  box(nb, 0.36, 0.02, 0.26, new THREE.MeshStandardMaterial({ color: 0x2d2721, roughness: 0.8 }), [0, 0.01, 0], { r: 0.006, cast: true });
  box(nb, 0.33, 0.012, 0.235, M.paper, [0.005, 0.024, 0], { r: 0.004 });
  cyl(nb, 0.006, 0.006, 0.16, M.brass, [0.06, 0.04, 0.04], { rot: [0, 0, 1.35] });

  // photo frame
  const photo = new THREE.Group();
  photo.position.set(-1.72, 1.4, -0.36);
  photo.rotation.y = 0.28;
  desk.add(photo);
  box(photo, 0.17, 0.22, 0.012, M.brass, [0, 0.11, 0], { r: 0.008, cast: true });
  plane(photo, 0.14, 0.19, M.paper, [0, 0.11, 0.008]);
  box(photo, 0.02, 0.12, 0.02, M.brass, [0, 0.06, -0.08], { rot: [-0.4, 0, 0] });

  // a sealed letter on the desk, kept as a prop
  const letter = new THREE.Group();
  letter.position.set(2.12, 1.4, 0.3);
  letter.rotation.y = 0.34;
  desk.add(letter);
  box(letter, 0.27, 0.014, 0.18, M.paper, [0, 0.007, 0], { r: 0.003, cast: true });
  box(letter, 0.001, 0.002, 0.15, new THREE.MeshStandardMaterial({ color: 0xd3c6b0, roughness: 0.9 }), [0, 0.015, 0.015]);
  const seal = cyl(letter, 0.024, 0.026, 0.008, new THREE.MeshStandardMaterial({ color: 0x8c2f24, roughness: 0.5 }), [0, 0.018, 0.01], { segments: 20 });
  seal.castShadow = true;

  /* --------------------------------- chair --------------------------------- */

  const chair = new THREE.Group();
  chair.position.set(-0.5, 0, -2.46);
  scene.add(chair);
  box(chair, 0.7, 0.12, 0.66, M.leather, [0, 0.93, 0], { r: 0.04, cast: true, receive: true });
  box(chair, 0.66, 0.66, 0.1, M.leather, [0, 1.42, 0.33], { r: 0.04, cast: true, rot: [-0.1, 0, 0] });
  box(chair, 0.5, 0.22, 0.07, M.leatherDark, [0, 1.2, 0.26], { r: 0.03, rot: [-0.1, 0, 0] });
  [-0.42, 0.42].forEach((x) => {
    box(chair, 0.07, 0.05, 0.44, M.metal, [x, 1.12, -0.01], { r: 0.02 });
    box(chair, 0.06, 0.28, 0.06, M.metal, [x, 0.98, 0.1]);
  });
  cyl(chair, 0.05, 0.06, 0.44, M.metal, [0, 0.63, 0], { cast: true });
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * TAU;
    const spoke = box(chair, 0.52, 0.045, 0.08, M.metal, [Math.sin(angle) * 0.26, 0.22, Math.cos(angle) * 0.26], { r: 0.02 });
    spoke.rotation.y = angle;
    add(chair, new THREE.SphereGeometry(0.045, 12, 10), M.metal, [Math.sin(angle) * 0.5, 0.19, Math.cos(angle) * 0.5]);
  }

  /* ---------------------------------- rug ---------------------------------- */

  add(scene, new THREE.PlaneGeometry(5.9, 4.2), new THREE.MeshStandardMaterial({ map: T.rug, roughness: 0.95 }), [0.35, 0.006, -0.5], {
    rot: [-Math.PI / 2, 0, 0],
    receive: true,
  });

  /* ------------------------------- bookshelf ------------------------------- */

  const shelf = new THREE.Group();
  shelf.position.set(-5.68, 0, -1.5);
  shelf.rotation.y = Math.PI / 2;
  scene.add(shelf);

  box(shelf, 3.4, 3.24, 0.06, M.walnutDark, [0, 1.62, -0.2], { receive: true });
  box(shelf, 0.06, 3.24, 0.42, M.walnut, [-1.7, 1.62, 0], { cast: true });
  box(shelf, 0.06, 3.24, 0.42, M.walnut, [1.7, 1.62, 0], { cast: true });
  box(shelf, 3.46, 0.07, 0.46, M.walnut, [0, 3.26, 0.01], { cast: true });
  const shelfY = [0.1, 1.02, 1.94, 2.86];
  shelfY.slice(1).forEach((y) => {
    box(shelf, 3.38, 0.055, 0.4, M.walnut, [0, y, 0], { cast: true, receive: true });
  });
  box(shelf, 3.38, 0.06, 0.42, M.walnut, [0, 0.06, 0], { cast: true });

  const bookColors = [0x4a3a2e, 0x2f3a35, 0x5c4a38, 0x2c3040, 0x4a3640, 0x8b8071, 0x3d2c25, 0x39443d, 0x6a4a37, 0x24232a];
  function bookRow(x0, x1, y) {
    let x = x0;
    while (x < x1) {
      const thickness = rand(0.04, 0.075);
      if (x + thickness > x1) break;
      const height = rand(0.24, 0.36);
      const color = bookColors[Math.floor(rnd() * bookColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
      const b = box(shelf, thickness, height, rand(0.24, 0.31), mat, [x + thickness / 2, y + height / 2, 0.02], { r: 0.006, cast: true, receive: true });
      if (rnd() > 0.55) b.rotation.z = rand(-0.02, 0.02);
      if (rnd() > 0.7) {
        box(shelf, thickness * 0.9, 0.012, 0.02, M.brass, [x + thickness / 2, y + height * 0.78, 0.19]);
      }
      x += thickness + rand(0.004, 0.02);
    }
  }
  bookRow(-1.6, 0.6, shelfY[0]);
  bookRow(-1.6, -0.1, shelfY[1]);
  bookRow(1.25, 1.5, shelfY[2]);
  bookRow(-1.6, 0.45, shelfY[3]);

  // warm LED under the middle shelf, so the left side reads at night
  const shelfStripMat = new THREE.MeshStandardMaterial({ color: 0xffc08a, emissive: 0xff9a4d, emissiveIntensity: 1.2 });
  box(shelf, 3.0, 0.008, 0.022, shelfStripMat, [0, shelfY[2] - 0.038, 0.19]);
  const shelfGlow = new THREE.PointLight(0xffa863, 1.1, 2.4, 2);
  shelfGlow.position.set(-5.2, 1.72, -1.5);
  scene.add(shelfGlow);

  // leaning stack + props
  for (let i = 0; i < 4; i += 1) {
    const b = box(shelf, 0.3, 0.055, 0.22, new THREE.MeshStandardMaterial({ color: bookColors[i + 2], roughness: 0.8 }), [0.9, shelfY[0] + 0.03 + i * 0.056, 0.02], { r: 0.005, cast: true });
    b.rotation.y = rand(-0.08, 0.08);
  }
  // brass clock
  const shelfClock = new THREE.Group();
  shelfClock.position.set(0.55, shelfY[1], 0.02);
  shelf.add(shelfClock);
  add(shelfClock, new THREE.TorusGeometry(0.11, 0.018, 10, 30), M.brass, [0, 0.13, 0], { rot: [0, 0, 0] });
  add(shelfClock, new THREE.CircleGeometry(0.1, 30), M.cream, [0, 0.13, 0.002]);
  box(shelfClock, 0.008, 0.07, 0.006, M.metal, [0, 0.15, 0.012]);
  box(shelfClock, 0.05, 0.007, 0.006, M.metal, [0.02, 0.13, 0.012]);
  add(shelfClock, new THREE.CylinderGeometry(0.06, 0.09, 0.03, 20), M.brass, [0, 0.015, 0]);

  // little vase + dried stems
  const vase = new THREE.Group();
  vase.position.set(1.2, shelfY[1], 0);
  shelf.add(vase);
  add(vase, new THREE.SphereGeometry(0.085, 20, 16), M.ceramic, [0, 0.09, 0]);
  for (let i = 0; i < 5; i += 1) {
    cyl(vase, 0.004, 0.004, rand(0.24, 0.34), new THREE.MeshStandardMaterial({ color: 0x6d5a41, roughness: 0.9 }), [rand(-0.03, 0.03), 0.28, rand(-0.03, 0.03)], { rot: [rand(-0.25, 0.25), 0, rand(-0.25, 0.25)] });
  }

  // photo frame on shelf
  const shelfPhoto = new THREE.Group();
  shelfPhoto.position.set(-0.35, shelfY[2], 0.04);
  shelfPhoto.rotation.y = -0.18;
  shelf.add(shelfPhoto);
  box(shelfPhoto, 0.3, 0.24, 0.02, M.brass, [0, 0.13, 0], { r: 0.008, cast: true });
  plane(shelfPhoto, 0.25, 0.19, M.paper, [0, 0.13, 0.012]);
  box(shelfPhoto, 0.03, 0.1, 0.02, M.brass, [0, 0.02, -0.05], { rot: [0.35, 0, 0] });

  // vinyl records on the top shelf
  for (let i = 0; i < 7; i += 1) {
    const rec = cyl(shelf, 0.16, 0.16, 0.008, new THREE.MeshStandardMaterial({ color: 0x0d0c10, roughness: 0.5 }), [1.15, shelfY[3] + 0.18, 0.02], { rot: [0, 0, Math.PI / 2], segments: 28 });
    rec.position.z = 0.02 - i * 0.012;
    rec.position.y = shelfY[3] + 0.18 + i * 0.004;
  }

  /* ------------------------------ the notebook ------------------------------ */

  // A single hardback on the shelf. It lifts out, turns to the room and opens
  // into the chapter reader.
  const bookRoot = new THREE.Group();
  bookRoot.name = 'notebook';
  bookRoot.position.set(0.85, shelfY[2], 0.06);
  bookRoot.rotation.y = -0.06;
  shelf.add(bookRoot);

  const BOOK_W = 0.3;
  const BOOK_H = 0.4;
  const BOOK_T = 0.052;
  const bookBoard = new THREE.MeshStandardMaterial({ color: 0xddd6c8, roughness: 0.76 });
  const bookPaper = new THREE.MeshStandardMaterial({ color: 0xe9e0ce, roughness: 0.92 });
  const bookFace = new THREE.MeshStandardMaterial({ map: T.bookCover, roughness: 0.72 });
  const bookRibbon = new THREE.MeshStandardMaterial({ color: 0x8c2f24, roughness: 0.62 });

  const closedBook = new THREE.Group();
  closedBook.name = 'notebook-closed';
  bookRoot.add(closedBook);
  box(closedBook, BOOK_W, BOOK_H, 0.005, bookBoard, [0, BOOK_H / 2, -BOOK_T / 2], { r: 0.006, cast: true });
  // individual paper layers give the fore-edge a real edge, not a print
  for (let i = 0; i < 9; i += 1) {
    const z = -BOOK_T / 2 + 0.006 + i * ((BOOK_T - 0.012) / 8);
    const inset = (i % 3) * 0.0007;
    box(closedBook, BOOK_W - 0.016 - inset, BOOK_H - 0.016 - inset, 0.0032, bookPaper, [0, BOOK_H / 2, z], { r: 0.002 });
  }
  box(closedBook, BOOK_W, BOOK_H, 0.005, bookBoard, [0, BOOK_H / 2, BOOK_T / 2], { r: 0.006, cast: true });
  plane(closedBook, BOOK_W - 0.012, BOOK_H - 0.012, bookFace, [0, BOOK_H / 2, BOOK_T / 2 + 0.0026]);
  box(closedBook, 0.012, BOOK_H, BOOK_T, bookBoard, [-BOOK_W / 2 + 0.005, BOOK_H / 2, 0], { r: 0.005, cast: true });
  box(closedBook, 0.014, 0.009, BOOK_T + 0.002, M.brass, [-BOOK_W / 2 + 0.004, BOOK_H * 0.83, 0]);
  box(closedBook, 0.014, 0.009, BOOK_T + 0.002, M.brass, [-BOOK_W / 2 + 0.004, BOOK_H * 0.17, 0]);
  box(closedBook, 0.018, 0.1, 0.002, bookRibbon, [-0.06, BOOK_H * 0.2, BOOK_T / 2 + 0.0035], { r: 0.001 });

  const openBook = new THREE.Group();
  openBook.name = 'notebook-open';
  openBook.visible = false;
  bookRoot.add(openBook);
  const pageMat = new THREE.MeshStandardMaterial({ map: T.bookPage, roughness: 0.9, side: THREE.DoubleSide });
  const blankPageMat = new THREE.MeshStandardMaterial({ color: 0xf0e7d6, roughness: 0.92, side: THREE.DoubleSide });
  const leftPage = new THREE.Group();
  const rightPage = new THREE.Group();
  openBook.add(leftPage, rightPage);
  [leftPage, rightPage].forEach((half, index) => {
    half.position.set(0, BOOK_H / 2, 0);
    const dir = index === 0 ? -1 : 1;
    half.userData.dir = dir;
    half.rotation.y = dir * 0.03;
    // board + a shallow stack of pages under the printed leaf
    box(half, BOOK_W / 2, BOOK_H, 0.006, bookBoard, [dir * (BOOK_W / 4), 0, -0.012], { r: 0.004, cast: true });
    for (let i = 0; i < 5; i += 1) {
      box(half, BOOK_W / 2 - 0.012, BOOK_H - 0.014, 0.0026, bookPaper, [dir * (BOOK_W / 4), 0, -0.007 + i * 0.0024], { r: 0.002 });
    }
    plane(half, BOOK_W / 2 - 0.01, BOOK_H - 0.012, index === 0 ? blankPageMat : pageMat, [dir * (BOOK_W / 4), 0, 0.006]);
    // a few page edges at the outer edge
    for (let i = 0; i < 3; i += 1) {
      box(half, 0.002, BOOK_H - 0.02, 0.004, bookPaper, [dir * (BOOK_W / 2 - 0.001), 0, -0.008 + i * 0.003]);
    }
  });

  // spine and one leaf caught mid-turn
  box(openBook, 0.022, BOOK_H, 0.018, M.walnutDark, [0, BOOK_H / 2, -0.005], { r: 0.006 });
  const turningPage = new THREE.Group();
  turningPage.position.set(0, BOOK_H / 2, 0.008);
  openBook.add(turningPage);
  const bookLeafGeo = new THREE.PlaneGeometry(BOOK_W / 2 - 0.012, BOOK_H - 0.014, 12, 1);
  bookLeafGeo.translate((BOOK_W / 2 - 0.012) / 2, 0, 0);
  const lp = bookLeafGeo.attributes.position;
  for (let i = 0; i < lp.count; i += 1) {
    const x = lp.getX(i);
    lp.setZ(i, Math.sin((x / (BOOK_W / 2)) * Math.PI) * 0.012);
  }
  bookLeafGeo.computeVertexNormals();
  add(turningPage, bookLeafGeo, new THREE.MeshStandardMaterial({ color: 0xefe5d3, roughness: 0.9, side: THREE.DoubleSide }), [0, 0, 0]);

  // a couple of neighbours so the notebook looks shelved, not staged
  for (let i = 0; i < 3; i += 1) {
    const stack = box(
      shelf,
      0.3 - i * 0.012,
      0.045,
      0.22,
      new THREE.MeshStandardMaterial({ color: bookColors[(i + 3) % bookColors.length], roughness: 0.82 }),
      [-0.92, shelfY[2] + 0.026 + i * 0.047, 0.06],
      { r: 0.005, cast: true, receive: true },
    );
    stack.rotation.y = rand(-0.08, 0.08);
  }
  const neighbour = box(
    shelf,
    0.05,
    0.33,
    0.25,
    new THREE.MeshStandardMaterial({ color: 0x2f4744, roughness: 0.8 }),
    [0.34, shelfY[2] + 0.168, 0.04],
    { r: 0.006, cast: true },
  );
  neighbour.rotation.z = 0.035;
  box(shelf, 0.045, 0.012, 0.02, M.brass, [0.34, shelfY[2] + 0.26, 0.17]);

  const bookLight = new THREE.PointLight(0xffc49a, 0.6, 1.8, 2);
  bookLight.position.set(-4.95, 2.9, -2.3);
  scene.add(bookLight);

  const bookBase = { x: 0.85, y: shelfY[2], z: 0.06, rx: 0, ry: -0.06, rz: 0 };
  const bookOut = { x: 0.95, y: shelfY[2] + 0.17, z: 0.42, rx: -0.1, ry: 0.04, rz: 0 };
  const bookFocus = new THREE.Object3D();
  bookFocus.position.set(0.95, shelfY[2] + 0.37, 0.43);
  shelf.add(bookFocus);

  /* ----------------------------- wall art, clock ---------------------------- */

  const backZ = -4.92;

  function framedArt(texture, w, h, pos, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.rotation.y = rotY;
    scene.add(g);
    box(g, w + 0.06, h + 0.06, 0.035, M.walnutDark, [0, 0, 0], { r: 0.008, cast: true });
    plane(g, w, h, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.78 }), [0, 0, 0.02]);
    return g;
  }

  framedArt(T.posters[0].texture, 0.84, 1.14, [-5.9, 3.86, -1.5], Math.PI / 2);
  framedArt(T.posters[2].texture, 0.9, 1.24, [5.9, 2.86, 3.2], -Math.PI / 2);
  framedArt(T.posters[1].texture, 0.7, 0.95, [5.92, 3.9, -3.9], -Math.PI / 2);

  // clock on the back wall
  const clock = new THREE.Group();
  clock.position.set(-4.62, 3.62, backZ);
  scene.add(clock);
  add(clock, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 40), M.walnutDark, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], cast: true });
  add(clock, new THREE.CircleGeometry(0.24, 40), M.cream, [0, 0, 0.023]);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU;
    box(clock, 0.008, i % 3 === 0 ? 0.038 : 0.022, 0.004, M.metal, [Math.sin(a) * 0.2, Math.cos(a) * 0.2, 0.026], { rot: [0, 0, -a] });
  }
  const hourHand = box(clock, 0.012, 0.12, 0.004, M.metal, [0, 0.06, 0.03], {});
  const minuteHand = box(clock, 0.008, 0.17, 0.004, M.metal, [0, 0.085, 0.032], {});
  add(clock, new THREE.CircleGeometry(0.012, 12), M.brass, [0, 0, 0.034]);

  /* --------------------------- the experience rack -------------------------- */

  // A lit pegboard beside the desk holding one lanyard per role. The cards are
  // real meshes with two printed faces: clicking one turns it over in place, so
  // the record is read on the card itself rather than in a page.
  const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

  const rack = new THREE.Group();
  rack.position.set(-4.35, 2.95, -4.84);
  scene.add(rack);

  box(
    rack,
    1.18,
    0.62,
    0.035,
    new THREE.MeshStandardMaterial({ map: T.pegboard, color: 0x3b3746, roughness: 0.8, metalness: 0.14 }),
    [0, 0, 0],
    { r: 0.02, cast: true },
  );
  const rackEdgeMat = new THREE.MeshStandardMaterial({ color: 0xffd9bd, emissive: 0xff9a5f, emissiveIntensity: 0.9, toneMapped: false });
  box(rack, 1.2, 0.012, 0.04, rackEdgeMat, [0, 0.318, 0.012]);
  box(rack, 1.2, 0.008, 0.04, rackEdgeMat, [0, -0.318, 0.012]);
  box(rack, 0.012, 0.64, 0.04, rackEdgeMat, [-0.594, 0, 0.012]);
  box(rack, 0.012, 0.64, 0.04, rackEdgeMat, [0.594, 0, 0.012]);

  const cards = [];
  experience.forEach((item, i) => {
    const hang = new THREE.Group();
    hang.position.set(-0.29 + i * 0.58, -0.27, 0.048);
    rack.add(hang);
    add(hang, new THREE.TorusGeometry(0.019, 0.005, 8, 16), M.brass, [0, 0, 0]);
    const strap = plane(
      hang,
      0.05,
      0.23,
      new THREE.MeshStandardMaterial({ map: T.strap, roughness: 0.86, side: THREE.DoubleSide }),
      [0, -0.115, 0.004],
    );
    strap.castShadow = true;
    box(hang, 0.068, 0.02, 0.014, M.brass, [0, -0.232, 0.006], { r: 0.006, cast: true });

    const flip = new THREE.Group();
    flip.position.set(0, -0.445, 0.008);
    hang.add(flip);

    // Two printed faces back to back, with no side wall for the light to
    // catch: any thickness showed as a vertical seam while the card turned.
    const frontFace = new THREE.MeshBasicMaterial({ map: T.cards[i].front });
    const backFace = new THREE.MeshBasicMaterial({ map: T.cards[i].back });
    const faceGeo = new THREE.PlaneGeometry(0.27, 0.39);
    const frontMesh = new THREE.Mesh(faceGeo, frontFace);
    frontMesh.position.z = 0.0004;
    frontMesh.castShadow = true;
    const backMesh = new THREE.Mesh(faceGeo, backFace);
    backMesh.position.z = -0.0004;
    backMesh.rotation.y = Math.PI;
    backMesh.castShadow = true;
    flip.add(frontMesh, backMesh);

    const proxy = box(flip, 0.32, 0.42, 0.15, proxyMat, [0, 0, 0]);
    proxy.userData.section = 'experience';
    proxy.userData.card = i;

    cards.push({ index: i, item, hang, flip, proxy, angle: 0, vel: 0, goal: 0, flipped: false });
  });

  const cardFocus = new THREE.Object3D();
  cardFocus.position.set(0, -0.4, 0.03);
  rack.add(cardFocus);

  const cardLight = new THREE.PointLight(0xffb27a, 0.35, 2.2, 2);
  cardLight.position.set(-4.12, 2.35, -4.28);
  scene.add(cardLight);

  // certificate wall + credenza
  const frameGroup = new THREE.Group();
  scene.add(frameGroup);
  const certPositions = [
    [3.45, 3.36],
    [4.1, 3.36],
    [4.75, 3.36],
    [3.78, 2.78],
    [4.43, 2.78],
    [5.08, 2.78],
  ];
  const certCards = [];
  T.certs.forEach((texture, i) => {
    const [x, y] = certPositions[i];
    const g = new THREE.Group();
    g.position.set(x, y, backZ);
    frameGroup.add(g);
    box(g, 0.6, 0.46, 0.03, M.walnutDark, [0, 0, 0], { r: 0.006, cast: true });
    plane(g, 0.54, 0.4, new THREE.MeshStandardMaterial({ map: texture, color: 0xcfc2ae, roughness: 0.9 }), [0, 0, 0.019]);
    const proxy = box(g, 0.64, 0.5, 0.12, proxyMat, [0, 0, 0.05]);
    proxy.userData.section = 'certifications';
    proxy.userData.cert = i;
    certCards.push({ index: i, group: g, base: { x, y, z: backZ }, proxy });
  });
  box(frameGroup, 1.9, 0.035, 0.05, new THREE.MeshStandardMaterial({ color: 0xffc9a2, emissive: 0xffa05f, emissiveIntensity: 0.3 }), [4.2, 3.72, -4.83]);

  const credenza = new THREE.Group();
  credenza.position.set(4.26, 0, -4.6);
  scene.add(credenza);
  box(credenza, 2.3, 0.62, 0.44, M.walnut, [0, 0.5, 0], { r: 0.02, cast: true, receive: true });
  box(credenza, 2.36, 0.05, 0.5, M.walnutDark, [0, 0.84, 0], { cast: true });
  [-1.0, 1.0].forEach((x) => {
    cyl(credenza, 0.022, 0.022, 0.5, M.brass, [x, 0.24, 0.14], {});
    cyl(credenza, 0.022, 0.022, 0.5, M.brass, [x, 0.24, -0.14], {});
  });
  box(credenza, 0.008, 0.5, 0.02, M.metal, [0, 0.5, 0.225]);
  box(credenza, 0.16, 0.018, 0.02, M.brass, [-0.12, 0.5, 0.235]);
  box(credenza, 0.16, 0.018, 0.02, M.brass, [0.12, 0.5, 0.235]);

  // camera, books, vase on the credenza
  const camera = new THREE.Group();
  camera.position.set(-0.65, 0.88, 0);
  camera.rotation.y = 0.35;
  credenza.add(camera);
  box(camera, 0.22, 0.13, 0.1, M.metal, [0, 0.065, 0], { r: 0.02, cast: true });
  cyl(camera, 0.055, 0.055, 0.09, M.metal, [0, 0.07, 0.08], { rot: [Math.PI / 2, 0, 0] });
  cyl(camera, 0.036, 0.036, 0.005, new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.6, roughness: 0.1 }), [0, 0.07, 0.13], { rot: [Math.PI / 2, 0, 0] });
  box(camera, 0.05, 0.03, 0.04, M.metal, [0, 0.15, 0]);

  for (let i = 0; i < 3; i += 1) {
    const b = box(credenza, 0.26, 0.045, 0.2, new THREE.MeshStandardMaterial({ color: bookColors[(i + 4) % bookColors.length], roughness: 0.8 }), [0.62, 0.89 + i * 0.046, 0.02], { r: 0.005, cast: true });
    b.rotation.y = rand(-0.12, 0.12);
  }
  add(credenza, new THREE.SphereGeometry(0.09, 20, 16), M.ceramic, [0.15, 0.95, 0]);
  cyl(credenza, 0.03, 0.04, 0.05, M.ceramic, [0.15, 1.03, 0]);

  // floating shelf under the frames
  box(scene, 2.3, 0.05, 0.28, M.walnut, [4.3, 2.18, -4.75], { cast: true });
  const trophy = new THREE.Group();
  trophy.position.set(3.62, 2.2, -4.75);
  scene.add(trophy);
  add(trophy, new THREE.CylinderGeometry(0.09, 0.11, 0.04, 20), M.walnutDark, [0, 0.02, 0]);
  add(trophy, new THREE.CylinderGeometry(0.02, 0.02, 0.12, 12), M.brass, [0, 0.1, 0]);
  add(trophy, new THREE.ConeGeometry(0.08, 0.14, 20, 1, true), M.brass, [0, 0.23, 0], { rot: [Math.PI, 0, 0] });
  box(scene, 0.2, 0.16, 0.05, M.paper, [4.85, 2.28, -4.75], { rot: [-0.2, 0.2, 0] });

  /* ------------------------- console, phone, lamp -------------------------- */

  const consoleTable = new THREE.Group();
  consoleTable.position.set(5.55, 0, 3.2);
  scene.add(consoleTable);
  box(consoleTable, 0.5, 0.055, 1.62, M.walnut, [0, 0.92, 0], { r: 0.02, cast: true });
  [[-0.18, -0.72], [-0.18, 0.72], [0.18, -0.72], [0.18, 0.72]].forEach(([x, z]) => {
    cyl(consoleTable, 0.018, 0.018, 0.9, M.brass, [x, 0.45, z], {});
  });
  box(consoleTable, 0.42, 0.04, 1.5, M.walnutDark, [0, 0.3, 0]);

  const phone = new THREE.Group();
  phone.position.set(0, 0.95, 0.1);
  phone.rotation.y = -Math.PI / 2;
  consoleTable.add(phone);
  box(phone, 0.32, 0.085, 0.22, M.metal, [0, 0.045, 0], { r: 0.03, cast: true });
  box(phone, 0.28, 0.055, 0.16, M.walnutDark, [0, 0.1, 0], { r: 0.02 });
  const dial = cyl(phone, 0.075, 0.075, 0.012, M.brass, [0.02, 0.108, 0], { segments: 30 });
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU;
    add(phone, new THREE.CircleGeometry(0.008, 8), M.metal, [0.02 + Math.sin(a) * 0.05, 0.115, Math.cos(a) * 0.05], { rot: [-Math.PI / 2, 0, 0] });
  }
  // handset
  box(phone, 0.07, 0.055, 0.36, M.metal, [0, 0.16, 0], { r: 0.02, cast: true });
  add(phone, new THREE.CylinderGeometry(0.05, 0.06, 0.05, 16), M.metal, [0, 0.16, 0.19], { rot: [Math.PI / 2, 0, 0] });
  add(phone, new THREE.CylinderGeometry(0.05, 0.06, 0.05, 16), M.metal, [0, 0.16, -0.19], { rot: [Math.PI / 2, 0, 0] });
  add(phone, new THREE.TorusGeometry(0.032, 0.004, 6, 20, Math.PI), M.brass, [0, 0.19, -0.26], { rot: [0, 0, 0] });

  // candle + book on the console
  cyl(consoleTable, 0.04, 0.04, 0.12, M.ceramic, [0, 1.0, -0.55], { segments: 18 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd2a1, toneMapped: false });
  add(consoleTable, new THREE.ConeGeometry(0.012, 0.045, 10), flameMat, [0, 1.085, -0.55]);
  box(consoleTable, 0.24, 0.035, 0.17, new THREE.MeshStandardMaterial({ color: 0x7d4132, roughness: 0.8 }), [0, 0.975, 0.6], { r: 0.004, cast: true });

  // floor lamp
  const floorLamp = new THREE.Group();
  floorLamp.position.set(5.02, 0, 2.1);
  scene.add(floorLamp);
  cyl(floorLamp, 0.16, 0.18, 0.03, M.metal, [0, 0.015, 0], { segments: 24 });
  cyl(floorLamp, 0.018, 0.018, 1.62, M.metal, [0, 0.82, 0], { cast: true });
  add(floorLamp, new THREE.ConeGeometry(0.28, 0.34, 32, 1, true), M.fabricShade, [0, 1.72, 0], { cast: true });
  add(floorLamp, new THREE.CylinderGeometry(0.265, 0.265, 0.01, 32), new THREE.MeshBasicMaterial({ color: 0xffd9b3, toneMapped: false }), [0, 1.56, 0]);
  plane(scene, 1.6, 1.6, new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }), [5.02, 1.66, 2.1], { rot: [0, 0, 0] });

  // ottoman
  const ottoman = new THREE.Group();
  ottoman.position.set(3.6, 0, 1.45);
  scene.add(ottoman);
  cyl(ottoman, 0.46, 0.42, 0.34, M.leatherDark, [0, 0.17, 0], { segments: 40, cast: true, receive: true });
  add(ottoman, new THREE.TorusGeometry(0.44, 0.015, 8, 40), M.brass, [0, 0.33, 0], { rot: [Math.PI / 2, 0, 0] });
  cyl(ottoman, 0.27, 0.27, 0.012, M.walnut, [0, 0.35, 0], { segments: 32 });
  box(ottoman, 0.24, 0.03, 0.17, new THREE.MeshStandardMaterial({ color: 0xbfae94, roughness: 0.8 }), [0.05, 0.39, 0], { r: 0.004 });

  /* --------------------------------- plants -------------------------------- */

  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.09, 0.07, 0.08, 0.2, 0, 0.3);
  leafShape.bezierCurveTo(-0.08, 0.2, -0.09, 0.07, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 10);

  function bigPlant(x, z, scale) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    scene.add(g);
    cyl(g, 0.28, 0.22, 0.5, M.terracotta, [0, 0.25, 0], { segments: 32, cast: true });
    cyl(g, 0.255, 0.255, 0.03, new THREE.MeshStandardMaterial({ color: 0x2a1d15, roughness: 1 }), [0, 0.49, 0]);
    for (let i = 0; i < 11; i += 1) {
      const leaf = add(g, leafGeo, i % 3 === 0 ? M.greenDark : M.green, [0, 0.5, 0], { cast: true });
      const angle = (i / 11) * TAU + rand(-0.2, 0.2);
      const tilt = rand(0.25, 0.9);
      leaf.position.set(Math.sin(angle) * rand(0.1, 0.4), rand(0.55, 0.85), Math.cos(angle) * rand(0.1, 0.4));
      leaf.rotation.set(rand(-0.4, 0.4) + tilt, angle, rand(-0.5, 0.5));
      leaf.scale.setScalar(rand(0.9, 1.6));
    }
    // stems
    tube(g, [new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0.05, 0.8, 0.1), new THREE.Vector3(-0.1, 1.1, 0.05)], 0.012, M.greenDark);
    return g;
  }
  bigPlant(-4.7, -4.3, 1.05);
  bigPlant(5.1, -4.55, 0.8);

  // small plant on the windowsill
  const sillPlant = new THREE.Group();
  sillPlant.position.set(winCX - 1.9, winY[0] + 0.02, -4.8);
  scene.add(sillPlant);
  cyl(sillPlant, 0.075, 0.06, 0.12, M.ceramic, [0, 0.06, 0]);
  for (let i = 0; i < 5; i += 1) {
    const leaf = add(sillPlant, leafGeo, M.green, [0, 0.11, 0]);
    leaf.rotation.set(rand(-0.6, 0.6), (i / 5) * TAU, rand(-0.6, 0.6));
    leaf.scale.setScalar(rand(0.35, 0.6));
  }

  /* ---------------------------------- tower -------------------------------- */

  const tower = new THREE.Group();
  tower.position.set(2.4, 0, -4.5);
  scene.add(tower);
  box(tower, 0.34, 0.86, 0.7, M.metal, [0, 0.43, 0], { r: 0.015, cast: true });
  plane(tower, 0.28, 0.6, new THREE.MeshStandardMaterial({ color: 0x14121a, metalness: 0.5, roughness: 0.38, transparent: true, opacity: 0.82, envMapIntensity: 0.35 }), [0, 0.44, 0.352]);
  const fanMats = [];
  for (let i = 0; i < 3; i += 1) {
    const y = 0.66 - i * 0.19;
    const mat = new THREE.MeshStandardMaterial({ color: 0x1c1822, emissive: 0x6a4fcf, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.34 });
    const fan = add(tower, new THREE.TorusGeometry(0.075, 0.008, 8, 28), mat, [0, y, 0.355]);
    const disc = add(tower, new THREE.CircleGeometry(0.07, 24), new THREE.MeshBasicMaterial({ color: 0x2a2136, transparent: true, opacity: 0.85 }), [0, y, 0.354]);
    fanMats.push(mat);
  }
  tube(scene, [new THREE.Vector3(1.9, 0.3, -4.6), new THREE.Vector3(2.1, 0.12, -4.2), new THREE.Vector3(2.3, 0.14, -4.1)], 0.025, M.metal, { segments: 30 });
  tube(scene, [new THREE.Vector3(0.9, 1.2, -4.6), new THREE.Vector3(1.6, 0.5, -4.35), new THREE.Vector3(2.25, 0.2, -4.45)], 0.018, M.metal, { segments: 30 });

  /* --------------------------------- pendant ------------------------------- */

  const pendant = new THREE.Group();
  pendant.position.set(1.55, 0, -2.5);
  scene.add(pendant);
  cyl(pendant, 0.008, 0.008, 1.1, M.metal, [0, 4.05, 0], {});
  add(pendant, new THREE.ConeGeometry(0.3, 0.3, 36, 1, true), M.shade, [0, 3.45, 0], { cast: true });
  add(pendant, new THREE.ConeGeometry(0.27, 0.26, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xffcf9f, emissive: 0xffa25d, emissiveIntensity: 1.0, side: THREE.BackSide }), [0, 3.43, 0]);
  const pendantBulb = add(pendant, new THREE.SphereGeometry(0.075, 20, 14), new THREE.MeshStandardMaterial({ color: 0xfff0d8, emissive: 0xffc48a, emissiveIntensity: 3.2 }), [0, 3.27, 0]);
  plane(scene, 2.2, 2.2, new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }), [1.55, 3.3, -2.5]);

  /* ---------------------------------- dust --------------------------------- */

  const dustCount = 180;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustBase = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i += 1) {
    const x = rand(-5.5, 5.5);
    const y = rand(0.3, 4.2);
    const z = rand(-4.8, 4.4);
    dustBase[i * 3] = x;
    dustBase[i * 3 + 1] = y;
    dustBase[i * 3 + 2] = z;
    dustPos[i * 3] = x;
    dustPos[i * 3 + 1] = y;
    dustPos[i * 3 + 2] = z;
    dustPhase[i] = rnd() * TAU;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.02,
    map: T.glow,
    color: 0xfff2d8,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ------------------------------ grounding shadows ------------------------ */

  contactShadow(4.1, 1.5, -0.45, -4.05, 0.4);
  contactShadow(1.15, 1.15, -0.5, -2.46, 0.46);
  contactShadow(1.1, 3.7, -5.55, -1.5, 0.5, 0.014);
  contactShadow(2.3, 0.7, 4.26, -4.6, 0.44);
  contactShadow(0.7, 1.75, 5.55, 3.2, 0.4);
  contactShadow(0.5, 0.5, 5.02, 2.1, 0.46);
  contactShadow(1.02, 1.02, 3.6, 1.45, 0.46);
  contactShadow(0.9, 0.9, -4.7, -4.3, 0.5);
  contactShadow(0.7, 0.7, 5.1, -4.55, 0.46);
  contactShadow(0.6, 0.85, 2.4, -4.5, 0.46);

  /* --------------------------------- lights -------------------------------- */

  scene.add(new THREE.HemisphereLight(0xfff4e2, 0xc09a72, 0.72));
  scene.add(new THREE.AmbientLight(0xe6d6bd, 0.32));

  // The sun is placed so its direction runs clean through the window opening
  // and lands on the floor in front of the desk. Its previous angle cleared
  // the glass but struck the wall above the window, so the room never saw it.
  const sun = new THREE.DirectionalLight(0xffdcab, 7.2);
  // a low morning sun: shallow enough that the window frame throws long bars
  // right across the rug instead of a small patch by the desk
  const sunAim = new THREE.Vector3(0.9, 0, 0.6);
  const sunThrough = new THREE.Vector3(winCX - 0.2, winCY, -4.99);
  const sunDir = sunAim.clone().sub(sunThrough).normalize();
  sun.position.copy(sunThrough).addScaledVector(sunDir, -13);
  sun.target.position.copy(sunAim);
  sun.castShadow = true;
  // The sunlit bay gets its own shadow map so the mullions and sill read as
  // bars in the patch; 2048 keeps them crisp without a 36 MB depth texture.
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 46;
  sun.shadow.camera.left = -8.5;
  sun.shadow.camera.right = 8.5;
  sun.shadow.camera.top = 8.5;
  sun.shadow.camera.bottom = -8.5;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.018;
  scene.add(sun, sun.target);

  // cool sky fill bouncing off the opposite wall
  const fill = new THREE.DirectionalLight(0xb9d2e8, 0.3);
  fill.position.set(-5, 4, 6);
  fill.target.position.set(0.5, 1.6, -2);
  scene.add(fill, fill.target);

  const pendantLight = new THREE.SpotLight(0xffb98a, 5.5, 8.5, 0.88, 0.9, 1.8);
  pendantLight.position.set(1.55, 3.3, -2.5);
  pendantLight.target.position.set(0.4, 0.2, -2.3);
  pendantLight.castShadow = true;
  pendantLight.shadow.mapSize.set(1024, 1024);
  pendantLight.shadow.bias = -0.001;
  pendantLight.shadow.normalBias = 0.02;
  scene.add(pendantLight, pendantLight.target);

  const monitorLight = new THREE.PointLight(0x9db8e8, 3.4, 3.4, 2);
  monitorLight.position.set(-0.5, 2.3, -3.3);
  scene.add(monitorLight);

  const wallLight = new THREE.PointLight(0xffa25f, 0.7, 2.8, 2);
  wallLight.position.set(4.0, 3.65, -4.3);
  scene.add(wallLight);


  /* -------------------------------- hotspots ------------------------------- */

  // Hit boxes sit on the thing they belong to. Nothing is clickable by
  // proximity any more: the cards are the cards, the book is the book.
  const anchorAt = (parent, x, y, z) => {
    const object = new THREE.Object3D();
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const hotspots = [
    {
      id: 'projects',
      label: 'Projects',
      proxy: box(mon, 1.62, 1.0, 0.2, proxyMat, [0, 2.47, 0.03]),
      anchorObject: anchorAt(mon, 0, 3.2, 0.02),
    },
    {
      id: 'experience',
      label: 'Experience',
      proxy: box(rack, 1.2, 0.64, 0.12, proxyMat, [0, 0, 0]),
      anchorObject: anchorAt(rack, 0, 0.02, 0.08),
    },
    {
      id: 'certifications',
      label: 'Certifications',
      proxy: box(scene, 2.4, 1.44, 0.02, proxyMat, [4.26, 3.06, -4.945]),
      anchorObject: anchorAt(frameGroup, 4.26, 3.78, 0.12),
    },
    {
      id: 'about',
      label: 'About',
      proxy: box(shelf, 0.5, 0.56, 0.34, proxyMat, [0.85, 2.15, 0.09]),
      anchorObject: anchorAt(shelf, 0.95, 2.8, 0.44),
    },
    {
      id: 'contact',
      label: 'Contact',
      proxy: box(lid, 0.72, 0.5, 0.14, proxyMat, [0, 0.2, 0.02]),
      anchorObject: anchorAt(lid, 0, 0.5, 0.02),
    },
  ];
  hotspots.forEach((hotspot) => {
    hotspot.proxy.userData.section = hotspot.id;
    hotspot.index = hotspot.id;
  });

  // Camera aim points for the two objects that are inspected in the room.
  const tempQuat = new THREE.Quaternion();
  const normalOf = (object) => {
    object.getWorldQuaternion(tempQuat);
    return new THREE.Vector3(0, 0, 1).applyQuaternion(tempQuat).normalize();
  };
  scene.updateMatrixWorld(true);
  const focusPoints = {
    experience: { position: new THREE.Vector3(), normal: normalOf(cardFocus) },
    certifications: { position: new THREE.Vector3(4.26, 3.06, -4.9), normal: new THREE.Vector3(0, 0, 1) },
    about: { position: new THREE.Vector3(), normal: normalOf(bookFocus) },
  };
  cardFocus.getWorldPosition(focusPoints.experience.position);
  bookFocus.getWorldPosition(focusPoints.about.position);

  // One aim point per card, so clicking a lanyard can push the camera in on it.
  const cardPoints = cards.map((card) => {
    const position = new THREE.Vector3();
    card.flip.getWorldPosition(position);
    return { x: position.x, y: position.y, z: position.z };
  });

  // Everything the pointer can pick, nearest hit first.
  const pickables = [...hotspots.map((hotspot) => hotspot.proxy), ...cards.map((card) => card.proxy), ...certCards.map((card) => card.proxy)];

  /* --------------------------- object interaction -------------------------- */

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The lanyards swing on their clips and can be dragged; a click turns a card.
  const cardState = { drag: -1, startX: 0, startAngle: 0 };

  function beginCardDrag(clientX, index = 0) {
    const card = cards[index];
    if (!card) return;
    cardState.drag = index;
    cardState.startX = clientX;
    cardState.startAngle = card.angle;
    card.vel = 0;
  }

  function moveCardDrag(clientX) {
    const card = cards[cardState.drag];
    if (!card) return;
    const dx = clientX - cardState.startX;
    const span = Math.max(420, window.innerWidth);
    card.angle = Math.max(-0.5, Math.min(0.5, cardState.startAngle - (dx / span) * 1.4));
    card.hang.rotation.z = card.angle;
  }

  function endCardDrag() {
    cardState.drag = -1;
  }

  function flipCard(index) {
    const card = cards[index];
    if (!card) return false;
    card.flipped = !card.flipped;
    card.goal = card.flipped ? Math.PI : 0;
    return card.flipped;
  }

  function setCardHold() {}

  // Certificates: the frames lift off the wall into an arc, and the selected
  // one floats forward so it can be read.
  let certOpen = 0;
  let certGoal = 0;
  let certSelected = 0;

  function setCertFocus(open, index = 0) {
    certGoal = open ? 1 : 0;
    if (open && typeof index === 'number') {
      certSelected = Math.max(0, Math.min(certCards.length - 1, index));
    }
  }

  function focusCert(index) {
    certSelected = Math.max(0, Math.min(certCards.length - 1, index));
    certGoal = 1;
  }

  function getCertSelected() {
    return certSelected;
  }

  // The notebook: it lifts off the shelf and opens.
  let bookT = 0;
  let bookGoal = 0;
  function setBookOpen(open) {
    bookGoal = open ? 1 : 0;
  }

  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  /* --------------------------------- update -------------------------------- */

  let lastScreen = -10;
  const clockState = { hourHand, minuteHand };

  function setScreenMode(mode) {
    T.screen.mode = mode;
    T.screen.draw(performance.now() / 1000);
    lastScreen = -10;
  }

  function update(t, dt) {
    // The monitor redraw is a full canvas repaint plus a texture upload, so it
    // runs a few times a second at most, and never while the tab is hidden.
    if (!document.hidden && t - lastScreen > 0.5) {
      T.screen.draw(t);
      lastScreen = t;
    }

    // dust drifts slowly
    const pos = dustGeo.attributes.position.array;
    for (let i = 0; i < dustCount; i += 1) {
      const p = dustPhase[i];
      pos[i * 3] = dustBase[i * 3] + Math.sin(t * 0.18 + p) * 0.16;
      pos[i * 3 + 1] = dustBase[i * 3 + 1] + Math.sin(t * 0.13 + p * 1.7) * 0.1;
      pos[i * 3 + 2] = dustBase[i * 3 + 2] + Math.cos(t * 0.15 + p) * 0.14;
    }
    dustGeo.attributes.position.needsUpdate = true;

    steamMats.forEach(({ mesh, phase }) => {
      const k = (t * 0.34 + phase) % 1;
      mesh.position.y = 1.56 + k * 0.44;
      mesh.position.x = 0.57 + Math.sin(t * 0.9 + phase * 3) * 0.028;
      mesh.material.opacity = 0.2 * Math.sin(k * Math.PI);
      mesh.scale.setScalar(0.6 + k * 1.1);
    });

    // the lanyards breathe, and a clicked card turns over
    cards.forEach((card, i) => {
      if (!reduced && cardState.drag !== i) {
        const breeze = Math.sin(t * 0.62 + i * 1.9) * 0.045;
        card.vel += (-8.4 * Math.sin(card.angle) - 2.1 * card.vel + breeze) * dt;
        card.angle = Math.max(-0.5, Math.min(0.5, card.angle + card.vel * dt));
        card.hang.rotation.z = card.angle;
      }
      const flipEase = reduced ? 1 : 1 - Math.exp(-dt * 7);
      card.flip.rotation.y += (card.goal - card.flip.rotation.y) * flipEase;
    });

    // the certificate wall: frames fan out, the chosen one comes forward
    certOpen += (certGoal - certOpen) * (reduced ? 1 : 1 - Math.exp(-dt * 4.2));
    const mix = (a, b, k) => a + (b - a) * k;
    certCards.forEach((card, i) => {
      const selected = i === certSelected && certOpen > 0.001;
      const column = (i % 3) - 1;
      let tx = mix(card.base.x, 4.26 + column * 1.2, certOpen);
      let ty = mix(card.base.y, 3.06 + (i < 3 ? 0.34 : -0.34), certOpen);
      let tz = card.base.z + 0.5 * certOpen;
      let ry = column * 0.24 * certOpen;
      let scale = 1;
      if (selected) {
        tx = mix(tx, 4.26, certOpen);
        ty = mix(ty, 3.06, certOpen);
        tz = mix(tz, -3.62, certOpen);
        ry = mix(ry, 0, certOpen);
        scale = 1 + 0.62 * certOpen;
      }
      const ease = reduced ? 1 : 1 - Math.exp(-dt * 6.5);
      const g = card.group;
      g.position.x += (tx - g.position.x) * ease;
      g.position.y += (ty - g.position.y) * ease;
      g.position.z += (tz - g.position.z) * ease;
      g.rotation.y += (ry - g.rotation.y) * ease;
      const nextScale = g.scale.x + (scale - g.scale.x) * ease;
      g.scale.setScalar(nextScale);
    });

    // the notebook lifts, turns and opens
    bookT += (bookGoal - bookT) * (1 - Math.exp(-dt * 3.6));
    if (reduced) bookT = bookGoal;
    if (Math.abs(bookT - bookGoal) < 0.0005) bookT = bookGoal;
    const lift = smooth(0.02, 0.52, bookT);
    bookRoot.position.set(
      bookBase.x + (bookOut.x - bookBase.x) * lift,
      bookBase.y + (bookOut.y - bookBase.y) * lift,
      bookBase.z + (bookOut.z - bookBase.z) * lift,
    );
    bookRoot.rotation.x = bookBase.rx + (bookOut.rx - bookBase.rx) * lift;
    bookRoot.rotation.y = bookBase.ry + (bookOut.ry - bookBase.ry) * lift;
    bookRoot.rotation.z = bookBase.rz + (bookOut.rz - bookBase.rz) * lift;
    closedBook.visible = bookT < 0.55;
    closedBook.rotation.y = -smooth(0.26, 0.55, bookT) * 1.4;
    openBook.visible = bookT >= 0.55;
    const spread = 0.03 + smooth(0.4, 0.96, bookT) * 0.22;
    leftPage.rotation.y = -spread;
    rightPage.rotation.y = spread;
    turningPage.rotation.y = Math.PI * smooth(0.56, 1, bookT);

    const now = new Date();
    const minutes = now.getMinutes() + now.getSeconds() / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    clockState.hourHand.rotation.z = -(hours / 12) * TAU;
    clockState.minuteHand.rotation.z = -(minutes / 60) * TAU;

    const pulse = 0.55 + Math.sin(t * 1.6) * 0.1;
    stripMat.emissiveIntensity = pulse;
    monitorLed.material.emissiveIntensity = 1.6 + Math.sin(t * 2.1) * 0.5;
    fanMats.forEach((mat, i) => {
      mat.emissiveIntensity = 1.1 + Math.sin(t * 2 + i) * 0.3;
    });
    pendantBulb.material.emissiveIntensity = 2.2 + Math.sin(t * 0.8) * 0.2;

    // curtains breathe a little
    scene.children.forEach(() => {});
  }

  // warm the screen texture once
  T.screen.draw(0);

  return {
    scene,
    camera: null,
    hotspots,
    pickables,
    cards,
    cardPoints,
    certCards,
    screens,
    focusPoints,
    setScreenMode,
    setBookOpen,
    setCardHold,
    beginCardDrag,
    moveCardDrag,
    endCardDrag,
    flipCard,
    setCertFocus,
    focusCert,
    getCertSelected,
    update,
    redraw: T.redraw,
  };
}
