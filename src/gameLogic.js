export function createGame(away = "Away", home = "Home") {
  return {
    teams: { away, home },
    inning: 1,
    half: "top",
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: { first: false, second: false, third: false },
    lineupIndex: { away: 0, home: 0 },
    rosters: createRosters(away, home),
    lineScore: Array.from({ length: 9 }, () => ({ away: 0, home: 0 })),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeGame(game) {
  if (!game) return game;
  const rosters = game.rosters ?? createRosters(game.teams.away, game.teams.home);
  const lineupIndex = game.lineupIndex ?? { away: 0, home: 0 };
  return {
    ...game,
    lineupIndex,
    rosters: {
      away: normalizeRoster(rosters.away, game.teams.away, "away"),
      home: normalizeRoster(rosters.home, game.teams.home, "home"),
    },
  };
}

export function halfLabel(game) {
  return game.half === "top" ? "Top" : "Bottom";
}

export function inningLabel(game) {
  const suffix = game.inning % 10 === 1 && game.inning % 100 !== 11 ? "st" : game.inning % 10 === 2 && game.inning % 100 !== 12 ? "nd" : game.inning % 10 === 3 && game.inning % 100 !== 13 ? "rd" : "th";
  return `${game.inning}${suffix}`;
}

export function scoreForTeam(game, teamKey) {
  return game.lineScore.reduce((sum, inning) => sum + (Number(inning[teamKey]) || 0), 0);
}

export function battingTeamKey(game) {
  return game.half === "top" ? "away" : "home";
}

export function pitchingTeamKey(game) {
  return game.half === "top" ? "home" : "away";
}

export function getCurrentBatter(game) {
  const teamKey = battingTeamKey(game);
  return game.rosters[teamKey].lineup[game.lineupIndex[teamKey]];
}

export function getCurrentPitcher(game) {
  const teamKey = pitchingTeamKey(game);
  const roster = game.rosters[teamKey];
  return roster.pitchers.find((pitcher) => pitcher.id === roster.currentPitcherId) ?? roster.pitchers[0];
}

export function setCount(game, key, value) {
  const limit = key === "balls" ? 3 : 2;
  return touch({ ...game, count: { ...game.count, [key]: clamp(value, 0, limit) } });
}

export function setBase(game, base, occupied) {
  return touch({ ...game, bases: { ...game.bases, [base]: occupied } });
}

export function advanceRunner(game, base) {
  if (!game.bases[base]) return touch(game);
  if (base === "third") return scoreRunner(game, "third");

  const nextBase = base === "first" ? "second" : "third";
  if (game.bases[nextBase]) return touch(game);

  return touch({
    ...game,
    bases: {
      ...game.bases,
      [base]: false,
      [nextBase]: true,
    },
  });
}

export function scoreRunner(game, base) {
  if (!game.bases[base]) return touch(game);
  const teamKey = battingTeamKey(game);
  const lineScore = ensureInnings(game.lineScore, game.inning);
  const inningIndex = game.inning - 1;

  lineScore[inningIndex] = {
    ...lineScore[inningIndex],
    [teamKey]: lineScore[inningIndex][teamKey] + 1,
  };

  return touch({
    ...game,
    bases: {
      ...game.bases,
      [base]: false,
    },
    lineScore,
  });
}

export function clearRunner(game, base) {
  return setBase(game, base, false);
}

export function stealBase(game, base) {
  return advanceRunner(game, base);
}

export function setLineScore(game, inningNumber, teamKey, runs) {
  const lineScore = ensureInnings(game.lineScore, inningNumber);
  lineScore[inningNumber - 1] = { ...lineScore[inningNumber - 1], [teamKey]: Math.max(0, runs) };
  return touch({ ...game, lineScore });
}

export function adjustTeamScore(game, teamKey, delta) {
  const lineScore = ensureInnings(game.lineScore, game.inning);
  const inningIndex = game.inning - 1;
  lineScore[inningIndex] = {
    ...lineScore[inningIndex],
    [teamKey]: Math.max(0, lineScore[inningIndex][teamKey] + delta),
  };
  return touch({ ...game, lineScore });
}

export function setInning(game, inning) {
  const nextInning = Math.max(1, inning);
  return touch({
    ...game,
    inning: nextInning,
    lineScore: ensureInnings(game.lineScore, nextInning),
  });
}

export function setHalf(game, half) {
  return touch({ ...game, half: half === "bottom" ? "bottom" : "top" });
}

export function setOuts(game, outs) {
  return touch({ ...game, outs: clamp(outs, 0, 2) });
}

export function updateLineupName(game, teamKey, index, name) {
  const rosters = cloneRosters(game.rosters);
  rosters[teamKey].lineup[index] = { ...rosters[teamKey].lineup[index], name };
  return touch({ ...game, rosters });
}

export function replaceCurrentBatter(game, name) {
  const trimmed = name.trim();
  if (!trimmed) return touch(game);
  const teamKey = battingTeamKey(game);
  const index = game.lineupIndex[teamKey];
  const rosters = cloneRosters(game.rosters);
  const outgoing = rosters[teamKey].lineup[index];
  const replacement = createBatter(trimmed, `${teamKey}-ph-${Date.now()}`);
  replacement.subFor = outgoing.name;
  replacement.entered = `${inningLabel(game)} ${halfLabel(game)}`;
  rosters[teamKey].bench = [...rosters[teamKey].bench, outgoing];
  rosters[teamKey].lineup[index] = replacement;
  rosters[teamKey].substitutions = [
    ...rosters[teamKey].substitutions,
    `${replacement.name} pinch hit for ${outgoing.name} in the ${replacement.entered}.`,
  ];
  return touch({ ...game, rosters });
}

export function updatePitcherName(game, teamKey, pitcherId, name) {
  const rosters = cloneRosters(game.rosters);
  rosters[teamKey].pitchers = rosters[teamKey].pitchers.map((pitcher) => (pitcher.id === pitcherId ? { ...pitcher, name } : pitcher));
  return touch({ ...game, rosters });
}

export function changePitcher(game, teamKey, name) {
  const trimmed = name.trim();
  if (!trimmed) return touch(game);
  const rosters = cloneRosters(game.rosters);
  const pitcher = createPitcher(trimmed, `${teamKey}-p-${Date.now()}`);
  pitcher.entered = `${inningLabel(game)} ${halfLabel(game)}`;
  rosters[teamKey].pitchers = [...rosters[teamKey].pitchers, pitcher];
  rosters[teamKey].currentPitcherId = pitcher.id;
  return touch({ ...game, rosters });
}

export function setCurrentPitcher(game, teamKey, pitcherId) {
  const rosters = cloneRosters(game.rosters);
  rosters[teamKey].currentPitcherId = pitcherId;
  return touch({ ...game, rosters });
}

export function applyOutcome(game, outcome) {
  switch (outcome) {
    case "Ball":
      return game.count.balls >= 3 ? forceBatterToFirst(game, "Walk") : setCount(game, "balls", game.count.balls + 1);
    case "Strike":
      return game.count.strikes >= 2 ? addOut(game, "Strikeout") : setCount(game, "strikes", game.count.strikes + 1);
    case "Foul":
      return game.count.strikes < 2 ? setCount(game, "strikes", game.count.strikes + 1) : touch(game);
    case "In play / Out":
      return addOut(game, "In play / Out");
    case "Out":
      return addOut(game);
    case "Single":
      return advanceBatter(game, 1, "Single");
    case "Double":
      return advanceBatter(game, 2, "Double");
    case "Triple":
      return advanceBatter(game, 3, "Triple");
    case "Home Run":
      return advanceBatter(game, 4, "Home Run");
    case "Walk":
    case "Hit by Pitch":
    case "Error":
      return forceBatterToFirst(game, outcome);
    default:
      return touch(game);
  }
}

function addOut(game, result = "Out") {
  const recorded = recordPlateAppearance(game, { result, outs: 1 });
  const nextGame = advanceLineup(recorded);

  if (game.outs < 2) {
    return touch({ ...nextGame, outs: game.outs + 1, count: { balls: 0, strikes: 0 } });
  }

  return touch({
    ...nextGame,
    inning: game.half === "bottom" ? game.inning + 1 : game.inning,
    half: game.half === "top" ? "bottom" : "top",
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: { first: false, second: false, third: false },
    lineScore: ensureInnings(game.lineScore, game.half === "bottom" ? game.inning + 1 : game.inning),
  });
}

function advanceBatter(game, basesAdvanced, result) {
  const battingTeam = battingTeamKey(game);
  const runners = [
    { base: 3, occupied: game.bases.third },
    { base: 2, occupied: game.bases.second },
    { base: 1, occupied: game.bases.first },
    { base: 0, occupied: true },
  ];
  let runs = 0;
  const nextBases = { first: false, second: false, third: false };

  for (const runner of runners) {
    if (!runner.occupied) continue;
    const nextBase = runner.base + basesAdvanced;
    if (nextBase >= 4) {
      runs += 1;
    } else if (nextBase === 3) {
      nextBases.third = true;
    } else if (nextBase === 2) {
      nextBases.second = true;
    } else if (nextBase === 1) {
      nextBases.first = true;
    }
  }

  const lineScore = ensureInnings(game.lineScore, game.inning);
  const inningIndex = game.inning - 1;
  lineScore[inningIndex] = {
    ...lineScore[inningIndex],
    [battingTeam]: lineScore[inningIndex][battingTeam] + runs,
  };

  const recorded = recordPlateAppearance({ ...game, lineScore }, { result, runs, hit: true, homeRun: basesAdvanced === 4 });
  return touch(advanceLineup({
    ...recorded,
    count: { balls: 0, strikes: 0 },
    bases: nextBases,
  }));
}

function forceBatterToFirst(game, result) {
  const battingTeam = battingTeamKey(game);
  const nextBases = { ...game.bases };
  let runs = 0;

  if (game.bases.first && game.bases.second && game.bases.third) {
    runs += 1;
  }
  if (game.bases.first && game.bases.second) {
    nextBases.third = true;
  }
  if (game.bases.first) {
    nextBases.second = true;
  }
  nextBases.first = true;

  const lineScore = ensureInnings(game.lineScore, game.inning);
  if (runs > 0) {
    const inningIndex = game.inning - 1;
    lineScore[inningIndex] = {
      ...lineScore[inningIndex],
      [battingTeam]: lineScore[inningIndex][battingTeam] + runs,
    };
  }

  const recorded = recordPlateAppearance({ ...game, lineScore }, {
    result,
    runs,
    walk: result === "Walk",
    hbp: result === "Hit by Pitch",
  });

  return touch(advanceLineup({
    ...recorded,
    count: { balls: 0, strikes: 0 },
    bases: nextBases,
  }));
}

function advanceLineup(game) {
  const teamKey = battingTeamKey(game);
  return {
    ...game,
    lineupIndex: {
      ...game.lineupIndex,
      [teamKey]: (game.lineupIndex[teamKey] + 1) % game.rosters[teamKey].lineup.length,
    },
  };
}

function recordPlateAppearance(game, details) {
  const batterTeam = battingTeamKey(game);
  const pitcherTeam = pitchingTeamKey(game);
  const batter = getCurrentBatter(game);
  const pitcher = getCurrentPitcher(game);
  const rosters = cloneRosters(game.rosters);

  rosters[batterTeam].lineup = rosters[batterTeam].lineup.map((player) => {
    if (player.id !== batter.id) return player;
    return {
      ...player,
      stats: addBatterStats(player.stats, details),
      results: [...player.results, details.result],
    };
  });

  rosters[pitcherTeam].pitchers = rosters[pitcherTeam].pitchers.map((player) => {
    if (player.id !== pitcher.id) return player;
    return {
      ...player,
      stats: addPitcherStats(player.stats, details),
      results: [...player.results, `${batter.name}: ${details.result}`],
    };
  });

  return { ...game, rosters };
}

function addBatterStats(stats, details) {
  return {
    ...stats,
    pa: stats.pa + 1,
    h: stats.h + (details.hit ? 1 : 0),
    bb: stats.bb + (details.walk ? 1 : 0),
    hbp: stats.hbp + (details.hbp ? 1 : 0),
    hr: stats.hr + (details.homeRun ? 1 : 0),
    rbi: stats.rbi + (details.runs ?? 0),
    so: stats.so + (details.result === "Strikeout" ? 1 : 0),
    outs: stats.outs + (details.outs ?? 0),
  };
}

function addPitcherStats(stats, details) {
  return {
    ...stats,
    bf: stats.bf + 1,
    h: stats.h + (details.hit ? 1 : 0),
    bb: stats.bb + (details.walk ? 1 : 0),
    hbp: stats.hbp + (details.hbp ? 1 : 0),
    hr: stats.hr + (details.homeRun ? 1 : 0),
    r: stats.r + (details.runs ?? 0),
    k: stats.k + (details.result === "Strikeout" ? 1 : 0),
    outs: stats.outs + (details.outs ?? 0),
  };
}

function createRosters(away, home) {
  return {
    away: createRoster(away, "away"),
    home: createRoster(home, "home"),
  };
}

function createRoster(teamName, teamKey) {
  return {
    lineup: Array.from({ length: 9 }, (_, index) => createBatter(`${teamName} Batter ${index + 1}`, `${teamKey}-b-${index + 1}`)),
    bench: [],
    pitchers: [createPitcher(`${teamName} Pitcher`, `${teamKey}-p-1`)],
    currentPitcherId: `${teamKey}-p-1`,
    substitutions: [],
  };
}

function normalizeRoster(roster, teamName, teamKey) {
  const fallback = createRoster(teamName, teamKey);
  const lineup = (roster?.lineup?.length ? roster.lineup : fallback.lineup).map((player, index) => normalizeBatter(player, index, teamName));
  const pitchers = (roster?.pitchers?.length ? roster.pitchers : fallback.pitchers).map((player, index) => normalizePitcher(player, index, teamName));
  return {
    lineup,
    bench: (roster?.bench ?? []).map((player, index) => normalizeBatter(player, index, teamName)),
    pitchers,
    currentPitcherId: roster?.currentPitcherId ?? pitchers[0].id,
    substitutions: roster?.substitutions ?? [],
  };
}

function createBatter(name, id) {
  return { id, name, stats: { pa: 0, h: 0, bb: 0, hbp: 0, hr: 0, rbi: 0, so: 0, outs: 0 }, results: [] };
}

function normalizeBatter(player, index, teamName) {
  const fallback = createBatter(`${teamName} Batter ${index + 1}`, player?.id ?? `b-${index}`);
  return {
    ...fallback,
    ...player,
    stats: { ...fallback.stats, ...(player?.stats ?? {}) },
    results: player?.results ?? [],
  };
}

function createPitcher(name, id) {
  return { id, name, stats: { bf: 0, h: 0, bb: 0, hbp: 0, hr: 0, r: 0, k: 0, outs: 0 }, results: [] };
}

function normalizePitcher(player, index, teamName) {
  const fallback = createPitcher(`${teamName} Pitcher ${index + 1}`, player?.id ?? `p-${index}`);
  return {
    ...fallback,
    ...player,
    stats: { ...fallback.stats, ...(player?.stats ?? {}) },
    results: player?.results ?? [],
  };
}

function cloneRosters(rosters) {
  return {
    away: cloneRoster(rosters.away),
    home: cloneRoster(rosters.home),
  };
}

function cloneRoster(roster) {
  return {
    ...roster,
    lineup: roster.lineup.map(clonePlayer),
    bench: roster.bench.map(clonePlayer),
    pitchers: roster.pitchers.map(clonePlayer),
    substitutions: [...roster.substitutions],
  };
}

function clonePlayer(player) {
  return { ...player, stats: { ...player.stats }, results: [...player.results] };
}

function ensureInnings(lineScore, inningNumber) {
  const next = lineScore.map((inning) => ({ ...inning }));
  while (next.length < inningNumber) {
    next.push({ away: 0, home: 0 });
  }
  return next;
}

function touch(game) {
  return { ...game, updatedAt: new Date().toISOString() };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
