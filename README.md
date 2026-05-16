# Baseball Scorekeeper

A mobile-first personal baseball scorekeeping Progressive Web App built with React and Vite.

## Features

- Start a game with home and away team names.
- Track inning, half inning, outs, balls, strikes, and occupied bases.
- Large thumb-friendly buttons for common live-game outcomes.
- Automatic local saving with `localStorage`.
- Manual runner toggles and editable line score.
- Runner Controls for manual advances, scoring from third, clearing a base, and stolen bases.
- Editable batting orders for both teams.
- Current batter and opposing pitcher tracking.
- Simple batter/pitcher stat totals for live use.
- Pitcher changes and pinch hitter substitutions.
- Game Summary screen with inning-by-inning scoring and total runs.
- Installable PWA with a web app manifest and service worker.

This is intentionally simple for version 1. It favors quick live use during a baseball game over perfect official scoring rules.

## Runner Movement

The hit buttons make a simple default advance. When the real play differs, use `Runner Controls` on the Score screen.

Example: runner on first, batter hits a double, and the runner scores. Tap `Double`; the app puts the batter on second and the runner on third by default. Then tap `3B to Home` to add the run and clear third.

For stolen bases, use `Steal 2B`, `Steal 3B`, or `Steal Home`. These move the runner without advancing the current batter.

## Lineups and Substitutions

Use the Lineup tab to edit all nine batting-order spots for each team, rename pitchers, add a new pitcher, or switch back to a previous pitcher. The active batting slot is highlighted.

When a pinch hitter enters, tap `Pinch Hit` while that player's lineup spot is due up. The app replaces the active batting-order spot, moves the previous player to the bench, and records the substitution note.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

The production build is written to `dist/`.

## Preview Production Build

```bash
npm run preview
```

## Deploy to Vercel

1. Push this project to a Git repository.
2. Import the repository in Vercel.
3. Use the default Vite settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

Game data is stored only in the browser on the device where the app is used. There is no login, backend, or remote database.
