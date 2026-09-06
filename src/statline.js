import { PLAYERS, STATLINE_STATS, STAT_EMOJIS, STAT_LABELS } from "./data/players.js";
import { createRandomPuzzle, createStatlineDailyPuzzle, dateId, parsePuzzleDate } from "./game/puzzle.js";
import { STATLINE_MAX_ATTEMPTS, STATLINE_STATE_VERSION, STATLINE_TIER_ORDER, STATLINE_TIER_RANGES, createStatlineState, getStatTier, submitStatlineGuess } from "./game/statlineState.js";
import { loadProgress, saveProgress } from "./storage/storage.js";
import { statHeaderMarkup } from "./ui/guessHistory.js";

const app = document.querySelector("#app");
const sheet = document.querySelector("#bottom-sheet");
const backdrop = document.querySelector("#sheet-backdrop");
const parameters = new URLSearchParams(location.search);
const isRandomMode = parameters.get("mode") === "random";
if (isRandomMode && !parameters.get("round")) {
  parameters.set("round", crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  history.replaceState(null, "", `${location.pathname}?${parameters}`);
}
const puzzleDate = dateId(parsePuzzleDate(parameters.get("date")));
const [, puzzleMonth, puzzleDay] = puzzleDate.match(/^\d{4}-(\d{2})-(\d{2})$/);
const puzzleDateLabel = `${Number(puzzleMonth)}/${Number(puzzleDay)}`;
const puzzle = isRandomMode
  ? createRandomPuzzle(PLAYERS, parameters.get("round"))
  : createStatlineDailyPuzzle(PLAYERS, puzzleDate, parameters.get("player"));
const mystery = PLAYERS.find((player) => player.id === puzzle.mysteryId);
const savedState = loadProgress(puzzle.id, isRandomMode ? "statline-random" : "statline");
const savedStateIsCurrent = savedState?.version === STATLINE_STATE_VERSION
  && savedState.mysteryId === puzzle.mysteryId
  && Number.isInteger(savedState.attempt)
  && savedState.attempt >= 0
  && savedState.attempt <= STATLINE_MAX_ATTEMPTS
  && ["playing", "won", "lost"].includes(savedState.status)
  && savedState.guesses && (savedState.activeStat === null || STATLINE_STATS.some(({ key }) => key === savedState.activeStat))
  && savedState.submittedGuesses && savedState.feedback && Array.isArray(savedState.lockedStats)
  && Array.isArray(savedState.history);
let state = savedStateIsCurrent ? savedState : createStatlineState(puzzle);
let copyStatusTimeout;
let priorFocus;
const SHARE_SYMBOLS = { correct: "🟩", higher: "🟦", lower: "🟥" };

function scheduleNextDailyPuzzle() {
  if (isRandomMode || parameters.has("date")) return;
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 1, 0);
  window.setTimeout(() => location.reload(), nextMidnight.getTime() - Date.now());
}

function startRandomRound() {
  const round = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  location.href = `${location.pathname}?mode=random&round=${encodeURIComponent(round)}`;
}

function startDailyChallenge() {
  location.href = location.pathname;
}

function persistAndRender() {
  saveProgress(state, isRandomMode ? "statline-random" : "statline");
  render();
}

function selectTier(stat, tier) {
  if (state.status !== "playing" || !stat || state.lockedStats.includes(stat) || state.history.some((entry) => entry.guesses[stat] === tier)) return;
  const guesses = { ...state.guesses, [stat]: tier };
  const nextStat = STATLINE_STATS.find(({ key }) => !state.lockedStats.includes(key) && !guesses[key])?.key ?? stat;
  state = { ...state, guesses, activeStat: nextStat };
  persistAndRender();
}

function selectActiveStat(stat) {
  if (state.status !== "playing" || state.lockedStats.includes(stat)) return;
  state = { ...state, activeStat: stat };
  persistAndRender();
}

function submitRatings() {
  try {
    state = submitStatlineGuess(state, mystery);
    persistAndRender();
  } catch (error) {
    alert(error.message);
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Use the legacy fallback when clipboard permission is unavailable.
    }
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  let copied = false;
  try { copied = document.execCommand("copy"); } catch { copied = false; }
  textArea.remove();
  return copied;
}

