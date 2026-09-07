import { comparePlayer, equivalentProfiles } from "./comparisons.js";
import { getStatRange, possibleRangesForGuesses, possibleTypesForGuesses } from "./statRanges.js";
import { CORE_STATS } from "../data/players.js?v=types-2";

export const MAX_GUESSES = 6;
export const GAME_STATE_VERSION = 6;
export const SCOUT_TOKENS = 2;

export function createGameState(puzzle) {
  return {
    version: GAME_STATE_VERSION,
    puzzleId: puzzle.id,
    mysteryId: puzzle.mysteryId,
    startingStats: [],
    revealedStats: [],
    scoutedStats: {},
    possibleRanges: {},
    possibleTypes: ["Backyard", "Generic", "Pro/Clone"],
    scoutTokens: SCOUT_TOKENS,
    guesses: [],
    status: "playing",
    chosenClues: [],
    scoutsThisGuess: 0,
    awaitingGuess: true
  };
}

export function submitGuess(state, guess, mystery) {
  if (state.status !== "playing" || !state.awaitingGuess) throw new Error("A clue must be selected before guessing again.");
  if (state.guesses.some((entry) => entry.playerId === guess.id)) throw new Error("That player has already been guessed.");
  const correct = equivalentProfiles(guess, mystery);
  const comparisons = correct ? {} : comparePlayer(guess, mystery);
  const guessRecord = { playerId: guess.id, playerName: guess.name, playerStats: Object.fromEntries(CORE_STATS.map((stat) => [stat, guess[stat]])), comparisons };
  const guesses = [...state.guesses, guessRecord];
  const possibleRanges = possibleRangesForGuesses(guesses);
  const possibleTypes = possibleTypesForGuesses(guesses);
  guessRecord.possibleRanges = possibleRanges;
  const terminal = correct || guesses.length === MAX_GUESSES;
  return {
    ...state,
    guesses,
    possibleRanges,
    possibleTypes,
    status: correct ? "won" : guesses.length === MAX_GUESSES ? "lost" : "playing",
    scoutsThisGuess: 0,
    awaitingGuess: true
  };
}

export function scoutStat(state, stat, mystery) {
  if (stat === "type" || state.status !== "playing" || state.guesses.length === 0 || (state.scoutsThisGuess ?? 0) >= 1 || state.scoutTokens <= 0 || !CORE_STATS.includes(stat) || state.scoutedStats[stat]) throw new Error("That stat cannot be scouted.");
  const range = state.possibleRanges[stat] || getStatRange(mystery[stat]);
  return { ...state, scoutTokens: state.scoutTokens - 1, scoutsThisGuess: (state.scoutsThisGuess ?? 0) + 1, scoutedStats: { ...state.scoutedStats, [stat]: range }, revealedStats: [...state.revealedStats, stat], chosenClues: [...state.chosenClues, stat] };
}