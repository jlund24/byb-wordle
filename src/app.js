import { CORE_STATS, PLAYERS, STAT_LABELS } from "./data/players.js";
import { createDailyPuzzle, createRandomPuzzle, dateId, parsePuzzleDate } from "./game/puzzle.js?v=random-mode-1";
import { createGameState, scoutStat, submitGuess } from "./game/gameState.js?v=scout-1";
import { equivalentPlayers } from "./game/comparisons.js";
import { filterCandidates } from "./game/filtering.js";
import { loadProgress, saveProgress } from "./storage/storage.js";
import { playerSearchMarkup, wirePlayerSearch } from "./ui/playerSearch.js?v=sticky-2";
import { candidatesMarkup } from "./ui/candidateDrawer.js";
import { scoutMarkup } from "./ui/statReveal.js?v=scout-copy-3";
import { guessHistoryMarkup, generateEmojiShare, statHeaderMarkup } from "./ui/guessHistory.js";

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
  : createDailyPuzzle(PLAYERS, puzzleDate, parameters.get("player"));
const mystery = PLAYERS.find((player) => player.id === puzzle.mysteryId);
const savedState = loadProgress(puzzle.id, isRandomMode ? "random" : "daily");
const savedStateIsCurrent = savedState?.version === 5 && savedState.startingStats?.length === 0 && savedState.mysteryId === puzzle.mysteryId && Number.isInteger(savedState.scoutTokens) && savedState.scoutedStats && savedState.possibleRanges && savedState.guesses.every((guess) => PLAYERS.some((player) => player.id === guess.playerId) && guess.comparisons && [0, 8].includes(Object.keys(guess.comparisons).length));
let state = savedStateIsCurrent ? savedState : createGameState(puzzle);
let priorFocus;
let pendingGuessPlayerId = null;
let copyStatusTimeout;

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

function persistAndRender() { saveProgress(state, isRandomMode ? "random" : "daily"); render(); }
function openGameOverSheet() {
  openSheet(gameOverMarkup(), () => {
    sheet.querySelector("#share-result")?.addEventListener("click", shareResult);
    sheet.querySelector("#next-random")?.addEventListener("click", startRandomRound);
    sheet.querySelector("#try-random")?.addEventListener("click", startRandomRound);
  });
}
function guessedIds() { return state.guesses.map((guess) => guess.playerId); }
function closeSheet() { sheet.hidden = true; backdrop.hidden = true; backdrop.classList.remove("scout-backdrop"); priorFocus?.focus(); }
function openSheet(content, setup, backdropClass) {
  priorFocus = document.activeElement;
  sheet.innerHTML = `<button class="close-sheet" type="button" aria-label="Close">×</button>${content}`;
  backdrop.classList.toggle("scout-backdrop", backdropClass === "scout-backdrop");
  sheet.hidden = false; backdrop.hidden = false;
  sheet.querySelector(".close-sheet").addEventListener("click", closeSheet);
  setup?.();
  sheet.querySelector("input, button:not(.close-sheet)")?.focus();
}

function openGuess(playerId) {
  if (playerId) {
    const player = PLAYERS.find((item) => item.id === playerId);
    sheet.querySelector("#guess-confirmation").innerHTML = `<p><strong>${player.name}</strong></p><button class="primary-action" id="make-guess" type="button">Make guess</button>`;
    sheet.querySelector("#make-guess").addEventListener("click", () => {
      try { state = submitGuess(state, player, mystery); persistAndRender(); closeSheet(); }
      catch (error) { alert(error.message); }
    });
    return;
  }
  const availablePlayers = filterCandidates(PLAYERS, state, mystery).filter((player) => !guessedIds().includes(player.id));
  openSheet(playerSearchMarkup(availablePlayers, guessedIds()), () => wirePlayerSearch(sheet, openGuess));
}

