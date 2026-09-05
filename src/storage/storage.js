const DAILY_STORAGE_KEY = "backyardle-progress";
const RANDOM_STORAGE_KEY = "backyardle-random-progress";

function storageKey(mode) {
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