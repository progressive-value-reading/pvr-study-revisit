/** Shared ratio sets for pvr-study-2234. Edit here when trying new ratios. */

export const ALL_RATIOS = [
  3, 6, 12, 24, 49, 98, 152, 236, 365, 564, 873, 1350, 2089, 3232, 5000,
];

/** Smallest ratios used for fixed-order tutorial trials. */
export const TUTORIAL_RATIOS = ALL_RATIOS.slice(0, 6);

/** All ratios presented in randomized main trials. */
export const MAIN_RATIOS = [...ALL_RATIOS];
