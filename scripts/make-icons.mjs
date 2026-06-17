// Generates placeholder PWA icons (green bg, white rat face).
// Pure Node — no external deps. Replace with branded icons later.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const GREEN = [0x2F, 0x85, 0x5A];
const WHITE = [0xFF, 0xFF, 0xFF];
const PINK  = [0xF6, 0x87, 0xB3];
const BLACK = [0x1A, 0x20, 0x2C];

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy < 1;
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

function makePng(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(rowLen * size);

  // Rat face geometry (fractional, scales to any size)
  const faceCx = size * 0.50, faceCy = size * 0.60;
  const faceRx = size * 0.32, faceRy = size * 0.30;
  const earRx  = size * 0.11, earRy  = size * 0.15;
  const lEarCx = size * 0.30, rEarCx = size * 0.70;
  const earCy  = size * 0.32;
  const innerEarRx = earRx * 0.55, innerEarRy = earRy * 0.55;
  const eyeR   = size * 0.030;
  const lEyeCx = size * 0.41, rEyeCx = size * 0.59;
  const eyeCy  = size * 0.57;
  const noseR  = size * 0.035;
  const noseCx = size * 0.50, noseCy = size * 0.74;
  const whiskerLen = size * 0.20;
  const whiskerThickness = Math.max(1, size * 0.008);

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const xp = x + 0.5, yp = y + 0.5;
      let color = GREEN;

      // Face
      if (inEllipse(xp, yp, faceCx, faceCy, faceRx, faceRy)) color = WHITE;
      // Ears
      if (inEllipse(xp, yp, lEarCx, earCy, earRx, earRy)) color = WHITE;
      if (inEllipse(xp, yp, rEarCx, earCy, earRx, earRy)) color = WHITE;
      // Inner ears (pink)
      if (inEllipse(xp, yp, lEarCx, earCy + earRy * 0.15, innerEarRx, innerEarRy)) color = PINK;
      if (inEllipse(xp, yp, rEarCx, earCy + earRy * 0.15, innerEarRx, innerEarRy)) color = PINK;
      // Whiskers (thin horizontal lines extending from cheeks)
      if (Math.abs(yp - (faceCy + size * 0.05)) < whiskerThickness &&
          xp > size * 0.10 && xp < size * 0.28) color = BLACK;
      if (Math.abs(yp - (faceCy + size * 0.05)) < whiskerThickness &&
          xp > size * 0.72 && xp < size * 0.90) color = BLACK;
      if (Math.abs(yp - (faceCy + size * 0.10)) < whiskerThickness &&
          xp > size * 0.12 && xp < size * 0.28) color = BLACK;
      if (Math.abs(yp - (faceCy + size * 0.10)) < whiskerThickness &&
          xp > size * 0.72 && xp < size * 0.88) color = BLACK;
      // Eyes
      if (inCircle(xp, yp, lEyeCx, eyeCy, eyeR)) color = BLACK;
      if (inCircle(xp, yp, rEyeCx, eyeCy, eyeR)) color = BLACK;
      // Nose
      if (inCircle(xp, yp, noseCx, noseCy, noseR)) color = PINK;

      const p = y * rowLen + 1 + x * 3;
      raw[p] = color[0];
      raw[p + 1] = color[1];
      raw[p + 2] = color[2];
    }
  }

  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function makeIco16() {
  const png = makePng(16);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const dir = Buffer.alloc(16);
  dir[0] = 16; dir[1] = 16; dir[2] = 0; dir[3] = 0;
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(png.length, 8);
  dir.writeUInt32LE(6 + 16, 12);

  return Buffer.concat([header, dir, png]);
}

for (const size of [180, 192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), makePng(size));
  console.log(`wrote icon-${size}.png`);
}
writeFileSync(join(OUT, 'favicon.ico'), makeIco16());
console.log('wrote favicon.ico');