async function shareResult() {
  const finalScore = state.lockedStats.length;
  const emojiHeader = STATLINE_STATS.map(({ key }) => STAT_EMOJIS[key]).join("");
  const emojiRows = state.history.map(({ feedback }) => STATLINE_STATS.map(({ key }) => SHARE_SYMBOLS[feedback[key]]).join("")).join("\n");
  const modeLabel = isRandomMode ? "Random" : `Daily - ${puzzleDateLabel}`;
  const result = `Statline ${modeLabel}\nFirst guess: ${state.firstGuessScore}/8\nFinal: ${finalScore}/8 in ${state.attempt} attempts\n${emojiHeader}\n${emojiRows}\nhttps://jlund24.github.io/byb-wordle/statline.html`;
  if (await copyText(result)) {
    const status = sheet.querySelector("#share-copy-status");
    if (status) {
      window.clearTimeout(copyStatusTimeout);
      status.classList.add("is-visible");
      copyStatusTimeout = window.setTimeout(() => status.classList.remove("is-visible"), 3000);
    }
  } else window.prompt("Copy your result:", result);
}

function feedbackSymbol(feedback) {
  return feedback === "correct" ? "✅" : feedback === "higher" ? "⬆️" : "⬇️";
}

function feedbackText(stat, guess, feedback) {
  const label = STATLINE_STATS.find((item) => item.key === stat).label;
  if (feedback === "correct") return `${label}: guessed ${guess}, correct`;
  return `${label}: guessed ${guess}, correct rating is ${feedback}`;
}

function activeRatingCell({ key }) {
  const guess = state.guesses[key];
  const locked = state.lockedStats.includes(key);
  const label = STATLINE_STATS.find((stat) => stat.key === key).label;
  return `<button type="button" class="statline-active-cell ${locked ? "locked" : ""} ${state.activeStat === key ? "active" : ""}" data-active-stat="${key}" ${locked ? "disabled" : ""} aria-label="${label}: ${guess ? `selected ${guess}` : "not selected"}"><strong>${guess ?? "-"}</strong></button>`;
}

function historyRow(entry, index) {
  return `<article class="guess-row statline-history-row"><div class="history-stats">${STATLINE_STATS.map(({ key }) => {
    const guess = entry.guesses[key];
    const feedback = entry.feedback[key];
    return `<div class="statline-history-cell ${feedback}"><strong>${guess}</strong><small aria-label="${feedbackText(key, guess, feedback)}">${feedbackSymbol(feedback)}</small></div>`;
  }).join("")}</div></article>`;
}

function emptyAttemptRows(hasActiveRow) {
  const remaining = STATLINE_MAX_ATTEMPTS - state.history.length - (hasActiveRow ? 1 : 0);
  return Array.from({ length: Math.max(0, remaining) }, () => `<article class="guess-row empty-guess-row statline-empty-row"><div class="history-stats">${STATLINE_STATS.map(() => "<div><strong>-</strong></div>").join("")}</div></article>`).join("");
}

function statlineHeaderMarkup() {
  return statHeaderMarkup();
}

function resultMarkup() {
  const resultTitle = state.status === "won" ? "Solved!" : "Out of attempts";
  const finalScore = state.lockedStats.length;
  const profile = STATLINE_STATS.map(({ key }) => `<div class="statline-reveal-cell"><div class="stat-value-line"><strong>${getStatTier(mystery[key])}</strong><small>${mystery[key]}</small></div></div>`).join("");
  const nextRoundButton = isRandomMode ? '<button class="secondary-button" id="next-random" type="button">Next random player</button>' : '<button class="secondary-button" id="try-random" type="button">Try random mode</button>';
  return `<section class="statline-result ${state.status}"><h2 id="sheet-title">${resultTitle}</h2><p class="result-player">${mystery.name}</p><p><strong>First guess: ${state.firstGuessScore}/8</strong></p><p>Final: ${finalScore}/8 in ${state.attempt} attempts</p><div class="statline-reveal report-scroll" aria-label="Correct player ratings"><div class="report-grid">${statlineHeaderMarkup()}<div class="history-stats">${profile}</div></div></div><div class="statline-result-actions"><button class="secondary-button" id="share-result" type="button">Copy spoiler-free result</button>${nextRoundButton}</div><p class="share-copy-status" id="share-copy-status" role="status">Result copied!</p></section>`;
}

function closeSheet() {
  sheet.hidden = true;
  backdrop.hidden = true;
  priorFocus?.focus();
}

