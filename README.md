# Coffee Journal

A log of my specialty coffee experiments: coffee, roaster, water, temperature, grinder and grind, dose, method, time and tasting notes.
It also has a KINGrinder K6 → Comandante C40 grind converter.

## Log a brew

```sh
npm start   # then open http://localhost:8080
```

On your own computer you get a **New brew** button. Entries are saved to `brews.json`.
No dependencies are needed, only Node.

## Edit from your phone or any browser

Everyone sees the journal read-only. You sign in once per device at the private address
**https://saifmandour.github.io/coffee-journal/#signin**. It isn't linked anywhere on the site. Bookmark it.

You'll need a GitHub key (fine-grained personal access token):

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. **Name:** `coffee-journal` · **Expiration:** your choice (e.g. 1 year)
3. **Repository access:** *Only select repositories* → `coffee-journal`
4. **Permissions → Repository permissions → Contents: Read and write.** Leave everything else alone.
5. Generate it, and save the key in your password manager. GitHub shows it only once.

Paste the key on the sign-in page. It stays in that browser, so you're signed in until you tap **Sign out**.
Every save becomes a commit, and the public site updates in about a minute.

**Security:** the site has no server or login form to attack. Saves go straight to GitHub, which checks the key every time.
The key only works for this one repo, and you can cancel it on GitHub at any time, for example if you lose your phone.
A security rule on the page only allows its own code and GitHub's API, which keeps injected scripts away from the key.
After editing online, run `git pull` before working locally.

## Publish

Live at **https://saifmandour.github.io/coffee-journal/**. The repo is public.

1. **Turn on GitHub Pages, once:** repo → **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Deploys are automatic:** `.github/workflows/pages.yml` publishes the site on every push to `main`, and every brew
   saved online is also a push. Progress is in the repo's **Actions** tab, and a deploy takes about a minute.
   Only the website files are published. `server.js`, `package.json` and the README stay out. If you add a new file the
   site needs, add it to the list in that workflow.

## On your phone

- **Install it:** open the site. On iPhone, tap Safari → Share → **Add to Home Screen**. On Android, tap Chrome → ⋮ → **Install app / Add to Home screen**.
  You get the coffee-cup icon, and the site opens full-screen like an app.
- **Sign in inside the installed app:** it has no address bar for `#signin`, so **press and hold the big page title** ("Brews") for a second.
  On iPhone, the installed app keeps its own storage, separate from Safari, so you sign in once there as well.

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
