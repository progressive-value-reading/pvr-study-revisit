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
const SCALE_FACTORS = [1, 2, 3, 4, 5];
const TEXTURE_MODULE_PATH = '/public/pvr-study-1/textureGenerator.js';

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
const outputDir = path.join(repoRoot, 'public', 'pvr-study-1', 'assets');

function getChartHeight(scaleFactor) {
  const drawableHeight = VIEWPORT_HEIGHT - TOP_MARGIN;
  const tallBarHeight = scaleFactor * drawableHeight;
  return Math.max(VIEWPORT_HEIGHT, tallBarHeight + TOP_MARGIN);
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

async function generateBackgroundDataUrl(page, chartHeight) {
  return page.evaluate(
    async ({ textureModulePath, width, height }) => {
      const { generateTextureBackground } = await import(textureModulePath);
      return generateTextureBackground({ width, height });
    },
    {
      height: chartHeight,
      textureModulePath: TEXTURE_MODULE_PATH,
      width: VIEWPORT_WIDTH,
    }
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

  const { origin, server } = await startStaticServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage();
    await page.goto(origin, { waitUntil: 'load' });

    for (const scaleFactor of SCALE_FACTORS) {
      const chartHeight = getChartHeight(scaleFactor);
      const outputPath = path.join(outputDir, `background-s${scaleFactor}.png`);

      console.log(`Generating background for scaleFactor=${scaleFactor} (height=${chartHeight})...`);
      const dataUrl = await generateBackgroundDataUrl(page, chartHeight);
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

      await fs.writeFile(outputPath, base64, 'base64');
      console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
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
