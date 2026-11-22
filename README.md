# Coffee Journal

A log of my specialty coffee experiments: coffee, water, temperature, grind, dose, method, time and tasting notes.
It also has a KINGrinder K6 → Comandante C40 grind converter.

## Log a brew

```sh
npm start   # then open http://localhost:8080
```

On your own computer you get a **New brew** button. Entries are saved to `brews.json`.
No dependencies are needed, only Node.

## Publish

Push the repo to GitHub, then go to **Settings → Pages → Deploy from a branch → `main` / root**.
The public site shows your brews read-only. To add more, run it locally, log the brew, then commit and push.

## Grind conversion

K6: about 16 µm per click. Comandante C40: about 30 µm per click (15 µm with Red Clix).
`Comandante clicks ≈ K6 clicks × 16 / 30`. Both count from zero, where the burrs touch.
This is a starting point, not an exact match, because the burr shapes differ.