function selectInlineGuess(root, playerId) {
  const player = PLAYERS.find((item) => item.id === playerId);
  const currentRow = root.closest(".mystery-row");
  pendingGuessPlayerId = playerId;
  root.dataset.selectedPlayerId = playerId;
  root.querySelector("#inline-player-search").value = player.name;
  currentRow.querySelector("#mystery-guess-title").textContent = `#${state.guesses.length + 1}: ${player.name}`;
  currentRow.querySelector("#inline-guess-preview").innerHTML = `<div class="history-stats">${CORE_STATS.map((stat) => {
    const range = state.possibleRanges[stat] || state.scoutedStats[stat];
    return `<div><div class="stat-value-line"><strong>${player[stat]}</strong></div></div>`;
  }).join("")}</div>`;
  currentRow.querySelector("#inline-guess-preview").hidden = false;
  window.requestAnimationFrame(focusCurrentGuess);
  const guessButton = document.querySelector("#inline-guess");
  if (guessButton) guessButton.disabled = false;
}

function submitPendingGuess() {
  const player = PLAYERS.find((item) => item.id === pendingGuessPlayerId);
  if (!player) return;
  try { state = submitGuess(state, player, mystery); pendingGuessPlayerId = null; persistAndRender(); }
  catch (error) { alert(error.message); }
}

function openCandidates() {
  const candidates = filterCandidates(PLAYERS, state, mystery);
  openSheet(candidatesMarkup(candidates, guessedIds()), () => sheet.querySelectorAll("[data-player-id]").forEach((button) => button.addEventListener("click", () => { closeSheet(); openGuess(button.dataset.playerId); })));
}

function openScout() {
  openSheet(scoutMarkup(CORE_STATS.filter((stat) => !state.scoutedStats[stat]), state.scoutTokens), () => sheet.querySelectorAll("[data-stat]").forEach((button) => button.addEventListener("click", () => {
    try { state = scoutStat(state, button.dataset.stat, mystery); persistAndRender(); closeSheet(); }
    catch (error) { alert(error.message); }
  })), "scout-backdrop");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to the textarea fallback when clipboard permission is unavailable.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);
  let copied = false;
  try { copied = document.execCommand("copy"); }
  catch { copied = false; }
  textArea.remove();
  return copied;
}

async function shareResult() {
  const emojiShare = generateEmojiShare(state.guesses, state.scoutedStats, state.scoutTokens);
  const header = `Backyardle ${isRandomMode ? "Random" : `Daily - ${puzzleDateLabel}`}: ${state.status === "won" ? `${state.guesses.length}/6` : "X/6"}`;
  const sharedResult = `${header}\n${emojiShare}\nhttps://jlund24.github.io/byb-wordle/`;
  if (await copyText(sharedResult)) {
    const copyStatus = sheet.querySelector("#share-copy-status");
    if (copyStatus) {
      window.clearTimeout(copyStatusTimeout);
      copyStatus.classList.add("is-visible");
      copyStatusTimeout = window.setTimeout(() => { copyStatus.classList.remove("is-visible"); }, 3000);
    }
    return;
  }
  window.prompt("Copy your result:", sharedResult);
}

function gameOverMarkup() {
  if (state.status === "playing") return "";
  const equivalents = equivalentPlayers(PLAYERS, mystery);
  const clues = `Scouted: ${state.chosenClues.length ? state.chosenClues.map((stat) => STAT_LABELS[stat]).join(", ") : "none"}`;
  
  const nextRoundButton = isRandomMode
    ? '<button class="secondary-button" id="next-random" type="button">Next random player</button>'
    : '<button class="secondary-button" id="try-random" type="button">Try random mode</button>';

  if (state.status === "won") {
    return `<section class="result won"><h2 id="sheet-title">Correct!</h2><p>Solved in ${state.guesses.length} guess${state.guesses.length === 1 ? "" : "es"}.</p><button class="secondary-button" id="share-result" type="button">Copy spoiler-free result</button>${nextRoundButton}<p class="share-copy-status" id="share-copy-status" role="status">Result copied!</p></section>`;
  }
  
  const trueStats = `${statHeaderMarkup()}<div class="history-stats">${CORE_STATS.map((stat) => `<div><div class="stat-value-line"><strong>${mystery[stat]}</strong></div></div>`).join("")}</div>`;
  return `<section class="result lost"><h2 id="sheet-title">Out of guesses</h2><p>${isRandomMode ? "This round's" : "Today's"} mystery player:</p><h3>${mystery.name}</h3><div class="loss-profile">${trueStats}</div><p>${clues}</p>${equivalents.length > 1 ? `<p>Accepted: ${equivalents.map((player) => player.name).join(", ")}</p>` : ""}<button class="secondary-button" id="share-result" type="button">Copy spoiler-free result</button>${nextRoundButton}<p class="share-copy-status" id="share-copy-status" role="status">Result copied!</p></section>`;
}

