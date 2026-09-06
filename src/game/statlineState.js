import { STATLINE_STATS } from "../data/players.js";

export const STATLINE_STATE_VERSION = 5;
export const STATLINE_MAX_ATTEMPTS = 3;
export const STATLINE_TIER_ORDER = ["E", "D", "C", "B", "A", "S", "S+"];
export const STATLINE_TIER_RANGES = [
  { tier: "S+", range: "100" }, { tier: "S", range: "85-99" }, { tier: "A", range: "70-84" },
  { tier: "B", range: "55-69" }, { tier: "C", range: "40-54" }, { tier: "D", range: "21-39" }, { tier: "E", range: "1-20" }
];

export function getStatTier(value) {
  if (value === 100) return "S+";
  if (value >= 85) return "S";
  if (value >= 70) return "A";
  if (value >= 55) return "B";
  if (value >= 40) return "C";
  if (value >= 21) return "D";
  return "E";
}

export function compareTiers(guessTier, correctTier) {
  const difference = STATLINE_TIER_ORDER.indexOf(correctTier) - STATLINE_TIER_ORDER.indexOf(guessTier);
  if (difference === 0) return "correct";
  return difference > 0 ? "higher" : "lower";
}

export function playerTiers(player) {
  return Object.fromEntries(STATLINE_STATS.map(({ key }) => [key, getStatTier(player[key])]));
}

export function scoreFirstGuess(guesses, player) {
  const tiers = playerTiers(player);
  return STATLINE_STATS.filter(({ key }) => guesses[key] === tiers[key]).length;
}

export function isStatlineSolved(guesses, player) {
  return scoreFirstGuess(guesses, player) === STATLINE_STATS.length;
}

export function createStatlineState(puzzle) {
  return {
    version: STATLINE_STATE_VERSION,
    puzzleId: puzzle.id,
    mysteryId: puzzle.mysteryId,
    attempt: 0,
    guesses: {},
    activeStat: "battingPower",
    submittedGuesses: {},
    feedback: {},
    lockedStats: [],
    firstGuessScore: null,
    firstGuessTiers: null,
    history: [],
    status: "playing"
  };
}

export function submitStatlineGuess(state, player) {
  if (state.status !== "playing") throw new Error("This Statline puzzle is complete.");
  const correctTiers = playerTiers(player);
  const guesses = { ...state.guesses };
  for (const { key } of STATLINE_STATS) {
    if (!STATLINE_TIER_ORDER.includes(guesses[key])) throw new Error("Choose a tier for every stat before submitting.");
    if (state.lockedStats.includes(key)) guesses[key] = correctTiers[key];
    else if (state.history.some((entry) => entry.guesses[key] === guesses[key])) throw new Error("Choose a tier you have not previously guessed for each unresolved stat.");
  }
  const feedback = Object.fromEntries(STATLINE_STATS.map(({ key }) => [key, compareTiers(guesses[key], correctTiers[key])]));
  const lockedStats = STATLINE_STATS.filter(({ key }) => feedback[key] === "correct").map(({ key }) => key);
  const attempt = state.attempt + 1;
  const solved = lockedStats.length === STATLINE_STATS.length;
  const status = solved ? "won" : attempt === STATLINE_MAX_ATTEMPTS ? "lost" : "playing";
  const exact = lockedStats.length;
  const activeStat = STATLINE_STATS.find(({ key }) => !lockedStats.includes(key))?.key ?? null;
  const nextGuesses = Object.fromEntries(lockedStats.map((key) => [key, correctTiers[key]]));
  return {
    ...state,
    attempt,
    guesses: nextGuesses,
    activeStat,
    submittedGuesses: { ...guesses },
    feedback,
    lockedStats,
    firstGuessScore: state.firstGuessScore ?? scoreFirstGuess(guesses, player),
    firstGuessTiers: state.firstGuessTiers ?? { ...guesses },
    history: [...state.history, { guesses: { ...guesses }, feedback: { ...feedback }, exact }],
    status
  };
}