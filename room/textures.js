// Procedural textures for the room. Everything is drawn on canvases at boot,
// so the site ships without a single image file.
import * as THREE from 'three';

export const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const SANS = '"Space Grotesk", Inter, system-ui, sans-serif';
export const SERIF = '"Instrument Serif", Georgia, serif';

let seed = 20260109;
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const rand = (a, b) => a + rnd() * (b - a);
export const pick = (list) => list[Math.floor(rnd() * list.length)];

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

function toTexture(canvas, aniso, { repeat, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = aniso;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ------------------------------- room surfaces ------------------------------ */

function woodCanvas() {
  const [canvas, g] = makeCanvas(1024, 1024);
  g.fillStyle = '#211a15';
  g.fillRect(0, 0, 1024, 1024);
  const rows = 8;
  const ph = 1024 / rows;
  for (let r = 0; r < rows; r += 1) {
    const y = r * ph;
    const offset = r % 2 ? 260 : 0;
    for (let k = -1; k < 3; k += 1) {
      const x = k * 520 + offset;
      const v = 0.82 + rnd() * 0.34;
      g.fillStyle = `rgb(${Math.round(80 * v)},${Math.round(62 * v)},${Math.round(49 * v)})`;
      g.fillRect(x + 2, y + 2, 514, ph - 4);
      for (let i = 0; i < 24; i += 1) {
        const gy = y + 6 + rnd() * (ph - 12);
        g.strokeStyle = `rgba(28,16,9,${0.05 + rnd() * 0.13})`;
        g.lineWidth = 0.5 + rnd() * 1.7;
        g.beginPath();
        for (let gx = x + 4; gx <= x + 514; gx += 26) {
          const yy = gy + Math.sin((gx + r * 63 + i * 21) * 0.013) * 2.6 + Math.sin(gx * 0.051 + i) * 0.9;
          if (gx === x + 4) g.moveTo(gx, yy);
          else g.lineTo(gx, yy);
        }
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(x + 514, y, 4, ph);
    }
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.fillRect(0, y + ph - 3, 1024, 3);
  }
  return canvas;
}

function wallCanvas() {
  const [canvas, g] = makeCanvas(512, 512);
  // warm plaster in daylight. Kept almost flat on purpose: large tonal blobs
  // read as stains once the texture is stretched across a whole wall, so this
  // is a clean warm white with nothing but fine tooth up close.
  g.fillStyle = '#d9c9ad';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 22000; i += 1) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,252,246,.5)' : 'rgba(196,183,164,.4)';
    g.fillRect(rnd() * 512, rnd() * 512, 1, 1);
  }
  for (let i = 0; i < 90; i += 1) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 30 + rnd() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rnd() > 0.5 ? 'rgba(255,250,240,.05)' : 'rgba(176,160,138,.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return canvas;
}

