#!/usr/bin/env node

import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const HOST = '127.0.0.1';
const VIEWPORT_WIDTH = 500;
const VIEWPORT_HEIGHT = 500;
const TOP_MARGIN = 10;
const SHORT_BAR_HEIGHT = 23;

const MAIN_RATIOS = [2, 14, 27, 52, 100, 192, 2478, 2822, 3215, 3662, 4171, 4752, 5413, 6166, 7023, 8000];
const TUTORIAL_RATIOS = [2, 9, 17, 32, 77, 129];
const RATIOS = [...new Set([...MAIN_RATIOS, ...TUTORIAL_RATIOS])].sort((a, b) => a - b);

// Browsers cannot allocate canvases for very tall charts; generate up to this height
// and stretch to full chart height via CSS background-size in the bar chart HTML.
const MAX_TEXTURE_GENERATION_HEIGHT = 8192;

const TEXTURE_MODULE_PATH = '/public/pvr-study-2234/textureGenerator.js';

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const outputDir = path.join(repoRoot, 'public', 'pvr-study-2234', 'assets');

function getChartHeight(ratio) {
  const tallBarHeight = SHORT_BAR_HEIGHT * ratio;
  return Math.max(VIEWPORT_HEIGHT, tallBarHeight + TOP_MARGIN);
}

function getGenerationHeight(chartHeight) {
  return Math.min(chartHeight, MAX_TEXTURE_GENERATION_HEIGHT);
}

function resolveRequestPath(urlPathname) {
  const relativePath = urlPathname.startsWith('/') ? urlPathname.slice(1) : urlPathname;
  const absolutePath = path.resolve(repoRoot, relativePath);

  if (absolutePath !== repoRoot && !absolutePath.startsWith(`${repoRoot}${path.sep}`)) {
    return null;
  }

  return absolutePath;
}

async function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', `http://${HOST}`);

      if (requestUrl.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html><body>Texture generation host</body></html>');
        return;
      }

      const filePath = resolveRequestPath(decodeURIComponent(requestUrl.pathname));
      if (!filePath) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      const fileBuffer = await fs.readFile(filePath).catch(() => null);
      if (!fileBuffer) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, { 'content-type': contentType });
      res.end(fileBuffer);
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(error instanceof Error ? error.stack ?? error.message : String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine the temporary server address.');
  }

  return {
    origin: `http://${HOST}:${address.port}`,
    server,
  };
}

async function generateBackgroundDataUrl(page, generationHeight, chartHeight) {
  return page.evaluate(
    async ({ textureModulePath, width, height, targetHeight }) => {
      const { generateTextureBackground } = await import(textureModulePath);
      return generateTextureBackground({
        width,
        height,
        textureOptions: { targetHeight },
      });
    },
    {
      height: generationHeight,
      targetHeight: chartHeight,
      textureModulePath: TEXTURE_MODULE_PATH,
      width: VIEWPORT_WIDTH,
    },
  );
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const cliRatios = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const ratiosToGenerate = cliRatios.length > 0 ? cliRatios : RATIOS;

  const { origin, server } = await startStaticServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage();
    await page.goto(origin, { waitUntil: 'load' });

    for (const ratio of ratiosToGenerate) {
      const chartHeight = getChartHeight(ratio);
      const generationHeight = getGenerationHeight(chartHeight);
      const outputPath = path.join(outputDir, `background-r${ratio}.png`);

      console.log(
        `Generating background for ratio=${ratio} (chartHeight=${chartHeight}, generationHeight=${generationHeight})...`,
      );
      const dataUrl = await generateBackgroundDataUrl(page, generationHeight, chartHeight);
      if (!dataUrl.startsWith('data:image/png;base64,')) {
        throw new Error(`Unexpected image data for ratio=${ratio}`);
      }
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length < 1000 || buffer[0] !== 0x89) {
        throw new Error(`Invalid PNG output for ratio=${ratio} (${buffer.length} bytes)`);
      }

      await fs.writeFile(outputPath, buffer);
      console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${buffer.length} bytes)`);
    }

    console.log('Done.');
  } catch (error) {
    if (error instanceof Error && error.message.includes("Executable doesn't exist")) {
      console.error('Playwright Chromium is not installed yet. Run `npx playwright install chromium` first.');
    }

    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }

    await closeServer(server).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
