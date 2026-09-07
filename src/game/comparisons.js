import { CORE_STATS } from "../data/players.js?v=types-2";

export function comparisonFor(stat, guessValue, mysteryValue) {
  if (stat === "type") return mysteryValue === guessValue ? "equal" : "wrong";
  if (mysteryValue === guessValue) return "equal";
  return mysteryValue > guessValue ? "higher" : "lower";
}

export function comparePlayer(guess, mystery) {
  return Object.fromEntries(CORE_STATS.map((stat) => [stat, comparisonFor(stat, guess[stat], mystery[stat])]));
}

export function equivalentProfiles(first, second) {
  return CORE_STATS.every((stat) => first[stat] === second[stat]);
}

export function equivalentPlayers(players, mystery) {
  return players.filter((player) => equivalentProfiles(player, mystery));
}