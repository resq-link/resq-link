#!/usr/bin/env node
/**
 * Synthesizes assets/sounds/incident_alarm.wav — the repeating alert tone for
 * newly assigned incidents.
 *
 * Generated rather than sourced so the asset carries no licence obligations and
 * is reproducible from the repo. Two alternating tones (a classic emergency
 * two-tone), 2s long, beginning and ending in silence so it loops seamlessly.
 *
 *   node scripts/generate-alarm-sound.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const AMPLITUDE = 0.72;
const FADE_S = 0.006; // click-free edges on every beep

/** Single 2-second cycle [frequencyHz | 0 for silence, durationSeconds] */
const CYCLE = [
  [880, 0.35],
  [0, 0.15],
  [1175, 0.35],
  [0, 0.15],
  [880, 0.35],
  [0, 0.15],
  [1175, 0.35],
  [0, 0.15],
];

// Repeat 14 times = 28 seconds total (within APNs & Android 30s notification sound limit)
const PATTERN = Array.from({ length: 14 }, () => CYCLE).flat();

const samples = [];
for (const [freq, seconds] of PATTERN) {
  const count = Math.round(seconds * RATE);
  const fade = Math.max(1, Math.round(FADE_S * RATE));
  for (let i = 0; i < count; i++) {
    if (freq === 0) {
      samples.push(0);
      continue;
    }
    // Taper both ends of the beep so it does not click.
    const env = Math.min(1, i / fade, (count - i) / fade);
    samples.push(Math.sin((2 * Math.PI * freq * i) / RATE) * AMPLITUDE * env);
  }
}

const data = Buffer.alloc(samples.length * 2);
samples.forEach((v, i) => {
  const clamped = Math.max(-1, Math.min(1, v));
  data.writeInt16LE(Math.round(clamped * 32767), i * 2);
});

// Canonical 16-bit mono PCM WAV header.
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // fmt chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'sounds'
);
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'incident_alarm.wav');
writeFileSync(outFile, Buffer.concat([header, data]));

console.log(
  `wrote ${outFile} — ${(samples.length / RATE).toFixed(2)}s, ${(
    (header.length + data.length) /
    1024
  ).toFixed(1)} KB`
);
