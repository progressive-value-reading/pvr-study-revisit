#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAIN_RATIOS = [14, 27, 52, 100, 192, 2478, 2822, 3215, 3662, 4171, 4752, 5413, 6166, 7023, 8000];

const TUTORIAL_RATIOS = [2, 9, 17, 32, 77, 129];

const MAIN_INSTRUCTION = 'Estimate how many times taller the taller bar is compared to the shorter bar. <span style="color:red"><strong>Just give quick, intuitive responses. Do not count or calculate.</strong></span>';
const TUTORIAL_INSTRUCTION = MAIN_INSTRUCTION;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(scriptDir, '..', 'public', 'pvr-study-2234', 'config.json');

function makeMainTrial(ratio) {
  return {
    baseComponent: 'bar-chart',
    description: 'Main study trial',
    instruction: MAIN_INSTRUCTION,
    parameters: { ratio },
  };
}

function makeTutorialTrial(index, ratio) {
  return {
    baseComponent: 'bar-chart-tutorial',
    description: 'Tutorial trial',
    instruction: TUTORIAL_INSTRUCTION,
    parameters: { ratio },
  };
}

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

const preservedKeys = Object.keys(config.components).filter(
  (key) => !key.startsWith('main-') && !key.startsWith('tutorial-'),
);

const newComponents = {};
for (const key of preservedKeys) {
  newComponents[key] = config.components[key];
}

TUTORIAL_RATIOS.forEach((ratio, index) => {
  newComponents[`tutorial-${index + 1}-r${ratio}`] = makeTutorialTrial(index + 1, ratio);
});

MAIN_RATIOS.forEach((ratio) => {
  newComponents[`main-r${ratio}`] = makeMainTrial(ratio);
});

config.components = newComponents;

const tutorialComponents = TUTORIAL_RATIOS.map((ratio, index) => `tutorial-${index + 1}-r${ratio}`);
const mainComponents = MAIN_RATIOS.map((ratio) => `main-r${ratio}`);

const sequenceComponents = config.sequence.components;
const tutorialBlockIndex = sequenceComponents.findIndex(
  (item) => typeof item === 'object' && item.components?.some((c) => c.startsWith('tutorial-')),
);
const mainBlockIndex = sequenceComponents.findIndex(
  (item) => typeof item === 'object' && item.order === 'random',
);

if (tutorialBlockIndex === -1 || mainBlockIndex === -1) {
  throw new Error('Could not locate tutorial or main trial blocks in sequence.');
}

sequenceComponents[tutorialBlockIndex] = {
  order: 'fixed',
  components: [
    tutorialComponents[0],
    tutorialComponents[1],
    tutorialComponents[2],
    'transition-scroll',
    tutorialComponents[3],
    tutorialComponents[4],
    tutorialComponents[5],
  ],
};

sequenceComponents[mainBlockIndex] = {
  order: 'random',
  components: mainComponents,
};

const studyPrefix = 'pvr-study-2234';
const replaceStudyPaths = (value) => {
  if (typeof value === 'string') {
    return value.replaceAll('pvr-study-1/', `${studyPrefix}/`);
  }
  if (Array.isArray(value)) {
    return value.map(replaceStudyPaths);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, replaceStudyPaths(entryValue)]),
    );
  }
  return value;
};

const updatedConfig = replaceStudyPaths(config);

await fs.writeFile(configPath, `${JSON.stringify(updatedConfig, null, 4)}\n`);
console.log(`Updated ${configPath}`);
console.log(`Main trials: ${mainComponents.length}`);
console.log(`Tutorial trials: ${tutorialComponents.length}`);
