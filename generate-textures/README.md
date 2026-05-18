# Generate Textures

This folder contains a standalone script that generates the static background images for `pvr-study-1` using the existing browser-based `generateTextureBackground()` code.

## Output files

Running the script writes these files into `public/pvr-study-1/assets/`:

- `background-s1.png`
- `background-s2.png`
- `background-s4.png`
- `background-s8.png`
- `background-s16.png`

## Run it

Install the Playwright browser once if you have not done that already:

```bash
npx playwright install chromium
```

Then generate the images:

```bash
node generate-textures/generate-backgrounds.mjs
```

## Notes

- The script starts a temporary local static server automatically. You do not need to run `yarn serve`.
- It uses the same `public/pvr-study-1/textureGenerator.js` module that the study currently uses, so the generated textures should match the current visual style.
