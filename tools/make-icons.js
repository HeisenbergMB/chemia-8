// Generuje ikony PNG (jasna kolba na ciemnym tle) bez żadnych zależności.
// Uruchom: node tools/make-icons.js

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(out, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = (w, h, rgb) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

// kształty w układzie 0..1
const FLASK = [[0.42, 0.2], [0.58, 0.2], [0.58, 0.42], [0.74, 0.72], [0.74, 0.75], [0.26, 0.75], [0.26, 0.72], [0.42, 0.42]];
const LIQUID = [[0.355, 0.56], [0.645, 0.56], [0.74, 0.72], [0.74, 0.75], [0.26, 0.75], [0.26, 0.72]];
const BUBBLES = [[0.46, 0.64, 0.03], [0.55, 0.68, 0.022], [0.5, 0.58, 0.016]];

const inPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

function pixel(x, y) {
  // tło: gradient turkus -> głębszy turkus
  const t = (x + y) / 2;
  let col = [14 + 12 * t, 19 + 16 * t, 24 + 20 * t];
  if (inPoly(x, y, FLASK)) col = [233, 238, 243];
  if (inPoly(x, y, LIQUID)) col = [79, 195, 177];
  for (const [bx, by, r] of BUBBLES) if ((x - bx) ** 2 + (y - by) ** 2 < r * r) col = [233, 238, 243];
  return col;
}

function render(size) {
  const ss = 3;
  const buf = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = pixel((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = ss * ss;
      const o = (py * size + px) * 3;
      buf[o] = Math.round(r / n);
      buf[o + 1] = Math.round(g / n);
      buf[o + 2] = Math.round(b / n);
    }
  }
  return png(size, size, buf);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(join(out, name), render(size));
  console.log('zapisano icons/' + name);
}