function focusCurrentGuess() {
  const currentRow = app.querySelector(".mystery-row");
  const inputPanel = app.querySelector(".inline-guess");
  if (!currentRow || !inputPanel) return;
  const previousRow = currentRow.previousElementSibling;
  const header = app.querySelector("header");
  const topBoundary = header?.getBoundingClientRect().bottom ?? 0;
  const bottomBoundary = window.innerHeight - inputPanel.getBoundingClientRect().height;
  const rows = [previousRow, currentRow].filter(Boolean);
  const rowsFit = rows.every((row) => {
    const box = row.getBoundingClientRect();
    return box.top >= topBoundary && box.bottom <= bottomBoundary;
  });
  if (!rowsFit) currentRow.scrollIntoView({ block: "center", behavior: "auto" });
}

function render() {
  const candidates = filterCandidates(PLAYERS, state, mystery);
  const availablePlayers = candidates.filter((player) => !guessedIds().includes(player.id));
  const scoutAvailable = state.guesses.length > 0 && (state.scoutsThisGuess ?? 0) < 1 && state.scoutTokens > 0 && Object.keys(state.scoutedStats).length < CORE_STATS.length;
  app.innerHTML = `<header><div class="header-top"><div><h1>Backyardle</h1><p class="eyebrow">Find the ⚾ '01 player in 6</p></div><div class="mode-picker"><select class="mode-select" id="mode-select" aria-label="Game mode"><option value="daily"${isRandomMode ? "" : " selected"}>Daily - ${puzzleDateLabel}</option><option value="random"${isRandomMode ? " selected" : ""}>Random</option></select>${isRandomMode ? '<button class="shuffle-button" id="shuffle-random" type="button" aria-label="Start a new random round" title="Start a new random round">&#128256;</button>' : ""}</div></div><nav class="site-nav" aria-label="Game modes"><a href="./index.html" aria-current="page">Backyardle</a><a href="./statline.html">Statline</a></nav></header>${guessHistoryMarkup(state.guesses, state.possibleRanges, state.scoutedStats, availablePlayers, state.scoutTokens, scoutAvailable, state.status !== "playing")}<div class="bottom-spacer"></div>`;
  app.querySelector("#mode-select").addEventListener("change", (event) => {
    if (event.target.value === "random") startRandomRound();
    else if (isRandomMode) startDailyChallenge();
  });
  app.querySelector("#shuffle-random")?.addEventListener("click", startRandomRound);
  const inlineGuess = app.querySelector(".inline-guess");
  if (inlineGuess) {
    wirePlayerSearch(inlineGuess, (playerId) => selectInlineGuess(inlineGuess, playerId), "inline-player-search", "inline-player-options");
    inlineGuess.querySelector("#inline-scout-stat")?.addEventListener("click", openScout);
    inlineGuess.querySelector("#inline-guess").addEventListener("click", submitPendingGuess);
    inlineGuess.querySelector("#inline-player-search").addEventListener("input", () => {
      if (!inlineGuess.dataset.selectedPlayerId) return;
      pendingGuessPlayerId = null;
      delete inlineGuess.dataset.selectedPlayerId;
      const currentRow = inlineGuess.closest(".mystery-row");
      currentRow.querySelector("#mystery-guess-title").textContent = `#${state.guesses.length + 1}: ???????`;
      currentRow.querySelector("#inline-guess-preview").hidden = true;
      const guessButton = document.querySelector("#inline-guess");
      if (guessButton) guessButton.disabled = true;
    });
  }
  if (state.status !== "playing" && !sheet.dataset.gameOverSeen) {
    sheet.dataset.gameOverSeen = "true";
    openGameOverSheet();
  }
  window.requestAnimationFrame(focusCurrentGuess);
}

backdrop.addEventListener("click", closeSheet);
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !sheet.hidden) closeSheet(); });
scheduleNextDailyPuzzle();
render();