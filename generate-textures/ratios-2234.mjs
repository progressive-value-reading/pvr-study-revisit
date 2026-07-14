/** Shared ratio sets for pvr-study-2234. Edit here when trying new ratios. */

export const MAIN_RATIOS = [
  3, 4, 7, 10, 15, 22, 33, 49, 74, 110, 160, 250, 370, 550, 810, 1200, 1800, 2700, 4000, 6000,
];

/** Fixed-order tutorial trials matching pvr-study-1 (uses background-s1/s2 from study 1). */
export const TUTORIAL_TRIALS = [
  { id: 'tutorial-1-s1-r2', scaleFactor: 1, ratio: 2 },
  { id: 'tutorial-2-s1-r13', scaleFactor: 1, ratio: 13 },
  { id: 'tutorial-3-s1-r95', scaleFactor: 1, ratio: 95 },
  { id: 'tutorial-4-s2-r2', scaleFactor: 2, ratio: 2 },
  { id: 'tutorial-5-s2-r19', scaleFactor: 2, ratio: 19 },
  { id: 'tutorial-6-s2-r90', scaleFactor: 2, ratio: 90 },
];

/** Tutorial trials before the scroll-transition step. */
export const NON_SCROLL_TUTORIAL_COUNT = 3;
