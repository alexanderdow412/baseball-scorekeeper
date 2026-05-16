import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  advanceRunner,
  adjustTeamScore,
  changePitcher,
  createBoxScoreMarkdown,
  clearRunner,
  createGame,
  endGame,
  getCurrentBatter,
  getCurrentPitcher,
  replaceCurrentBatter,
  replaceLineupPlayer,
  scoreRunner,
  scoreForTeam,
  setBase,
  setHalf,
  setInning,
  setOuts,
  stealBase,
  updateLineupName,
} from "./gameLogic.js";

describe("game logic", () => {
  it("starts a clean game", () => {
    const game = createGame("Mets", "Yankees");

    expect(game.teams.away).toBe("Mets");
    expect(game.inning).toBe(1);
    expect(game.half).toBe("top");
    expect(scoreForTeam(game, "away")).toBe(0);
    expect(getCurrentBatter(game).name).toBe("Mets Batter 1");
    expect(getCurrentPitcher(game).name).toBe("Yankees Pitcher");
  });

  it("walks the batter after four balls", () => {
    let game = createGame();
    game = applyOutcome(game, "Ball");
    game = applyOutcome(game, "Ball");
    game = applyOutcome(game, "Ball");
    game = applyOutcome(game, "Ball");

    expect(game.count.balls).toBe(0);
    expect(game.bases.first).toBe(true);
    expect(getCurrentBatter(game).name).toBe("Away Batter 2");
  });

  it("only forces runners on a walk", () => {
    let game = createGame();
    game = setBase(game, "second", true);
    game = applyOutcome(game, "Walk");

    expect(game.bases).toEqual({ first: true, second: true, third: false });
  });

  it("scores all occupied bases on a home run", () => {
    let game = createGame();
    game = setBase(game, "first", true);
    game = setBase(game, "second", true);
    game = setBase(game, "third", true);
    game = applyOutcome(game, "Home Run");

    expect(scoreForTeam(game, "away")).toBe(4);
    expect(game.bases).toEqual({ first: false, second: false, third: false });
  });

  it("lets a runner score manually after a double", () => {
    let game = createGame();
    game = setBase(game, "first", true);
    game = applyOutcome(game, "Double");

    expect(game.bases).toEqual({ first: false, second: true, third: true });
    expect(scoreForTeam(game, "away")).toBe(0);

    game = scoreRunner(game, "third");

    expect(game.bases).toEqual({ first: false, second: true, third: false });
    expect(scoreForTeam(game, "away")).toBe(1);
  });

  it("supports stolen base advances without changing the batter", () => {
    let game = createGame();
    const batterName = getCurrentBatter(game).name;
    game = setBase(game, "first", true);
    game = stealBase(game, "first");

    expect(game.bases).toEqual({ first: false, second: true, third: false });
    expect(getCurrentBatter(game).name).toBe(batterName);
  });

  it("can advance and clear runners manually", () => {
    let game = createGame();
    game = setBase(game, "second", true);
    game = advanceRunner(game, "second");
    game = clearRunner(game, "third");

    expect(game.bases).toEqual({ first: false, second: false, third: false });
  });

  it("supports manual inning, half, outs, and score corrections", () => {
    let game = createGame();
    game = setInning(game, 10);
    game = setHalf(game, "bottom");
    game = setOuts(game, 2);
    game = adjustTeamScore(game, "home", 1);

    expect(game.inning).toBe(10);
    expect(game.half).toBe("bottom");
    expect(game.outs).toBe(2);
    expect(game.lineScore).toHaveLength(10);
    expect(scoreForTeam(game, "home")).toBe(1);
  });

  it("switches halves after three outs", () => {
    let game = createGame();
    game = applyOutcome(game, "Out");
    game = applyOutcome(game, "Out");
    game = applyOutcome(game, "Out");

    expect(game.half).toBe("bottom");
    expect(game.outs).toBe(0);
    expect(game.bases).toEqual({ first: false, second: false, third: false });
  });

  it("records batter and pitcher stats for a hit", () => {
    let game = createGame("Mets", "Yankees");
    game = updateLineupName(game, "away", 0, "Nimmo");
    game = applyOutcome(game, "Single");

    const batter = game.rosters.away.lineup[0];
    const pitcher = game.rosters.home.pitchers[0];

    expect(batter.stats.pa).toBe(1);
    expect(batter.stats.h).toBe(1);
    expect(batter.results).toEqual(["Single"]);
    expect(pitcher.stats.bf).toBe(1);
    expect(pitcher.stats.h).toBe(1);
    expect(pitcher.results).toEqual(["Nimmo: Single"]);
  });

  it("replaces the active lineup spot with a pinch hitter", () => {
    let game = createGame("Mets", "Yankees");
    game = updateLineupName(game, "away", 0, "Starter");
    game = replaceCurrentBatter(game, "Pinch Hitter");
    game = applyOutcome(game, "Double");

    expect(game.rosters.away.lineup[0].name).toBe("Pinch Hitter");
    expect(game.rosters.away.lineup[0].subFor).toBe("Starter");
    expect(game.rosters.away.bench[0].name).toBe("Starter");
    expect(game.rosters.away.substitutions[0]).toContain("Pinch Hitter pinch hit for Starter");
    expect(game.rosters.away.lineup[0].stats.h).toBe(1);
  });

  it("substitutes any lineup spot and keeps replaced player stats in box score", () => {
    let game = createGame("Mets", "Pirates");
    game = updateLineupName(game, "home", 4, "O'Hearn");
    game = { ...game, half: "bottom", lineupIndex: { ...game.lineupIndex, home: 4 } };
    game = applyOutcome(game, "Single");
    game = replaceLineupPlayer(game, "home", 4, "Yorke");
    game = endGame(game);

    const markdown = createBoxScoreMarkdown(game);

    expect(game.rosters.home.lineup[4].name).toBe("Yorke");
    expect(game.rosters.home.lineup[4].subFor).toBe("O'Hearn");
    expect(game.rosters.home.bench[0].name).toBe("O'Hearn");
    expect(game.rosters.home.bench[0].stats.h).toBe(1);
    expect(markdown).toContain("| 5 | Yorke | 0 | 0");
    expect(markdown).toContain("| 5 | O'Hearn | 1 | 1");
    expect(markdown).toContain("Yorke replaced O'Hearn");
  });

  it("attributes future batters to a changed pitcher", () => {
    let game = createGame("Mets", "Yankees");
    game = changePitcher(game, "home", "Reliever");
    game = applyOutcome(game, "Out");

    expect(getCurrentPitcher(game).name).toBe("Reliever");
    expect(game.rosters.home.pitchers[0].stats.bf).toBe(0);
    expect(game.rosters.home.pitchers[1].stats.bf).toBe(1);
    expect(game.rosters.home.pitchers[1].stats.outs).toBe(1);
  });

  it("finalizes a game and creates markdown box score", () => {
    let game = createGame("Mets", "Yankees");
    game = updateLineupName(game, "away", 0, "Nimmo");
    game = applyOutcome(game, "Home Run");
    game = endGame(game);

    const markdown = createBoxScoreMarkdown(game);

    expect(game.endedAt).toBeTruthy();
    expect(markdown).toContain("# Mets at Yankees");
    expect(markdown).toContain("**Final:** Mets 1, Yankees 0");
    expect(markdown).toContain("| Team | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | R |");
    expect(markdown).toContain("| 1 | Nimmo | 1 | 1 | 0 | 0 | 1 | 1 | 0 |");
    expect(markdown).toContain("## Notes For Narrative");
  });
});
