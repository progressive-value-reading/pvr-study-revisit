#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MAIN_RATIOS, NON_SCROLL_TUTORIAL_COUNT, TUTORIAL_TRIALS } from './ratios-2234.mjs';

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

function makeTutorialTrial({ scaleFactor, ratio }) {
  return {
    baseComponent: 'bar-chart-tutorial',
    description: 'Tutorial trial',
    instruction: TUTORIAL_INSTRUCTION,
    parameters: { scaleFactor, ratio },
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

TUTORIAL_TRIALS.forEach((trial) => {
  newComponents[trial.id] = makeTutorialTrial(trial);
});

MAIN_RATIOS.forEach((ratio) => {
  newComponents[`main-r${ratio}`] = makeMainTrial(ratio);
});

config.components = newComponents;

const tutorialComponents = TUTORIAL_TRIALS.map((trial) => trial.id);
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
    ...tutorialComponents.slice(0, NON_SCROLL_TUTORIAL_COUNT),
    'transition-scroll',
    ...tutorialComponents.slice(NON_SCROLL_TUTORIAL_COUNT),
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
