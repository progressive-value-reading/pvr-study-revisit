#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MAIN_RATIOS } from './ratios-2234.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(scriptDir, '..', 'public', 'pvr-study-2234', 'assets');

const keptFiles = new Set([
  ...MAIN_RATIOS.map((ratio) => `background-r${ratio}.png`),
  'background-s1.png',
  'background-s2.png',
  'background-scroll-test.png',
]);

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function compressWithPngquant(filePath) {
  execFileSync(
    'npx',
    ['--yes', '-p', 'pngquant-bin', 'pngquant', '--quality=88-100', '--speed=1', '--force', '--ext', '.png', filePath],
    { stdio: 'inherit' },
  );
}

let beforeTotal = 0;
let afterTotal = 0;

for (const fileName of fs.readdirSync(assetsDir)) {
  if (!fileName.startsWith('background') || !fileName.endsWith('.png')) {
    continue;
  }

  if (!keptFiles.has(fileName)) {
    const unusedPath = path.join(assetsDir, fileName);
    beforeTotal += fs.statSync(unusedPath).size;
    fs.unlinkSync(unusedPath);
    console.log(`Removed unused ${fileName}`);
    continue;
  }

  const filePath = path.join(assetsDir, fileName);
  const beforeSize = fs.statSync(filePath).size;
  beforeTotal += beforeSize;

  compressWithPngquant(filePath);

  const afterSize = fs.statSync(filePath).size;
  afterTotal += afterSize;
  console.log(`${fileName}: ${formatBytes(beforeSize)} -> ${formatBytes(afterSize)}`);
}

console.log(`Total: ${formatBytes(beforeTotal)} -> ${formatBytes(afterTotal)}`);
