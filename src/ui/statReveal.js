import { STAT_LABELS, STAT_EMOJIS } from "../data/players.js";

export function scoutMarkup(stats, tokens, possibleRanges = {}) {
  const availableStats = stats.filter((stat) => stat !== "type");
  return `<h2 id="sheet-title">Scout a stat</h2><p class="sheet-subtitle">Filter the available players to those matching a stat range below</p><div class="clue-options">${availableStats.map((stat) => {
    const range = possibleRanges[stat] || { min: 0, max: 100 };
    return `<button class="clue-button" type="button" data-stat="${stat}"><span class="clue-emoji" aria-hidden="true">${STAT_EMOJIS[stat]}</span><span class="clue-label"><span>${STAT_LABELS[stat]}</span><small>${range.min}-${range.max}</small></span></button>`;
  }).join("")}</div>`;
}