import { CORE_STATS, STAT_LABELS, STAT_EMOJIS } from "../data/players.js";
import { MAX_GUESSES } from "../game/gameState.js";
import { inlinePlayerSearchMarkup } from "./playerSearch.js";

const SYMBOLS = { higher: "⬆️", lower: "⬇️", equal: "✅" };
const SHARE_HEADER = CORE_STATS.map((stat) => STAT_EMOJIS[stat]).join("");
const SHORT_STAT_LABELS = { battingPower: "PWR", battingContact: "CON", stamina: "STA", speed: "SPD", coordination: "CRD", arm: "STR", throwing: "ACC", vision: "VIS" };

function rangeLabel(range) {
  if (!range) return "?";
  return range.min === range.max ? `${range.min}` : range.label;
}

function mysteryRangeMarkup(range) {
  if (!range) return "?";
  if (range.min === range.max) return `${range.min}`;
  return `<span>${range.min}</span><span class="range-separator" aria-hidden="true">-</span><span>${range.max}</span>`;
}

export function statHeaderMarkup() {
  return `<div class="report-header">${CORE_STATS.map((stat) => `<span><span class="stat-header-emoji" aria-hidden="true">${STAT_EMOJIS[stat]}</span>${SHORT_STAT_LABELS[stat]}</span>`).join("")}</div>`;
}

export function generateEmojiShare(guesses, scoutedStats = {}, scoutTokens = 0) {
  const SCOUT_TOKENS = 2;
  const scoutUsed = SCOUT_TOKENS - scoutTokens;
  const lines = guesses.map((guess) => {
    const isCorrect = Object.keys(guess.comparisons ?? {}).length === 0;
    if (isCorrect) {
      return CORE_STATS.map(() => "🟩").join("");
    }
    return CORE_STATS.map((stat) => {
      const comparison = guess.comparisons?.[stat];
      if (comparison === "higher") return "🟦";
      if (comparison === "lower") return "🟥";
      if (comparison === "equal") return "🟩";
      return "⬜";
    }).join("");
  }).join("\n");

  const scoutRow = Object.keys(scoutedStats).length > 0 ? `\nScouts: ${Object.keys(scoutedStats).map((stat) => SHORT_STAT_LABELS[stat]).join("")}` : "";
  const result = `${SHARE_HEADER}\n${lines}${scoutRow}`;
  return result;
}

export function guessHistoryMarkup(guesses, possibleRanges = {}, scoutedStats = {}, availablePlayers = [], scoutTokens = 0, scoutAvailable = false, gameOver = false) {
  const reportHeader = statHeaderMarkup();
  const guessRows = guesses.map((guess, index) => {
    const isCorrect = Object.keys(guess.comparisons ?? {}).length === 0;
    const isIncorrect = Object.keys(guess.comparisons ?? {}).length > 0;
    return `<article class="guess-row${isIncorrect ? " incorrect" : ""}${isCorrect ? " correct" : ""}"><h3>#${index + 1}: ${isCorrect ? "✅ " : isIncorrect ? "❌ " : ""}${guess.playerName}</h3>${reportHeader}<div class="history-stats">${CORE_STATS.map((stat) => {
    const comparison = isCorrect ? "equal" : guess.comparisons?.[stat];
    return `<div class="${comparison ? `direction-${comparison}` : ""}"><div class="stat-value-line"><strong>${guess.playerStats[stat]}</strong>${comparison ? `<small aria-label="${comparison}">${SYMBOLS[comparison]}</small>` : ""}</div></div>`;
    }).join("")}</div></article>`;
  }).join("");
  const mysteryRow = gameOver ? "" : `<article class="mystery-row"><h3 id="mystery-guess-title">#${guesses.length + 1}: ???????</h3>${reportHeader}<div class="history-stats">${CORE_STATS.map((stat) => { const range = possibleRanges[stat] || scoutedStats[stat]; return `<div class="${range ? "revealed" : ""}" data-stat="${stat}"><strong class="range-value">${mysteryRangeMarkup(range)}</strong></div>`; }).join("")}</div><div class="inline-guess-preview" id="inline-guess-preview" hidden></div>${availablePlayers.length ? inlinePlayerSearchMarkup(availablePlayers, scoutTokens, scoutAvailable) : ""}</article>`;
  const emptyRowCount = MAX_GUESSES - guesses.length - (gameOver ? 0 : 1);
  const emptyRows = Array.from({ length: Math.max(0, emptyRowCount) }, (_, index) => {
    const number = guesses.length + (gameOver ? 1 : 2) + index;
    return `<article class="guess-row empty-guess-row"><h3>#${number}: -----</h3></article>`;
  }).join("");
  return `<section class="history"><div class="report-scroll"><div class="report-grid">${guessRows}${mysteryRow}${emptyRows}</div></div></section>`;
}