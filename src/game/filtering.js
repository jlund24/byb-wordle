import { CORE_STATS } from "../data/players.js";
import { valueFallsInRange } from "./statRanges.js";

/** Return players consistent with all revealed ranges and past directional evidence. */
export function filterCandidates(players, state, mystery) {
  return players.filter((player) => {
    return CORE_STATS.every((stat) => !state.scoutedStats[stat] || valueFallsInRange(player[stat], state.scoutedStats[stat]));
  });
}