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

## End Game and Box Score Export

Tap `End` when the game is complete. After confirmation, the Summary screen shows a final Markdown box score with:

- Line score and final score.
- Batter totals.
- Pitcher totals.
- Substitution notes.
- A notes section for memories, weather, seats, companions, or key moments.

Use `Copy` to paste the Markdown into Notion or into an LLM prompt for a narrative recap.

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

## Offline Mode

The app stores the active game and undo history in `localStorage` on the device. There is no backend server or remote database. In production, the service worker caches the app shell and same-origin build assets so the app can reopen after the first successful load, even with poor or no cell service.

To test on a phone after deploying:

1. Open the deployed HTTPS URL while online.
2. Start or load a game and make one scoring change.
3. Wait for the `Saved` indicator to update.
4. Add the app to your home screen if desired.
5. Turn on Airplane Mode.
6. Reopen the app from the home screen or refresh the browser tab.
7. Confirm the app opens, the Online/Offline badge says `Offline`, and the saved game is still present.
8. Make another scoring change while offline.
9. Turn Airplane Mode off and confirm the badge returns to `Online`.

If you test locally, use a production preview (`npm run build` then `npm run preview`). Service workers require a production build to match the deployed behavior.

## Deploy to Vercel

1. Push this project to a Git repository.
2. Import the repository in Vercel.
3. Use the default Vite settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

Game data is stored only in the browser on the device where the app is used. There is no login, backend, or remote database.
