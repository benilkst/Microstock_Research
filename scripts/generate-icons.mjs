import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });
const svg = readFileSync('public/icon.svg');
const targets = {
  'icon-192.png': 192,
  'icon-512.png': 512,
  'icon-512-maskable.png': 512,
  'apple-touch-icon.png': 180,
};
for (const [name, size] of Object.entries(targets)) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile('public/icons/' + name);
}
console.log('Semua ikon PWA berhasil dibuat di public/icons/');