// Fine grain and leather relief, used as bump maps so solid-colour materials
// still catch light along a surface instead of reading as flat paint.
function grainCanvas() {
  const [canvas, g] = makeCanvas(512, 512);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 240; i += 1) {
    const x = rnd() * 512;
    g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.04 + rnd() * 0.1})` : `rgba(0,0,0,${0.04 + rnd() * 0.1})`;
    g.fillRect(x, 0, 1 + rnd() * 2.4, 512);
  }
  for (let i = 0; i < 9000; i += 1) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';
    g.fillRect(rnd() * 512, rnd() * 512, 1, 1);
  }
  return canvas;
}

function leatherCanvas() {
  const [canvas, g] = makeCanvas(512, 512);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i += 1) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 2 + rnd() * 9;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return canvas;
}

function rugCanvas() {
  const [canvas, g] = makeCanvas(768, 512);
  // a deep warm wool rather than near-black: in daylight the floor light has
  // somewhere to land instead of being swallowed by the rug
  g.fillStyle = '#4b3a2f';
  g.fillRect(0, 0, 768, 512);
  // wool weave
  for (let y = 0; y < 512; y += 4) {
    g.fillStyle = y % 8 === 0 ? 'rgba(255,222,196,.03)' : 'rgba(0,0,0,.055)';
    g.fillRect(0, y, 768, 2);
  }
  // muted clay border
  g.fillStyle = 'rgba(122,62,42,.55)';
  g.fillRect(0, 0, 768, 26);
  g.fillRect(0, 486, 768, 26);
  g.fillRect(0, 0, 26, 512);
  g.fillRect(742, 0, 26, 512);
  g.strokeStyle = 'rgba(219,180,142,.34)';
  g.lineWidth = 2;
  g.strokeRect(44, 44, 680, 424);
  // a quiet repeating motif, not a poster
  g.strokeStyle = 'rgba(206,155,116,.13)';
  g.lineWidth = 2;
  for (let x = 82; x < 700; x += 76) {
    for (let y = 82; y < 430; y += 76) {
      g.beginPath();
      g.moveTo(x, y - 13);
      g.lineTo(x + 13, y);
      g.lineTo(x, y + 13);
      g.lineTo(x - 13, y);
      g.closePath();
      g.stroke();
    }
  }
  // fibre grain
  for (let i = 0; i < 2400; i += 1) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,235,214,.05)' : 'rgba(0,0,0,.09)';
    g.fillRect(rnd() * 768, rnd() * 512, 1.5, 1.5);
  }
  return canvas;
}

function cityCanvas() {
  const [canvas, g] = makeCanvas(1600, 900);
  // the sun has already dropped behind the rooftops: deep blue overhead, a
  // band of warm dust at the skyline, and lit windows in the towers
  const sky = g.createLinearGradient(0, 0, 0, 900);
  sky.addColorStop(0, '#070c16');
  sky.addColorStop(0.34, '#101c30');
  sky.addColorStop(0.62, '#22304a');
  sky.addColorStop(0.82, '#4a4055');
  sky.addColorStop(0.94, '#7a5648');
  sky.addColorStop(1, '#38292a');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1600, 900);

  // the last of the sun, low and small
  const glow = g.createRadialGradient(1080, 700, 8, 1080, 700, 560);
  glow.addColorStop(0, 'rgba(255,186,116,.52)');
  glow.addColorStop(0.18, 'rgba(255,148,88,.22)');
  glow.addColorStop(0.58, 'rgba(170,104,78,.09)');
  glow.addColorStop(1, 'rgba(110,74,66,0)');
  g.fillStyle = glow;
  g.fillRect(380, 180, 1220, 720);

  // stars only where the sky is still dark
  for (let i = 0; i < 80; i += 1) {
    g.fillStyle = `rgba(226,236,255,${0.1 + rnd() * 0.35})`;
    g.fillRect(rnd() * 1600, rnd() * 320, 1.6, 1.6);
  }

  // thin drifts of cloud, lit from below
  for (let i = 0; i < 6; i += 1) {
    const y = 120 + rnd() * 300;
    const w = 220 + rnd() * 460;
    const x = rnd() * 1500 - 120;
    const cloud = g.createLinearGradient(x, y, x, y + 26);
    cloud.addColorStop(0, 'rgba(120,130,160,0)');
    cloud.addColorStop(0.55, `rgba(${90 + rnd() * 40},${100 + rnd() * 40},${140 + rnd() * 40},${0.1 + rnd() * 0.12})`);
    cloud.addColorStop(1, 'rgba(120,130,160,0)');
    g.fillStyle = cloud;
    g.fillRect(x, y, w, 26);
  }

  // skyline, back to front; every layer gets lit windows now
  const layers = [
    { base: 690, h: [130, 330], color: 'rgba(24,32,50,.78)', w: [40, 110], lit: 0.34 },
    { base: 770, h: [110, 380], color: 'rgba(14,20,33,.92)', w: [50, 130], lit: 0.44 },
    { base: 870, h: [60, 240], color: 'rgba(7,10,17,1)', w: [70, 170], lit: 0.52 },
  ];
  layers.forEach((layer, li) => {
    let x = -40;
    while (x < 1640) {
      const w = rand(layer.w[0], layer.w[1]);
      const h = rand(layer.h[0], layer.h[1]) * (li === 2 ? 0.8 : 1);
      g.fillStyle = layer.color;
      g.fillRect(x, layer.base - h, w, h + 200);
      const cols = Math.floor(w / 18);
      const rows = Math.floor(h / 22);
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (rnd() < layer.lit) {
            const warm = rnd() > 0.22;
            g.fillStyle = warm
              ? `rgba(255,196,128,${0.34 + rnd() * 0.5})`
              : `rgba(168,203,236,${0.26 + rnd() * 0.4})`;
            g.fillRect(x + 8 + c * 18, layer.base - h + 12 + r * 22, 6, 9);
          }
        }
      }
      // mast with an aircraft light
      if (rnd() > 0.72 && li < 2) {
        g.fillStyle = layer.color;
        g.fillRect(x + w * 0.5, layer.base - h - 40, 2, 40);
        g.fillStyle = 'rgba(255,110,80,.9)';
        g.fillRect(x + w * 0.5 - 1, layer.base - h - 42, 4, 3);
      }
      x += w + rand(4, 22);
    }
  });

  // near silhouettes, for depth through the glass
  g.fillStyle = 'rgba(6,8,13,.97)';
  g.fillRect(0, 838, 1600, 62);
  for (let i = 0; i < 14; i += 1) {
    const x = rand(-40, 1580);
    const h = rand(26, 74);
    g.fillRect(x, 842 - h, rand(50, 140), h + 60);
  }
  return canvas;
}

function posterCanvas(kind) {
  const [canvas, g] = makeCanvas(560, 760);
  if (kind === 0) {
    g.fillStyle = '#e9dfcd';
    g.fillRect(0, 0, 560, 760);
    g.fillStyle = '#1b1714';
    g.font = `500 22px ${MONO}`;
    g.fillText('K O U S H I K . D E V', 48, 78);
    g.strokeStyle = 'rgba(27,23,20,.3)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(48, 100);
    g.lineTo(512, 100);
    g.stroke();
    g.font = `500 108px ${SANS}`;
    g.fillText('BUILD', 44, 250);
    g.fillText('TEST', 44, 358);
    g.fillText('SHIP', 44, 466);
    g.fillStyle = '#c25a2e';
    g.fillRect(44, 502, 96, 8);
    g.fillStyle = '#1b1714';
    g.font = `400 20px ${MONO}`;
    g.fillText('P O R T F O L I O   2 0 2 6', 44, 682);
    g.font = `italic 400 26px ${SERIF}`;
    g.fillText('details, then delight', 44, 716);
  } else if (kind === 1) {
    g.fillStyle = '#b8532c';
    g.fillRect(0, 0, 560, 760);
    g.strokeStyle = 'rgba(255,232,210,.4)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 9; i += 1) {
      g.beginPath();
      g.arc(280, 320, 60 + i * 34, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#1b120d';
    g.font = `500 44px ${SANS}`;
    g.fillText('DETAIL IS', 44, 604);
    g.fillText('THE PRODUCT', 44, 652);
    g.font = `400 18px ${MONO}`;
    g.fillStyle = '#1b120d';
    g.fillText('N O . 0 2  /  C R A F T', 44, 706);
  } else {
    g.fillStyle = '#16131c';
    g.fillRect(0, 0, 560, 760);
    g.strokeStyle = 'rgba(255,178,122,.18)';
    g.lineWidth = 1;
    for (let x = 0; x < 560; x += 40) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 760);
      g.stroke();
    }
    for (let y = 0; y < 760; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(560, y);
      g.stroke();
    }
    g.fillStyle = '#ffb27a';
    g.font = `400 92px ${SERIF}`;
    g.fillText('room', 52, 300);
    g.fillStyle = '#f0e6d8';
    g.font = `500 26px ${MONO}`;
    g.fillText('S T U D I O  /  N O . 0 1', 52, 360);
    g.fillStyle = 'rgba(240,230,216,.5)';
    g.font = `400 17px ${MONO}`;
    g.fillText('A small workspace,', 52, 654);
    g.fillText('built from code.', 52, 680);
  }
  return canvas;
}

function certCanvas(index, title, issuer, date) {
  const [canvas, g] = makeCanvas(520, 380);
  g.fillStyle = '#ece3d2';
  g.fillRect(0, 0, 520, 380);
  g.strokeStyle = 'rgba(60,44,32,.35)';
  g.lineWidth = 2;
  g.strokeRect(18, 18, 484, 344);
  g.strokeStyle = 'rgba(60,44,32,.16)';
  g.lineWidth = 1;
  g.strokeRect(27, 27, 466, 326);
  g.fillStyle = '#8a5b32';
  g.font = `500 13px ${MONO}`;
  g.fillText('CERTIFICATE OF COMPLETION', 40, 66);
  g.fillStyle = '#1d1815';
  const words = title.split(' ');
  const lines = [];
  let line = '';
  g.font = `600 34px ${SANS}`;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > 430) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  lines.push(line);
  lines.slice(0, 3).forEach((l, i) => g.fillText(l, 40, 150 + i * 42));
  g.fillStyle = 'rgba(29,24,21,.66)';
  g.font = `400 15px ${MONO}`;
  g.fillText(issuer, 40, 286);
  g.fillText(date, 40, 310);
  // seal
  g.fillStyle = '#b0532b';
  g.beginPath();
  g.arc(438, 292, 34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f2e8d7';
  g.font = `500 15px ${MONO}`;
  g.textAlign = 'center';
  g.fillText(String(index + 1).padStart(2, '0'), 438, 298);
  g.textAlign = 'left';
  return canvas;
}

/* --------------------------- experience cards ----------------------------- */

function experienceCardCanvas(item, index, back = false) {
  // Drawn at 2x so the printed faces stay sharp when the camera pushes in.
  const [canvas, g] = makeCanvas(1240, 1800);
  g.scale(2, 2);
  const W = 620;
  const H = 900;
  const accent = ['#8a332b', '#2f5a4f', '#544766', '#33495c'][index % 4];

  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#eadfc9');
  paper.addColorStop(0.6, '#dccbb0');
  paper.addColorStop(1, '#c3ab8a');
  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);

  const sheen = g.createRadialGradient(W * 0.82, 0, 10, W * 0.82, 0, W * 0.9);
  sheen.addColorStop(0, 'rgba(255,255,255,.45)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, W, H);

  // the punch slot
  roundRect(g, W / 2 - 52, 16, 104, 14, 7);
  g.fillStyle = '#1d1611';
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 2;
  g.stroke();

  g.textAlign = 'left';

  if (back) {
    g.fillStyle = accent;
    g.fillRect(0, 52, W, 6);

    g.fillStyle = 'rgba(36,27,21,.6)';
    g.font = `500 17px ${MONO}`;
    g.fillText('WHAT I DID', 46, 108);
    g.textAlign = 'right';
    g.fillText(`${String(index + 1).padStart(2, '0')} / 02`, W - 46, 108);
    g.textAlign = 'left';

    g.fillStyle = '#241b15';
    fitLine(g, item.org, 46, 156, 520, { size: 36, weight: 600, family: SANS });

    g.fillStyle = accent;
    g.font = `500 21px ${MONO}`;
    g.fillText(item.period.toUpperCase(), 46, 210);

    g.fillStyle = '#241b15';
    fitLine(g, item.role, 46, 276, 528, { size: 46, style: 'italic', family: SERIF });

    g.fillStyle = '#2a2018';
    g.font = `400 19px ${MONO}`;
    wrapText(g, item.meta, 46, 344, 520, 26);

    g.strokeStyle = 'rgba(36,27,21,.2)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(46, 372);
    g.lineTo(W - 46, 372);
    g.stroke();

    let y = 404;
    item.points.forEach((point) => {
      g.fillStyle = accent;
      g.beginPath();
      g.arc(52, y - 6, 3.8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1f1710';
      // the record is the reason to turn the card over: give it the room
      g.font = `500 26px ${SANS}`;
      const lines = wrapText(g, point, 76, y, 510, 36);
      y += lines * 36 + 20;
    });

    g.fillStyle = 'rgba(36,27,21,.5)';
    g.font = `400 15px ${MONO}`;
    g.fillText('TURN THE CARD BACK FOR THE FRONT', 46, H - 40);
    return canvas;
  }

  // front: company band, portrait, role, dates and the record in short
  g.fillStyle = accent;
  g.fillRect(0, 44, W, 132);
  g.fillStyle = '#f8ead2';
  fitLine(g, item.org.toUpperCase(), 44, 106, 372, { size: 44, weight: 600, family: SANS });
  g.font = `500 17px ${MONO}`;
  g.textAlign = 'right';
  g.fillText(`ID ${String(index + 1).padStart(2, '0')}`, W - 44, 92);
  g.fillText('STUDIO PASS', W - 44, 120);
  g.textAlign = 'left';

  // portrait block
  g.fillStyle = '#241b15';
  roundRect(g, 44, 200, 230, 220, 12);
  g.fill();
  const glow = g.createRadialGradient(159, 300, 8, 159, 300, 170);
  glow.addColorStop(0, 'rgba(255,178,122,.4)');
  glow.addColorStop(1, 'rgba(255,178,122,0)');
  g.fillStyle = glow;
  roundRect(g, 44, 200, 230, 220, 12);
  g.fill();
  g.fillStyle = '#f2e2c8';
  g.font = `italic 400 84px ${SERIF}`;
  g.textAlign = 'center';
  g.fillText('KR', 159, 332);
  g.textAlign = 'left';

  g.fillStyle = '#241b15';
  g.font = `italic 400 56px ${SERIF}`;
  g.fillText('Koushik', 300, 274);
  g.fillText('Raju', 300, 332);
  g.fillStyle = 'rgba(36,27,21,.7)';
  g.font = `500 17px ${MONO}`;
  wrapText(g, 'DEVELOPER · TESTER · DESIGNER', 300, 372, 280, 24);

  g.strokeStyle = 'rgba(36,27,21,.2)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(44, 444);
  g.lineTo(W - 44, 444);
  g.stroke();

  g.fillStyle = accent;
  g.font = `500 16px ${MONO}`;
  g.fillText('ROLE', 44, 482);
  g.fillStyle = '#241b15';
  g.font = `italic 400 42px ${SERIF}`;
  wrapText(g, item.role, 44, 524, 524, 46);

  g.fillStyle = 'rgba(36,27,21,.55)';
  g.font = `500 15px ${MONO}`;
  g.fillText('PERIOD', 44, 612);
  g.fillStyle = '#241b15';
  g.font = `500 30px ${MONO}`;
  g.fillText(item.period.toUpperCase(), 44, 650);

  g.fillStyle = 'rgba(36,27,21,.55)';
  g.font = `500 15px ${MONO}`;
  g.fillText('DETAIL', 44, 692);
  g.fillStyle = '#241b15';
  g.font = `400 21px ${SANS}`;
  wrapText(g, item.meta, 44, 722, 526, 27);

  // barcode
  let bx = 44;
  let seed = index * 977 + 13;
  for (let i = 0; i < 46; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const wBar = 2 + (seed % 5);
    if (i % 2 === 0) {
      g.fillStyle = 'rgba(30,24,20,.82)';
      g.fillRect(bx, 802, wBar, 34);
    }
    bx += wBar + 4;
  }
  g.fillStyle = 'rgba(36,27,21,.55)';
  g.font = `400 14px ${MONO}`;
  g.fillText(`KR-2026-${String(index + 1).padStart(3, '0')}`, 44, H - 40);
  g.textAlign = 'right';
  g.fillText('CLICK TO TURN OVER', W - 44, H - 40);
  g.textAlign = 'left';

  return canvas;
}

function pegboardCanvas() {
  const [canvas, g] = makeCanvas(512, 256);
  g.fillStyle = '#242230';
  g.fillRect(0, 0, 512, 256);
  const shade = g.createLinearGradient(0, 0, 0, 256);
  shade.addColorStop(0, 'rgba(255,178,122,.12)');
  shade.addColorStop(0.7, 'rgba(0,0,0,0)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 512, 256);
  for (let y = 18; y < 256; y += 26) {
    for (let x = 18; x < 512; x += 26) {
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.beginPath();
      g.arc(x, y, 3.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.07)';
      g.beginPath();
      g.arc(x - 0.8, y - 0.8, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  return canvas;
}

/* --------------------------------- screens --------------------------------- */

function drawHomeScreen(g, W, H, t) {
  g.fillStyle = '#0e0c11';
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.2, H * 0.1, 20, W * 0.2, H * 0.1, W * 0.75);
  glow.addColorStop(0, 'rgba(255,146,84,.13)');
  glow.addColorStop(1, 'rgba(255,146,84,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // wallpaper grid
  g.strokeStyle = 'rgba(255,255,255,.022)';
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let y = 0; y < H; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }

  // top bar
  g.fillStyle = 'rgba(12,10,14,.86)';
  g.fillRect(0, 0, W, 46);
  g.fillStyle = '#ff9d72';
  g.beginPath();
  g.arc(28, 23, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)';
  g.beginPath();
  g.arc(48, 23, 5, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(68, 23, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(240,232,221,.5)';
  g.font = `400 15px ${MONO}`;
  g.fillText('koushik@studio  ~/portfolio', 100, 29);
  const now = new Date();
  g.textAlign = 'right';
  g.fillStyle = 'rgba(240,232,221,.62)';
  g.fillText(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, W - 26, 29);
  g.textAlign = 'left';

  // dock
  g.fillStyle = 'rgba(18,15,21,.7)';
  roundRect(g, 16, 64, 54, 470, 14);
  g.fill();
  for (let i = 0; i < 5; i += 1) {
    g.fillStyle = i === 0 ? '#ff9d72' : 'rgba(240,232,221,.22)';
    roundRect(g, 30, 82 + i * 58, 26, 26, 7);
    g.fill();
  }

  // editor window
  const ex = 88;
  const ey = 66;
  const ew = 742;
  const eh = 442;
  g.fillStyle = 'rgba(20,17,24,.96)';
  roundRect(g, ex, ey, ew, eh, 12);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.035)';
  roundRect(g, ex, ey, ew, 38, 12);
  g.fill();
  g.fillStyle = '#ffb27a';
  g.font = `400 14px ${MONO}`;
  g.fillText('portfolio.ts', ex + 20, ey + 25);
  g.fillStyle = 'rgba(240,232,221,.3)';
  g.fillText('room.ts', ex + 140, ey + 25);
  g.fillText('about.md', ex + 220, ey + 25);

  const lines = [
    [['const ', '#ff9d72'], ['studio', '#f2e8da'], [' = {', 'rgba(240,232,221,.55)']],
    [['  name: ', '#b9a7c9'], ["'Koushik Raju',", '#a9c3a0']],
    [['  role: ', '#b9a7c9'], ["'Developer · Tester',", '#a9c3a0']],
    [['  stack: ', '#b9a7c9'], ["['React', 'Java', 'MySQL'],", '#a9c3a0']],
    [['  ships: ', '#b9a7c9'], ['true,', '#e0b287']],
    [['}', 'rgba(240,232,221,.55)']],
    [],
    [['// the part most people skip', 'rgba(240,232,221,.28)']],
    [['function ', '#ff9d72'], ['ship', '#e3c0ff'], ['(idea) {', 'rgba(240,232,221,.55)']],
    [['  const ', '#ff9d72'], ['spec', '#f2e8da'], [' = plan(idea)', 'rgba(240,232,221,.6)']],
    [['  return ', '#ff9d72'], ['test', '#e3c0ff'], ['(build(spec))', 'rgba(240,232,221,.6)']],
    [['}', 'rgba(240,232,221,.55)']],
  ];
  let ly = ey + 86;
  lines.forEach((segments, index) => {
    g.fillStyle = 'rgba(240,232,221,.18)';
    g.font = `400 14px ${MONO}`;
    g.fillText(String(index + 1).padStart(2, '0'), ex + 16, ly);
    let lx = ex + 48;
    segments.forEach(([text, color]) => {
      g.fillStyle = color;
      g.font = `400 16px ${MONO}`;
      g.fillText(text, lx, ly);
      lx += g.measureText(text).width;
    });
    ly += 28;
  });

  // caret
  if (Math.sin(t * 3.4) > -0.2) {
    g.fillStyle = '#ffb27a';
    g.fillRect(ex + 48, ly - 22, 2, 18);
  }

  // terminal
  const ty = 524;
  g.fillStyle = 'rgba(14,12,17,.96)';
  roundRect(g, ex, ty, ew, 160, 12);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.stroke();
  g.fillStyle = 'rgba(240,232,221,.4)';
  g.font = `400 14px ${MONO}`;
  g.fillText('terminal — zsh', ex + 20, ty + 26);
  g.fillStyle = '#ff9d72';
  g.fillText('$', ex + 20, ty + 62);
  g.fillStyle = '#f2e8da';
  g.fillText('npm run studio', ex + 40, ty + 62);
  g.fillStyle = 'rgba(240,232,221,.6)';
  g.fillText('✓ room compiled     ✓ 4 sections wired', ex + 20, ty + 92);
  g.fillStyle = '#a9c3a0';
  g.fillText('● open to work — koushikrajusr@gmail.com', ex + 20, ty + 120);
  g.fillStyle = 'rgba(240,232,221,.3)';
  g.fillText('quality is a feature, not a phase', ex + 20, ty + 146);

  // sidebar
  const sx = 854;
  const sw = 398;
  g.fillStyle = 'rgba(20,17,24,.96)';
  roundRect(g, sx, 66, sw, 618, 12);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.stroke();
  g.fillStyle = '#ffb27a';
  g.font = `500 13px ${MONO}`;
  g.fillText('N O W', sx + 24, 104);
  const rows = [
    ['role', 'QA @ EXAR'],
    ['building', 'this room'],
    ['learning', 'Three.js'],
    ['reading', 'a stack of books'],
    ['after 7pm', 'skating'],
  ];
  let ry = 146;
  rows.forEach(([k, v]) => {
    g.fillStyle = 'rgba(240,232,221,.32)';
    g.font = `400 13px ${MONO}`;
    g.fillText(k, sx + 24, ry);
    g.fillStyle = '#f2e8da';
    g.font = `400 16px ${SANS}`;
    g.fillText(v, sx + 116, ry);
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.beginPath();
    g.moveTo(sx + 24, ry + 18);
    g.lineTo(sx + sw - 24, ry + 18);
    g.stroke();
    ry += 56;
  });

  // equaliser
  g.fillStyle = 'rgba(255,178,122,.75)';
  for (let i = 0; i < 26; i += 1) {
    const h = 8 + Math.abs(Math.sin(t * 1.6 + i * 0.6)) * 42;
    g.fillRect(sx + 24 + i * 13, 470 - h, 5, h);
  }
  g.fillStyle = 'rgba(240,232,221,.28)';
  g.font = `400 13px ${MONO}`;
  g.fillText('ambient · room tone', sx + 24, 500);
  g.fillStyle = 'rgba(255,178,122,.9)';
  g.font = `400 42px ${SERIF}`;
  g.fillText('make it', sx + 24, 576);
  g.fillText('hold up.', sx + 24, 622);
  g.fillStyle = 'rgba(240,232,221,.34)';
  g.font = `400 13px ${MONO}`;
  g.fillText('PORTFOLIO  /  2026', sx + 24, 660);
}

function drawProjectsScreen(g, W, H, t) {
  g.fillStyle = '#0e0c11';
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.7, H * 0.8, 20, W * 0.7, H * 0.8, W * 0.7);
  glow.addColorStop(0, 'rgba(255,146,84,.12)');
  glow.addColorStop(1, 'rgba(255,146,84,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  g.fillStyle = 'rgba(12,10,14,.9)';
  g.fillRect(0, 0, W, 46);
  g.fillStyle = '#ff9d72';
  g.beginPath();
  g.arc(28, 23, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(240,232,221,.55)';
  g.font = `400 15px ${MONO}`;
  g.fillText('workspace  /  selected work', 60, 29);
  g.textAlign = 'right';
  g.fillText('03 projects · 06 experiments', W - 26, 29);
  g.textAlign = 'left';

  g.fillStyle = '#ffb27a';
  g.font = `500 13px ${MONO}`;
  g.fillText('S E L E C T E D   W O R K', 56, 104);
  g.fillStyle = '#f2e8da';
  g.font = `500 52px ${SANS}`;
  g.fillText('Things I built', 52, 166);
  g.font = `400 20px ${SERIF}`;
  g.fillStyle = 'rgba(240,232,221,.5)';
  g.fillText('and tested until they behaved.', 300, 166);

  const tiles = [
    ['01', 'Library Management', 'Python · MySQL', 'Full stack'],
    ['02', 'AWS Hosting', 'EC2 · S3 · IAM', 'Cloud'],
    ['03', 'Decentralized Hosting', 'Solidity · Web3.js', 'Blockchain'],
  ];
  tiles.forEach(([n, name, stack, kind], i) => {
    const x = 52 + (i % 3) * 392;
    const y = 210;
    g.fillStyle = 'rgba(24,20,28,.95)';
    roundRect(g, x, y, 372, 236, 14);
    g.fill();
    g.strokeStyle = i === 0 ? 'rgba(255,157,114,.5)' : 'rgba(255,255,255,.08)';
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = i === 0 ? '#ff9d72' : 'rgba(240,232,221,.35)';
    g.font = `400 14px ${MONO}`;
    g.fillText(n, x + 24, y + 40);
    g.fillStyle = 'rgba(240,232,221,.35)';
    g.textAlign = 'right';
    g.fillText(kind.toUpperCase(), x + 348, y + 40);
    g.textAlign = 'left';
    g.fillStyle = '#f2e8da';
    g.font = `500 30px ${SANS}`;
    const words = name.split(' ');
    g.fillText(words[0], x + 24, y + 104);
    g.fillText(words.slice(1).join(' '), x + 24, y + 140);
    g.fillStyle = 'rgba(240,232,221,.42)';
    g.font = `400 14px ${MONO}`;
    g.fillText(stack, x + 24, y + 196);
  });

  g.fillStyle = 'rgba(240,232,221,.3)';
  g.font = `400 13px ${MONO}`;
  g.fillText('M I N I   L A B', 56, 506);
  const mini = ['Snake', '2048', 'Tic Tac Toe', 'Pong', 'Memory', 'Tasks'];
  mini.forEach((name, i) => {
    const x = 52 + i * 190;
    g.fillStyle = 'rgba(255,255,255,.045)';
    roundRect(g, x, 528, 172, 52, 10);
    g.fill();
    g.fillStyle = 'rgba(240,232,221,.72)';
    g.font = `400 16px ${SANS}`;
    g.fillText(name, x + 18, 560);
  });
  g.fillStyle = 'rgba(255,178,122,.75)';
  g.font = `400 14px ${MONO}`;
  g.fillText('open the panel to read the case studies →', 52, 636);

  if (Math.sin(t * 3) > 0) {
    g.fillStyle = '#ffb27a';
    g.fillRect(52, 660, 10, 10);
  }
}

/* --------------------------- objects with type ------------------------------ */

function idCardCanvas(back = false) {
  const [canvas, g] = makeCanvas(620, 900);
  const W = 620;
  const H = 900;

  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#f4ead8');
  paper.addColorStop(0.58, '#e6d6bc');
  paper.addColorStop(1, '#cdb795');
  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);

  const sheen = g.createRadialGradient(W * 0.8, 0, 10, W * 0.8, 0, W * 0.9);
  sheen.addColorStop(0, 'rgba(255,255,255,.5)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, W, H);

  // the punch slot
  roundRect(g, W / 2 - 52, 16, 104, 14, 7);
  g.fillStyle = '#1d1611';
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 2;
  g.stroke();

  if (back) {
    g.fillStyle = '#b5402c';
    g.fillRect(0, 52, W, 6);

    g.fillStyle = 'rgba(36,27,21,.55)';
    g.font = `500 15px ${MONO}`;
    g.fillText('IF FOUND, PLEASE RETURN', 48, 112);

    g.fillStyle = '#241b15';
    g.font = `italic 400 56px ${SERIF}`;
    g.fillText('Koushik Raju', 46, 190);

    g.fillStyle = 'rgba(36,27,21,.66)';
    g.font = `400 18px ${SANS}`;
    wrapText(g, 'Developer, tester and designer. This badge belongs to the person who reads the error message first.', 46, 236, 500, 30);

    g.strokeStyle = 'rgba(36,27,21,.18)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(46, 340);
    g.lineTo(W - 46, 340);
    g.stroke();

    const rows = [
      ['EMAIL', 'koushikrajusr@gmail.com'],
      ['GITHUB', 'github.com/Koushik-raju'],
      ['LINKEDIN', 'linkedin.com/in/koushik-raju-s-r'],
      ['BASED', 'India · open to remote'],
    ];
    let y = 386;
    rows.forEach(([label, value]) => {
      g.fillStyle = 'rgba(36,27,21,.42)';
      g.font = `500 13px ${MONO}`;
      g.fillText(label, 46, y);
      g.fillStyle = '#241b15';
      g.font = `400 20px ${SANS}`;
      g.fillText(value, 46, y + 28);
      y += 78;
    });

    g.fillStyle = 'rgba(36,27,21,.5)';
    g.font = `400 14px ${MONO}`;
    g.fillText('STUDIO PASS · 2026', 46, H - 58);

    g.fillStyle = 'rgba(181,64,44,.75)';
    g.font = `italic 400 64px ${SERIF}`;
    g.fillText('K', W - 96, H - 44);
    return canvas;
  }

  // front
  g.fillStyle = '#9d2f20';
  g.fillRect(0, 44, W, 78);
  g.fillStyle = '#f8ead2';
  g.font = `500 17px ${MONO}`;
  g.fillText('STUDIO PASS', 48, 78);
  g.fillText('KR / 01', W - 148, 78);
  g.fillStyle = 'rgba(248,234,210,.6)';
  g.font = `400 11px ${MONO}`;
  g.fillText('IDENTITY CARD · 2026', 48, 100);

  // portrait block
  g.fillStyle = '#241b15';
  roundRect(g, 46, 154, 238, 286, 12);
  g.fill();
  const glow = g.createRadialGradient(165, 236, 8, 165, 236, 190);
  glow.addColorStop(0, 'rgba(255,178,122,.5)');
  glow.addColorStop(1, 'rgba(255,178,122,0)');
  g.fillStyle = glow;
  g.fillRect(46, 154, 238, 286);
  g.fillStyle = '#efb27f';
  g.font = `italic 400 152px ${SERIF}`;
  g.textAlign = 'center';
  g.fillText('KR', 165, 318);
  g.textAlign = 'left';
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.strokeRect(58, 166, 214, 262);

  g.fillStyle = 'rgba(36,27,21,.48)';
  g.font = `500 13px ${MONO}`;
  g.fillText('NAME', 306, 178);
  g.fillStyle = '#241b15';
  g.font = `italic 400 52px ${SERIF}`;
  g.fillText('Koushik', 304, 232);
  g.fillText('Raju', 304, 282);

  g.fillStyle = 'rgba(36,27,21,.58)';
  g.font = `500 13px ${MONO}`;
  g.fillText('DESIGNATION', 306, 330);
  g.fillStyle = '#241b15';
  g.font = `400 19px ${SANS}`;
  wrapText(g, 'Developer · Tester · Designer', 306, 358, 268, 26);

  g.fillStyle = 'rgba(36,27,21,.58)';
  g.font = `500 13px ${MONO}`;
  g.fillText('STATUS', 306, 424);
  g.fillStyle = '#8c2f24';
  g.beginPath();
  g.arc(310, 448, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#241b15';
  g.font = `400 17px ${SANS}`;
  g.fillText('Open to work', 326, 454);

  // barcode
  let x = 46;
  for (let i = 0; i < 54; i += 1) {
    const w = 1.6 + (i % 4) * 0.9;
    g.fillStyle = 'rgba(36,27,21,.72)';
    g.fillRect(x, 700, w, 58);
    x += w + 2.6 + (i % 3) * 1.6;
  }
  g.fillStyle = 'rgba(36,27,21,.55)';
  g.font = `400 13px ${MONO}`;
  g.fillText('KR-2026-001', 46, 790);

  g.strokeStyle = 'rgba(36,27,21,.2)';
  g.beginPath();
  g.moveTo(46, 824);
  g.lineTo(W - 46, 824);
  g.stroke();
  g.fillStyle = 'rgba(36,27,21,.45)';
  g.font = `500 11px ${MONO}`;
  g.fillText('KR STUDIO · INDIA / REMOTE', 46, 852);

  return canvas;
}

function wrapText(g, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cursor = y;
  let lines = 1;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) {
      g.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
      lines += 1;
    } else {
      line = test;
    }
  });
  if (line) g.fillText(line, x, cursor);
  return lines;
}

// Draw a single line, shrinking it until it genuinely fits the printed width.
// Long roles used to run straight off the edge of the card.
function fitLine(g, text, x, y, maxWidth, { size, weight = 400, family = SANS, style = '' } = {}) {
  let px = size;
  const setFont = () => {
    g.font = `${style ? `${style} ` : ''}${weight} ${px}px ${family}`;
  };
  setFont();
  while (px > 10 && g.measureText(text).width > maxWidth) {
    px -= 1;
    setFont();
  }
  g.fillText(text, x, y);
  return px;
}

function bookCoverCanvas() {
  const [canvas, g] = makeCanvas(600, 840);
  const W = 600;
  const H = 840;
  g.fillStyle = '#e9e4da';
  g.fillRect(0, 0, W, H);

  // cloth grain
  for (let i = 0; i < 1400; i += 1) {
    g.fillStyle = `rgba(60,50,40,${0.012 + rnd() * 0.024})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1);
  }

  g.strokeStyle = 'rgba(36,27,21,.24)';
  g.lineWidth = 2;
  g.strokeRect(34, 34, W - 68, H - 68);
  g.strokeStyle = 'rgba(36,27,21,.1)';
  g.strokeRect(44, 44, W - 88, H - 88);

  g.fillStyle = 'rgba(36,27,21,.5)';
  g.font = `500 15px ${MONO}`;
  g.fillText('A WORKING NOTEBOOK', 66, 104);
  g.fillText('NO. 01', W - 152, 104);

  g.fillStyle = '#241b15';
  g.font = `italic 400 92px ${SERIF}`;
  g.fillText('Koushik', 62, 300);
  g.font = `italic 400 116px ${SERIF}`;
  g.fillText('Raju', 62, 404);

  g.strokeStyle = 'rgba(36,27,21,.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(66, 456);
  g.lineTo(W - 66, 456);
  g.stroke();

  g.fillStyle = 'rgba(36,27,21,.7)';
  g.font = `400 21px ${SANS}`;
  g.fillText('Developer · Tester · Designer', 66, 496);

  g.fillStyle = 'rgba(36,27,21,.45)';
  g.font = `400 15px ${MONO}`;
  wrapText(g, 'Notes on building things, testing them, and the parts in between.', 66, 554, 300, 24);

  // blind-embossed monogram
  g.strokeStyle = 'rgba(36,27,21,.24)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(W - 142, H - 168, 62, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(36,27,21,.35)';
  g.font = `italic 400 54px ${SERIF}`;
  g.textAlign = 'center';
  g.fillText('KR', W - 142, H - 148);
  g.textAlign = 'left';

  g.fillStyle = 'rgba(36,27,21,.5)';
  g.font = `500 12px ${MONO}`;
  g.fillText('PORTFOLIO / 2026', 66, H - 76);

  return canvas;
}

