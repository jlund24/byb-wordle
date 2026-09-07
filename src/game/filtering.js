import { CORE_STATS } from "../data/players.js?v=types-2";
import { valueFallsInRange } from "./statRanges.js";

/** Return players consistent with explicitly scouted ranges. */
export function filterCandidates(players, state, mystery) {
  return players.filter((player) => {
    return CORE_STATS.every((stat) => {
      const range = state.scoutedStats[stat];
      if (!range || typeof player[stat] !== "number") return true;
      return valueFallsInRange(player[stat], range);
    });
  });
}