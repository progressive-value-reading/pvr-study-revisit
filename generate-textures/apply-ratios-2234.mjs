#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function runNodeScript(scriptName) {
  const scriptPath = path.join(scriptDir, scriptName);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.resolve(scriptDir, '..'),
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('Updating pvr-study-2234 config from ratios-2234.mjs...');
  await runNodeScript('update-config-2234.mjs');

  console.log('\nGenerating background textures from textureGenerator.js...');
  await runNodeScript('generate-backgrounds-2234.mjs');

  console.log('\nAll done.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
