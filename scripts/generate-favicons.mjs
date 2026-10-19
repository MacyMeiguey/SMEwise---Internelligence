/**
 * Renders SMEwise favicon PNGs (lavender tile + stroke S).
 * Run: node scripts/generate-favicons.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'client', 'public');

const MARK = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#7c3aed"/>
  <path fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"
    d="M21.2 10.4c-.4-1.7-1.9-2.9-4.2-2.9-2.6 0-4.4 1.5-4.4 3.5 0 1.7 1.1 2.7 3.6 3.4l1.6.5c2.8.9 4.4 2.2 4.4 4.6 0 2.7-2.3 4.5-5.4 4.5-2.7 0-4.7-1.4-5.3-3.5"/>
</svg>`;

const targets = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of targets) {
  const png = await sharp(Buffer.from(MARK))
    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  writeFileSync(join(outDir, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}
