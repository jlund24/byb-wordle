const DAILY_STORAGE_KEY = "backyardle-progress";
const RANDOM_STORAGE_KEY = "backyardle-random-progress";
const STATLINE_STORAGE_KEY = "backyardle-statline-progress";
const STATLINE_RANDOM_STORAGE_KEY = "backyardle-statline-random-progress";

function storageKey(mode) {
  if (mode === "statline") return STATLINE_STORAGE_KEY;
  if (mode === "statline-random") return STATLINE_RANDOM_STORAGE_KEY;
  return mode === "random" ? RANDOM_STORAGE_KEY : DAILY_STORAGE_KEY;
}

export function loadProgress(puzzleId, mode = "daily") {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(mode)));
    return saved?.puzzleId === puzzleId ? saved : null;
  } catch { return null; }
}

export function saveProgress(state, mode = "daily") {
  localStorage.setItem(storageKey(mode), JSON.stringify(state));
}