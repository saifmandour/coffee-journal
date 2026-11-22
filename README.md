# Coffee Journal

A log of my specialty coffee experiments: coffee, roaster, water, temperature, grinder and grind, dose, method, time and tasting notes.
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

K6 ↔ Comandante C40 (stock), both counted from zero (burrs touching). It comes in two straight parts that meet at **K6 80 = C40 25**:

| K6 range | K6 clicks per C40 click | Based on |
|---|---|---|
| 0–80 | 3.2 | Zero point plus my note K6 80 ≈ C40 25 |
| 80+ | 6 | My taste notes: K6 80 ≈ 25, 100 ≈ 28, 110 ≈ 30 |

Red Clix doubles the C40 number. To change it, edit `BEND` and `K6_PER_C40` at the top of `app.js`.

Checked against published settings. The C40 ranges come from Comandante and other guides, the K6 ranges from what's published online:

| Method | C40 | → K6 (this conversion) | K6 published online |
|---|---|---|---|
| Espresso | 7–13 | 22–42 | 22–45 (HCG), 35–50 (reviewers), 25–60 (KINGrinder) |
| Moka pot | 15–20 | 48–64 | 43–78 (HCG), 60–90 (KINGrinder) |
| Pour-over | 18–28 | 58–98 | 49–110 (HCG), 80–110 (reviewers), 90–120 (KINGrinder) |
| French press | 26–37 | 86–152 | 82–154 (HCG), 150 (KINGrinder) |

A single ratio can't fit everything. 3.2 misses the K6 110 note by 4 clicks, and 4.5, from matching brew-method midpoints,
misses all three notes by 6–7 clicks. KINGrinder's own chart runs coarser than real use in the middle range.
Burr travel (16 µm per K6 click, 30 µm per C40 click) doesn't give an equal grind, because the burrs are shaped differently.
