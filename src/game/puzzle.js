const DAY_MS = 86_400_000;

export function dateId(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parsePuzzleDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? new Date(`${value}T12:00:00`) : new Date();
}

export function puzzleNumber(puzzleDate) {
  const puzzleStart = new Date(`${puzzleDate}T00:00:00`);
  const firstPuzzleDay = new Date(2026, 0, 1);
  return Math.floor((puzzleStart.getTime() - firstPuzzleDay.getTime()) / DAY_MS) + 1;
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hash(text) {
  return [...text].reduce((total, character) => Math.imul(total ^ character.charCodeAt(0), 16777619), 2166136261);
}

/** Create a repeatable mystery player for a calendar day. */
export function createDailyPuzzle(players, puzzleDate, playerOverride) {
  const random = seeded(hash(puzzleDate));
  const mysteryId = playerOverride && players.some((player) => player.id === playerOverride)
    ? playerOverride
    : players[Math.floor(random() * players.length)].id;
  return { id: puzzleDate, number: puzzleNumber(puzzleDate), mysteryId, startingStats: [] };
}

/** Create a repeatable mystery player for one independently generated round. */
export function createRandomPuzzle(players, roundId) {
  const random = seeded(hash(roundId));
  return {
    id: `random-${roundId}`,
    number: "Random",
    mysteryId: players[Math.floor(random() * players.length)].id,
    startingStats: []
  };
}