function strapCanvas() {
  const [canvas, g] = makeCanvas(96, 768);
  g.fillStyle = '#17151a';
  g.fillRect(0, 0, 96, 768);
  // woven fabric
  g.strokeStyle = 'rgba(255,255,255,.035)';
  g.lineWidth = 1;
  for (let y = -40; y < 800; y += 7) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(96, y + 40);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.setLineDash([3, 5]);
  g.beginPath();
  g.moveTo(9, 0);
  g.lineTo(9, 768);
  g.moveTo(87, 0);
  g.lineTo(87, 768);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(240,231,214,.82)';
  g.font = `600 17px ${MONO}`;
  g.textAlign = 'center';
  for (let y = 200; y < 760; y += 190) {
    g.save();
    g.translate(48, y);
    g.rotate(Math.PI / 2);
    g.fillText('K R  ·  S T U D I O', 0, 0);
    g.restore();
  }
  g.textAlign = 'left';
  return canvas;
}

function bookPageCanvas() {
  const [canvas, g] = makeCanvas(900, 1240);
  g.fillStyle = '#f0e7d6';
  g.fillRect(0, 0, 900, 1240);
  // faint ruled paper
  g.strokeStyle = 'rgba(80,60,40,.055)';
  g.lineWidth = 1;
  for (let y = 150; y < 1200; y += 34) {
    g.beginPath();
    g.moveTo(80, y);
    g.lineTo(820, y);
    g.stroke();
  }
  g.fillStyle = 'rgba(36,27,21,.42)';
  g.font = `500 16px ${MONO}`;
  g.fillText('CHAPTER ONE', 80, 112);
  g.fillStyle = '#241b15';
  g.font = `italic 400 66px ${SERIF}`;
  g.fillText('The short version', 76, 208);
  g.fillStyle = 'rgba(36,27,21,.6)';
  g.font = `400 22px ${SANS}`;
  wrapText(g, 'A developer and QA engineer with an eye for detail — the part where a product stops being a demo and starts being reliable.', 80, 280, 700, 36);

  g.fillStyle = 'rgba(36,27,21,.25)';
  g.font = `400 15px ${MONO}`;
  g.fillText('01', 450, 1190);

  return canvas;
}