function openGameOverSheet() {
  priorFocus = document.activeElement;
  sheet.innerHTML = `<button class="close-sheet" type="button" aria-label="Close">×</button>${resultMarkup()}`;
  sheet.hidden = false;
  backdrop.hidden = false;
  sheet.querySelector(".close-sheet").addEventListener("click", closeSheet);
  sheet.querySelector("#share-result").addEventListener("click", shareResult);
  sheet.querySelector("#next-random")?.addEventListener("click", startRandomRound);
  sheet.querySelector("#try-random")?.addEventListener("click", startRandomRound);
  sheet.querySelector("button:not(.close-sheet)")?.focus();
}

function render() {
  const allChosen = STATLINE_STATS.every(({ key }) => STATLINE_TIER_ORDER.includes(state.guesses[key]));
  const activeStat = state.activeStat && !state.lockedStats.includes(state.activeStat) ? state.activeStat : STATLINE_STATS.find(({ key }) => !state.lockedStats.includes(key))?.key;
  const activeLabel = STAT_LABELS[activeStat];
  const activeTitle = activeStat ? `${STAT_EMOJIS[activeStat]} ${activeLabel}` : "Ready to submit";
  const isPlaying = state.status === "playing";
  const activeRow = isPlaying ? `<article class="mystery-row statline-active-row"><div class="history-stats">${STATLINE_STATS.map(activeRatingCell).join("")}</div></article>` : "";
  const action = isPlaying ? `<div class="statline-action"><p class="active-stat-label">${activeTitle}</p><div class="tier-picker shared-tier-picker" role="group" aria-label="Choose a tier for ${activeLabel}">${STATLINE_TIER_ORDER.map((tier) => { const range = STATLINE_TIER_RANGES.find((item) => item.tier === tier).range; const used = activeStat && state.history.some((entry) => entry.guesses[activeStat] === tier); return `<button type="button" class="tier-button" data-tier="${tier}" ${activeStat && !used ? "" : "disabled"} aria-label="${tier}: ${range}${used ? ", already guessed" : ""}"><strong>${tier}</strong><small>${range}</small></button>`; }).join("")}</div><button class="primary-action" id="submit-ratings" type="button" ${allChosen ? "" : "disabled"}>Submit ratings</button></div>` : "";
  app.innerHTML = `<header><div class="header-top"><div><h1>Statline</h1><p class="eyebrow">Guess ⚾ '01 ratings in 3</p></div><div class="mode-picker"><select class="mode-select" id="mode-select" aria-label="Game mode"><option value="daily"${isRandomMode ? "" : " selected"}>Daily - ${puzzleDateLabel}</option><option value="random"${isRandomMode ? " selected" : ""}>Random</option></select>${isRandomMode ? '<button class="shuffle-button" id="shuffle-random" type="button" aria-label="Start a new random round" title="Start a new random round">&#128256;</button>' : ""}</div></div><nav class="site-nav" aria-label="Game modes"><a href="./index.html">Backyardle</a><a href="./statline.html" aria-current="page">Statline</a></nav></header><section class="statline-intro"><h2>${mystery.name}</h2></section><section class="statline-board" aria-label="Statline attempts"><div class="statline-progress"><span>${isPlaying ? `Attempt ${state.attempt + 1} of ${STATLINE_MAX_ATTEMPTS}` : state.status === "won" ? "Solved" : "Out of attempts"}</span>${state.firstGuessScore !== null ? `<strong>First guess: ${state.firstGuessScore}/8</strong>` : ""}</div><div class="report-scroll statline-report-scroll"><div class="report-grid statline-report">${statlineHeaderMarkup()}${state.history.map(historyRow).join("")}${activeRow}${emptyAttemptRows(isPlaying)}</div></div></section>${action}`;
  app.querySelector("#mode-select").addEventListener("change", (event) => {
    if (event.target.value === "random") startRandomRound();
    else if (isRandomMode) startDailyChallenge();
  });
  app.querySelector("#shuffle-random")?.addEventListener("click", startRandomRound);
  app.querySelectorAll("[data-tier]").forEach((button) => button.addEventListener("click", () => selectTier(activeStat, button.dataset.tier)));
  app.querySelectorAll("[data-active-stat]").forEach((button) => button.addEventListener("click", () => selectActiveStat(button.dataset.activeStat)));
  app.querySelector("#submit-ratings")?.addEventListener("click", submitRatings);
  if (!isPlaying && !sheet.dataset.gameOverSeen) {
    sheet.dataset.gameOverSeen = "true";
    openGameOverSheet();
  }
}

backdrop.addEventListener("click", closeSheet);
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !sheet.hidden) closeSheet(); });
scheduleNextDailyPuzzle();
render();