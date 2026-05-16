import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Clipboard, ClipboardList, Diamond, Flag, Minus, PencilLine, Plus, RotateCcw, Save, Trophy, Undo2, Users, Wifi, WifiOff } from "lucide-react";
import {
  adjustTeamScore,
  applyOutcome,
  advanceRunner,
  clearRunner,
  createBoxScoreMarkdown,
  createGame,
  battingTeamKey,
  changePitcher,
  endGame,
  getCurrentBatter,
  getCurrentPitcher,
  halfLabel,
  inningLabel,
  normalizeGame,
  pitchingTeamKey,
  replaceCurrentBatter,
  scoreForTeam,
  scoreRunner,
  setBase,
  setCount,
  setCurrentPitcher,
  setHalf,
  setInning,
  setLineScore,
  setOuts,
  stealBase,
  updateLineupName,
  updatePitcherName,
} from "./gameLogic.js";
import "./styles.css";

const STORAGE_KEY = "baseball-scorekeeper.currentGame.v1";
const HISTORY_KEY = "baseball-scorekeeper.undoHistory.v1";
const MAX_HISTORY = 30;

function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeGame(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw).map(normalizeGame).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function App() {
  const [game, setGame] = useState(() => loadGame());
  const [undoStack, setUndoStack] = useState(() => loadHistory());
  const [view, setView] = useState("score");
  const [teams, setTeams] = useState({ away: "Away", home: "Home" });
  const [feedback, setFeedback] = useState(null);
  const [savedAt, setSavedAt] = useState(() => (loadGame() ? new Date() : null));
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 1100);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    function updateStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const score = useMemo(() => {
    if (!game) return { away: 0, home: 0 };
    return { away: scoreForTeam(game, "away"), home: scoreForTeam(game, "home") };
  }, [game]);

  function startGame(event) {
    event.preventDefault();
    commitGame(createGame(teams.away.trim() || "Away", teams.home.trim() || "Home"), "Game started", { undo: false, clearHistory: true });
    setView("score");
  }

  function showFeedback(message) {
    setFeedback({ id: Date.now(), message });
  }

  function persist(nextGame, nextUndoStack) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextGame));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextUndoStack));
    setSavedAt(new Date());
  }

  function commitGame(nextGameOrUpdater, message = "Saved", options = {}) {
    if (!game && typeof nextGameOrUpdater === "function") return;
    const nextGame = typeof nextGameOrUpdater === "function" ? nextGameOrUpdater(game) : nextGameOrUpdater;
    const nextUndoStack = options.clearHistory ? [] : options.undo === false || !game ? undoStack : [...undoStack.slice(-(MAX_HISTORY - 1)), game];
    setGame(nextGame);
    setUndoStack(nextUndoStack);
    persist(nextGame, nextUndoStack);
    showFeedback(message);
  }

  function undoLastPlay() {
    if (undoStack.length === 0) {
      showFeedback("Nothing to undo");
      return;
    }
    const previousGame = undoStack[undoStack.length - 1];
    const nextUndoStack = undoStack.slice(0, -1);
    setGame(previousGame);
    setUndoStack(nextUndoStack);
    persist(previousGame, nextUndoStack);
    showFeedback("Last action undone");
  }

  function newGame() {
    const ok = window.confirm("Start a new game? This will erase the current saved scorecard on this device.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setGame(null);
    setUndoStack([]);
    setSavedAt(null);
    setTeams({ away: game?.teams.away || "Away", home: game?.teams.home || "Home" });
  }

  function handleEndGame() {
    const ok = window.confirm("End this game and create the final box score? You can still copy the Markdown afterward.");
    if (!ok) return;
    commitGame(endGame(game), "Game finalized");
    setView("summary");
  }

  if (!game) {
    return (
      <main className="shell start-shell">
        <ConnectivityBadge isOnline={isOnline} />
        <section className="start-panel">
          <div>
            <p className="eyebrow">Personal scorebook</p>
            <h1>Baseball Scorekeeper</h1>
          </div>
          <form onSubmit={startGame} className="start-form">
            <label>
              Away team
              <input value={teams.away} onChange={(event) => setTeams({ ...teams, away: event.target.value })} />
            </label>
            <label>
              Home team
              <input value={teams.home} onChange={(event) => setTeams({ ...teams, home: event.target.value })} />
            </label>
            <button className="primary-action" type="submit">
              <Save size={22} aria-hidden="true" />
              Start Game
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <ConnectivityBadge isOnline={isOnline} />
      <header className="topbar">
        <button className="icon-button" onClick={newGame} aria-label="Start new game" title="Start new game">
          <RotateCcw size={22} aria-hidden="true" />
        </button>
        <div className="game-title">
          <span>{inningLabel(game)}</span>
          <strong>{halfLabel(game)} inning</strong>
        </div>
        <button className="icon-button" onClick={() => setView(view === "summary" ? "score" : "summary")} aria-label="Toggle summary" title="Toggle summary">
          {view === "summary" ? <Diamond size={22} aria-hidden="true" /> : <ClipboardList size={22} aria-hidden="true" />}
        </button>
      </header>

      <section className="score-strip" aria-label="Score">
        <TeamScore name={game.teams.away} runs={score.away} active={game.half === "top"} />
        <TeamScore name={game.teams.home} runs={score.home} active={game.half === "bottom"} />
      </section>

      <section className="save-undo-bar" aria-label="Save status and undo">
        <div className="saved-pill" role="status">
          <Check size={18} aria-hidden="true" />
          <span>{savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "Not saved yet"}</span>
        </div>
        <button className={game.endedAt ? "end-game-button finalized" : "end-game-button"} onClick={handleEndGame}>
          <Flag size={18} aria-hidden="true" />
          {game.endedAt ? "Final" : "End"}
        </button>
        <button onClick={undoLastPlay} disabled={undoStack.length === 0}>
          <Undo2 size={18} aria-hidden="true" />
          Undo
        </button>
      </section>

      <nav className="view-tabs" aria-label="Views">
        <button className={view === "score" ? "active" : ""} onClick={() => setView("score")}>
          <Diamond size={18} aria-hidden="true" />
          Score
        </button>
        <button className={view === "lineup" ? "active" : ""} onClick={() => setView("lineup")}>
          <Users size={18} aria-hidden="true" />
          Lineup
        </button>
        <button className={view === "summary" ? "active" : ""} onClick={() => setView("summary")}>
          <ClipboardList size={18} aria-hidden="true" />
          Summary
        </button>
      </nav>

      {view === "summary" ? (
        <Summary game={game} score={score} commitGame={commitGame} />
      ) : view === "lineup" ? (
        <Lineup game={game} commitGame={commitGame} />
      ) : (
        <Scorekeeper game={game} commitGame={commitGame} feedbackId={feedback?.id} />
      )}
      {feedback && <div className="feedback-toast" role="status">{feedback.message}</div>}
    </main>
  );
}

function ConnectivityBadge({ isOnline }) {
  return (
    <div className={isOnline ? "connectivity-badge online" : "connectivity-badge offline"} aria-live="polite">
      {isOnline ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
      <span>{isOnline ? "Online" : "Offline"}</span>
    </div>
  );
}

function TeamScore({ name, runs, active }) {
  return (
    <div className={active ? "team-score active" : "team-score"}>
      <span>{name}</span>
      <strong>{runs}</strong>
    </div>
  );
}

function Scorekeeper({ game, commitGame, feedbackId }) {
  const battingTeam = game.half === "top" ? game.teams.away : game.teams.home;
  const currentBatter = getCurrentBatter(game);
  const currentPitcher = getCurrentPitcher(game);
  const outcomes = [
    "Ball",
    "Strike",
    "Foul",
    "In play / Out",
    "Single",
    "Double",
    "Triple",
    "Home Run",
    "Walk",
    "Hit by Pitch",
    "Error",
    "Out",
  ];

  function commit(nextGame, message) {
    commitGame(nextGame, message);
  }

  return (
    <>
      <section key={`matchup-${feedbackId ?? 0}`} className="matchup-panel flash-target" aria-label="Current matchup">
        <div>
          <span>At bat</span>
          <strong>{currentBatter.name}</strong>
        </div>
        <div>
          <span>Pitching</span>
          <strong>{currentPitcher.name}</strong>
        </div>
      </section>

      <section key={`state-${feedbackId ?? 0}`} className="state-grid flash-target">
        <Counter label="Balls" value={game.count.balls} onMinus={() => commit(setCount(game, "balls", game.count.balls - 1), "Ball removed")} onPlus={() => commit(setCount(game, "balls", game.count.balls + 1), "Ball added")} />
        <Counter label="Strikes" value={game.count.strikes} onMinus={() => commit(setCount(game, "strikes", game.count.strikes - 1), "Strike removed")} onPlus={() => commit(setCount(game, "strikes", game.count.strikes + 1), "Strike added")} />
        <Counter label="Outs" value={game.outs} onMinus={() => commit(setOuts(game, game.outs - 1), "Out removed")} onPlus={() => commit(applyOutcome(game, "Out"), "Out recorded")} />
      </section>

      <CorrectionPanel game={game} onCommit={commit} />

      <section key={`field-${feedbackId ?? 0}`} className="field-panel flash-target" aria-label="Bases">
        <div className="batting-line">
          <span>Batting</span>
          <strong>{battingTeam}</strong>
        </div>
        <div className="diamond">
          <BaseButton label="2B" active={game.bases.second} onClick={() => commit(setBase(game, "second", !game.bases.second), game.bases.second ? "Second cleared" : "Runner on second")} />
          <BaseButton label="3B" active={game.bases.third} onClick={() => commit(setBase(game, "third", !game.bases.third), game.bases.third ? "Third cleared" : "Runner on third")} />
          <BaseButton label="1B" active={game.bases.first} onClick={() => commit(setBase(game, "first", !game.bases.first), game.bases.first ? "First cleared" : "Runner on first")} />
          <div className="plate">
            <span>HP</span>
          </div>
        </div>
      </section>

      <RunnerControls game={game} onCommit={commit} feedbackId={feedbackId} />

      <section className="outcomes" aria-label="Common outcomes">
        {outcomes.map((outcome) => (
          <button key={outcome} onClick={() => commit(applyOutcome(game, outcome), `${outcome} recorded`)} className={outcome === "Home Run" ? "outcome-button accent" : "outcome-button"}>
            {outcome}
          </button>
        ))}
      </section>
    </>
  );
}

function CorrectionPanel({ game, onCommit }) {
  const battingTeam = battingTeamKey(game);

  return (
    <section className="correction-panel" aria-label="Manual correction">
      <div className="correction-head">
        <strong>Manual Correction</strong>
        <span>Live fixes</span>
      </div>
      <div className="correction-grid">
        <button onClick={() => onCommit(setInning(game, game.inning - 1), "Inning adjusted")}>Inning -</button>
        <button onClick={() => onCommit(setHalf(game, game.half === "top" ? "bottom" : "top"), "Half inning toggled")}>
          {halfLabel(game)}
        </button>
        <button onClick={() => onCommit(setInning(game, game.inning + 1), "Inning adjusted")}>Inning +</button>
        <button onClick={() => onCommit(adjustTeamScore(game, battingTeam, -1), "Run removed")}>Run -</button>
        <button onClick={() => onCommit(adjustTeamScore(game, battingTeam, 1), "Run added")}>Run +</button>
        <button onClick={() => onCommit(setCount(setCount(game, "balls", 0), "strikes", 0), "Count cleared")}>Clear Count</button>
      </div>
    </section>
  );
}

function RunnerControls({ game, onCommit, feedbackId }) {
  const occupiedBases = [
    { key: "first", label: "1B", next: "2B", steal: "Steal 2B" },
    { key: "second", label: "2B", next: "3B", steal: "Steal 3B" },
    { key: "third", label: "3B", next: "Home", steal: "Steal Home" },
  ].filter((base) => game.bases[base.key]);

  if (occupiedBases.length === 0) {
    return (
      <section key={`runners-empty-${feedbackId ?? 0}`} className="runner-controls flash-target" aria-label="Runner controls">
        <div className="runner-controls-head">
          <strong>Runner Controls</strong>
          <span>No runners on</span>
        </div>
      </section>
    );
  }

  return (
    <section key={`runners-${feedbackId ?? 0}`} className="runner-controls flash-target" aria-label="Runner controls">
      <div className="runner-controls-head">
        <strong>Runner Controls</strong>
        <span>Manual advances and steals</span>
      </div>
      <div className="runner-action-grid">
        {occupiedBases.map((base) => (
          <React.Fragment key={base.key}>
            <button onClick={() => onCommit(base.key === "third" ? scoreRunner(game, base.key) : advanceRunner(game, base.key), `${base.label} to ${base.next}`)}>
              {base.label} to {base.next}
            </button>
            <button className="steal-action" onClick={() => onCommit(stealBase(game, base.key), base.steal)}>
              {base.steal}
            </button>
            <button className="clear-action" onClick={() => onCommit(clearRunner(game, base.key), `${base.label} cleared`)}>
              Clear {base.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function Lineup({ game, commitGame }) {
  return (
    <section className="lineup-screen">
      <TeamRoster teamKey="away" game={game} commitGame={commitGame} />
      <TeamRoster teamKey="home" game={game} commitGame={commitGame} />
    </section>
  );
}

function TeamRoster({ teamKey, game, commitGame }) {
  const roster = game.rosters[teamKey];
  const isBatting = battingTeamKey(game) === teamKey;
  const isPitching = pitchingTeamKey(game) === teamKey;

  function pinchHit() {
    const name = window.prompt("Pinch hitter name");
    if (name) commitGame(replaceCurrentBatter(game, name), "Pinch hitter saved");
  }

  function addPitcher() {
    const name = window.prompt(`New ${game.teams[teamKey]} pitcher`);
    if (name) commitGame(changePitcher(game, teamKey, name), "Pitcher change saved");
  }

  return (
    <article className="roster-card">
      <div className="roster-head">
        <div>
          <p className="eyebrow">{isBatting ? "Batting now" : "Roster"}</p>
          <h2>{game.teams[teamKey]}</h2>
        </div>
        {isBatting && (
          <button className="small-action" onClick={pinchHit}>
            <PencilLine size={18} aria-hidden="true" />
            Pinch Hit
          </button>
        )}
      </div>

      <div className="player-list">
        {roster.lineup.map((player, index) => (
          <label key={player.id} className={isBatting && game.lineupIndex[teamKey] === index ? "player-row active" : "player-row"}>
            <span>{index + 1}</span>
            <input value={player.name} onChange={(event) => commitGame(updateLineupName(game, teamKey, index, event.target.value), "Lineup saved")} />
            <StatsLine player={player} type="batter" />
          </label>
        ))}
      </div>

      <div className="pitcher-section">
        <div className="section-title">
          <strong>{isPitching ? "Pitching now" : "Pitchers"}</strong>
          <button className="small-action quiet" onClick={addPitcher}>
            <Plus size={18} aria-hidden="true" />
            Pitcher
          </button>
        </div>
        {roster.pitchers.map((pitcher) => (
          <label key={pitcher.id} className={roster.currentPitcherId === pitcher.id ? "pitcher-row active" : "pitcher-row"}>
            <input value={pitcher.name} onChange={(event) => commitGame(updatePitcherName(game, teamKey, pitcher.id, event.target.value), "Pitcher saved")} />
            <StatsLine player={pitcher} type="pitcher" />
            {roster.currentPitcherId !== pitcher.id && (
              <button className="small-action quiet" type="button" onClick={() => commitGame(setCurrentPitcher(game, teamKey, pitcher.id), "Active pitcher saved")}>
                Use Pitcher
              </button>
            )}
          </label>
        ))}
      </div>

      {roster.substitutions.length > 0 && (
        <div className="sub-list">
          <strong>Substitutions</strong>
          {roster.substitutions.map((substitution) => (
            <p key={substitution}>{substitution}</p>
          ))}
        </div>
      )}
    </article>
  );
}

function StatsLine({ player, type }) {
  if (type === "pitcher") {
    return (
      <small>
        BF {player.stats.bf} | H {player.stats.h} | BB {player.stats.bb} | K {player.stats.k} | R {player.stats.r}
      </small>
    );
  }

  return (
    <small>
      PA {player.stats.pa} | H {player.stats.h} | BB {player.stats.bb} | HR {player.stats.hr} | RBI {player.stats.rbi}
    </small>
  );
}

function Counter({ label, value, onMinus, onPlus }) {
  return (
    <div className="counter">
      <span>{label}</span>
      <div className="counter-controls">
        <button onClick={onMinus} aria-label={`Decrease ${label}`} title={`Decrease ${label}`}>
          <Minus size={20} aria-hidden="true" />
        </button>
        <strong>{value}</strong>
        <button onClick={onPlus} aria-label={`Increase ${label}`} title={`Increase ${label}`}>
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function BaseButton({ label, active, onClick }) {
  return (
    <button className={active ? "base occupied" : "base"} onClick={onClick} aria-pressed={active}>
      <span>{label}</span>
    </button>
  );
}

function Summary({ game, score, commitGame }) {
  const innings = Array.from({ length: Math.max(9, game.lineScore.length) }, (_, index) => index + 1);
  const boxScoreMarkdown = createBoxScoreMarkdown(game);
  const [copyStatus, setCopyStatus] = useState("");

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(boxScoreMarkdown);
      setCopyStatus("Copied Markdown");
    } catch {
      setCopyStatus("Select and copy below");
    }
  }

  return (
    <section className="summary">
      <div className="summary-head">
        <div>
          <p className="eyebrow">Game Summary</p>
          <h2>{game.endedAt ? "Final Box Score" : "Line Score"}</h2>
        </div>
        <Trophy size={30} aria-hidden="true" />
      </div>
      <div className="line-score-wrap">
        <table className="line-score">
          <thead>
            <tr>
              <th>Team</th>
              {innings.map((inning) => (
                <th key={inning}>{inning}</th>
              ))}
              <th>R</th>
            </tr>
          </thead>
          <tbody>
            <LineScoreRow teamKey="away" name={game.teams.away} game={game} innings={innings} total={score.away} commitGame={commitGame} />
            <LineScoreRow teamKey="home" name={game.teams.home} game={game} innings={innings} total={score.home} commitGame={commitGame} />
          </tbody>
        </table>
      </div>
      {game.endedAt && (
        <section className="box-score-export" aria-label="Markdown box score">
          <div className="box-score-head">
            <div>
              <strong>Markdown Box Score</strong>
              <span>Copy into Notion or an LLM prompt.</span>
            </div>
            <button onClick={copyMarkdown}>
              <Clipboard size={18} aria-hidden="true" />
              Copy
            </button>
          </div>
          {copyStatus && <p className="copy-status">{copyStatus}</p>}
          <textarea readOnly value={boxScoreMarkdown} aria-label="Markdown box score" />
        </section>
      )}
      <p className="saved-note">Autosaved on this device.</p>
    </section>
  );
}

function LineScoreRow({ teamKey, name, game, innings, total, commitGame }) {
  return (
    <tr>
      <th>{name}</th>
      {innings.map((inning) => {
        const value = game.lineScore[inning - 1]?.[teamKey] ?? 0;
        return (
          <td key={inning}>
            <input
              inputMode="numeric"
              aria-label={`${name} inning ${inning} runs`}
              value={value}
              onChange={(event) => commitGame(setLineScore(game, inning, teamKey, Number(event.target.value) || 0), "Score saved")}
            />
          </td>
        );
      })}
      <td className="total-cell">{total}</td>
    </tr>
  );
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
  }
}

createRoot(document.getElementById("root")).render(<App />);