/* --------------------------------- exports --------------------------------- */

export function createTextures(renderer, experienceList = []) {
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const redraws = [];

  const floor = toTexture(woodCanvas(), aniso, { repeat: [5.2, 4.2] });
  const wall = toTexture(wallCanvas(), aniso, { repeat: [3, 1.5] });
  const grain = toTexture(grainCanvas(), aniso, { repeat: [2, 2], srgb: false });
  const leather = toTexture(leatherCanvas(), aniso, { repeat: [3, 3], srgb: false });
  const rug = toTexture(rugCanvas(), aniso);
  const city = toTexture(cityCanvas(), aniso);

  const posters = [0, 1, 2].map((kind, i) => {
    const canvas = posterCanvas(kind);
    const texture = toTexture(canvas, aniso);
    redraws.push(() => {
      const next = posterCanvas(kind);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(next, 0, 0);
      texture.needsUpdate = true;
    });
    return { texture, kind: i };
  });

  const certData = [
    ['Cloud Computing (AWS)', 'Indigeneous Tech', 'April 2022'],
    ['Blockchain Professional', 'Indigeneous Tech', 'September 2022'],
    ['React JS', 'Simplilearn', 'November 2022'],
    ['NodeJS', 'Simplilearn', 'November 2022'],
    ['JavaScript', 'Simplilearn', 'October 2022'],
    ['Cyber Security & Ethical Hacking', 'Ditto Security', 'April 2022'],
  ];
  const certs = certData.map(([title, issuer, date], i) => {
    const canvas = certCanvas(i, title, issuer, date);
    const texture = toTexture(canvas, aniso);
    redraws.push(() => {
      const next = certCanvas(i, title, issuer, date);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(next, 0, 0);
      texture.needsUpdate = true;
    });
    return texture;
  });

  // main monitor: live canvas
  // Draw the live monitor at 0.75 scale: the card is a metre away at most, so
  // the smaller upload is invisible but much cheaper to re-send to the GPU.
  const [screenCanvas, sg] = makeCanvas(960, 540);
  const screenTexture = toTexture(screenCanvas, aniso);
  const screen = {
    mode: 'home',
    draw(t) {
      sg.setTransform(0.75, 0, 0, 0.75, 0, 0);
      if (this.mode === 'projects') drawProjectsScreen(sg, 1280, 720, t);
      else drawHomeScreen(sg, 1280, 720, t);
      screenTexture.needsUpdate = true;
    },
  };

  // secondary monitor: a bold status panel. It reads at roughly 120 px wide
  // from across the room, so it carries a few very large marks instead of the
  // dense little interface that collapsed into noise and looked broken.
  const [miniCanvas, mg] = makeCanvas(640, 960);
  const miniTexture = toTexture(miniCanvas, aniso);
  const drawMini = () => {
    mg.fillStyle = '#0d0b10';
    mg.fillRect(0, 0, 640, 960);
    const g2 = mg.createLinearGradient(0, 0, 0, 960);
    g2.addColorStop(0, 'rgba(255,146,84,.18)');
    g2.addColorStop(0.5, 'rgba(255,146,84,0)');
    mg.fillStyle = g2;
    mg.fillRect(0, 0, 640, 960);

    mg.fillStyle = 'rgba(240,232,221,.45)';
    mg.font = `400 30px ${MONO}`;
    mg.fillText('SYSTEM CHECK', 44, 92);
    mg.textAlign = 'right';
    mg.fillStyle = 'rgba(255,178,122,.8)';
    mg.font = `400 26px ${MONO}`;
    mg.fillText('LIVE', 548, 92);
    mg.textAlign = 'left';
    mg.fillStyle = '#ffb27a';
    mg.beginPath();
    mg.arc(568, 82, 7, 0, Math.PI * 2);
    mg.fill();

    mg.fillStyle = 'rgba(255,255,255,.08)';
    mg.fillRect(44, 128, 552, 2);

    mg.fillStyle = '#f2e8da';
    mg.font = `500 148px ${SANS}`;
    mg.fillText('ALL', 40, 300);
    mg.fillStyle = '#ffb27a';
    mg.fillText('GOOD', 40, 442);

    mg.fillStyle = 'rgba(240,232,221,.55)';
    mg.font = `400 34px ${MONO}`;
    mg.fillText('open to work', 44, 528);

    mg.fillStyle = 'rgba(255,255,255,.08)';
    mg.fillRect(44, 570, 552, 2);

    const rows = [
      ['Interface', 0.92],
      ['Frontend', 0.86],
      ['Testing', 0.9],
    ];
    let y = 664;
    rows.forEach(([label, value]) => {
      mg.fillStyle = 'rgba(240,232,221,.6)';
      mg.font = `400 38px ${MONO}`;
      mg.fillText(label, 44, y);
      mg.fillStyle = 'rgba(255,255,255,.1)';
      mg.fillRect(44, y + 26, 552, 18);
      mg.fillStyle = '#ffb27a';
      mg.fillRect(44, y + 26, 552 * value, 18);
      y += 94;
    });

    miniTexture.needsUpdate = true;
  };
  drawMini();
  redraws.push(drawMini);

  // laptop screen: Contact is read on this display, so it holds a clean card
  // rather than a wall of tiny editor text that turned to noise at distance.
  const [lapCanvas, lg] = makeCanvas(1024, 640);
  const laptopTexture = toTexture(lapCanvas, aniso);
  const drawLaptop = () => {
    lg.fillStyle = '#0c0a0f';
    lg.fillRect(0, 0, 1024, 640);
    const glow = lg.createRadialGradient(170, 30, 10, 170, 30, 620);
    glow.addColorStop(0, 'rgba(255,146,84,.14)');
    glow.addColorStop(1, 'rgba(255,146,84,0)');
    lg.fillStyle = glow;
    lg.fillRect(0, 0, 1024, 640);

    lg.fillStyle = 'rgba(240,232,221,.4)';
    lg.font = `400 20px ${MONO}`;
    lg.fillText('~/contact', 56, 74);
    lg.textAlign = 'right';
    lg.fillStyle = '#c39a78';
    lg.font = `500 18px ${MONO}`;
    lg.fillText('OPEN TO WORK', 968, 74);
    lg.textAlign = 'left';
    lg.fillStyle = 'rgba(255,255,255,.07)';
    lg.fillRect(56, 102, 912, 1);

    lg.fillStyle = '#f2e8da';
    lg.font = `500 88px ${SANS}`;
    lg.fillText('Koushik', 56, 250);
    lg.fillStyle = '#c39a78';
    lg.font = `italic 400 88px ${SERIF}`;
    lg.fillText('Raju', 56, 352);

    lg.fillStyle = 'rgba(240,232,221,.55)';
    lg.font = `400 24px ${MONO}`;
    lg.fillText('DEVELOPER  ·  TESTER  ·  DESIGNER', 56, 414);

    lg.fillStyle = 'rgba(255,255,255,.07)';
    lg.fillRect(56, 464, 912, 1);
    lg.fillStyle = '#f2e8da';
    lg.font = `400 30px ${MONO}`;
    lg.fillText('Click this screen to get in touch', 56, 532);
    lg.fillStyle = 'rgba(240,232,221,.4)';
    lg.font = `400 19px ${MONO}`;
    lg.fillText('India  ·  open to remote  ·  2026', 56, 582);
    laptopTexture.needsUpdate = true;
  };
  drawLaptop();
  redraws.push(drawLaptop);

  // the hanging ID card and the notebook
  const typed = (draw) => {
    const canvas = draw();
    const texture = toTexture(canvas, aniso);
    redraws.push(() => {
      const next = draw();
      const ctx = canvas.getContext('2d');
      // A source canvas may leave a scale on its context (the cards draw at
      // 2x); copying must happen in device pixels or the art doubles again.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(next, 0, 0);
      ctx.restore();
      texture.needsUpdate = true;
    });
    return texture;
  };
  // The cards are read up close. With mipmaps the GPU picks a level smaller
  // than the card on screen and the print goes soft, so sample the full image.
  const crisp = (texture) => {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  };
  const cards = experienceList.map((item, i) => ({
    front: crisp(typed(() => experienceCardCanvas(item, i, false))),
    back: crisp(typed(() => experienceCardCanvas(item, i, true))),
  }));
  const pegboard = typed(pegboardCanvas);
  const idFront = typed(() => idCardCanvas(false));
  const idBack = typed(() => idCardCanvas(true));
  const bookCover = typed(bookCoverCanvas);
  const bookPage = typed(bookPageCanvas);
  const strap = typed(strapCanvas);

  // soft assets
  const [steamCanvas, stg] = makeCanvas(128, 128);
  const steamGrad = stg.createRadialGradient(64, 64, 0, 64, 64, 64);
  steamGrad.addColorStop(0, 'rgba(255,236,220,.5)');
  steamGrad.addColorStop(0.55, 'rgba(255,236,220,.14)');
  steamGrad.addColorStop(1, 'rgba(255,236,220,0)');
  stg.fillStyle = steamGrad;
  stg.fillRect(0, 0, 128, 128);
  const steam = toTexture(steamCanvas, aniso);

  const [blobCanvas, bg] = makeCanvas(256, 256);
  const blobGrad = bg.createRadialGradient(128, 128, 0, 128, 128, 128);
  blobGrad.addColorStop(0, 'rgba(0,0,0,.66)');
  blobGrad.addColorStop(0.55, 'rgba(0,0,0,.3)');
  blobGrad.addColorStop(1, 'rgba(0,0,0,0)');
  bg.fillStyle = blobGrad;
  bg.fillRect(0, 0, 256, 256);
  const blob = toTexture(blobCanvas, aniso);

  const [glowCanvas, gg] = makeCanvas(256, 256);
  const glowGrad = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
  glowGrad.addColorStop(0, 'rgba(255,190,140,.75)');
  glowGrad.addColorStop(0.4, 'rgba(255,150,100,.22)');
  glowGrad.addColorStop(1, 'rgba(255,150,100,0)');
  gg.fillStyle = glowGrad;
  gg.fillRect(0, 0, 256, 256);
  const glow = toTexture(glowCanvas, aniso);

  return {
    floor,
    wall,
    grain,
    leather,
    rug,
    city,
    posters,
    certs,
    screen,
    screenTexture,
    miniTexture,
    laptopTexture,
    cards,
    pegboard,
    idFront,
    idBack,
    bookCover,
    bookPage,
    strap,
    steam,
    blob,
    glow,
    redraw: () => redraws.forEach((job) => job()),
  };
}
