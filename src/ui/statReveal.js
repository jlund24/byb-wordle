import { STAT_LABELS, STAT_EMOJIS } from "../data/players.js";

export function scoutMarkup(stats, tokens) {
  return `<h2 id="sheet-title">Scout a stat</h2><p class="sheet-subtitle">Filter available players to those in the same bucket (0-25, 26-50, etc.) as the mystery player for one of the stats below.</p><div class="clue-options">${stats.map((stat) => `<button class="clue-button" type="button" data-stat="${stat}"><span class="clue-emoji" aria-hidden="true">${STAT_EMOJIS[stat]}</span>${STAT_LABELS[stat]}</button>`).join("")}</div>`;
}