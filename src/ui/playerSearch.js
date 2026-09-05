export function playerSearchMarkup(players, guessedIds) {
  const options = players.map((player) => `<button class="player-option" type="button" data-player-id="${player.id}">${player.name}</button>`).join("");
  return `<div class="guess-controls"><h2>Guess a player</h2><label class="search-label">Search players<input id="player-search" type="search" autocomplete="off" placeholder="Start typing a name" autofocus /></label><div class="sheet-action" id="guess-confirmation"></div></div><div class="player-options" id="player-options">${options}</div>`;
}

export function inlinePlayerSearchMarkup(players, scoutTokens, scoutAvailable) {
  const options = [...players].sort((firstPlayer, secondPlayer) => firstPlayer.name.localeCompare(secondPlayer.name)).map((player) => `<button class="player-option" type="button" data-player-id="${player.id}">${player.name}</button>`).join("");
  return `<div class="inline-guess"><div class="guess-input-header"><label class="search-label guess-input-label" for="inline-player-search">Guess a player</label><div class="guess-meta"><div><strong>${players.length}</strong><span>available</span></div><div><strong>${scoutTokens}</strong><span>scouts</span></div>${scoutAvailable ? `<button class="text-button" id="inline-scout-stat" type="button">Scout a stat</button>` : ""}</div></div><div class="guess-input-row"><input id="inline-player-search" type="search" autocomplete="off" placeholder="Type a player name" aria-label="Guess a player" /><button class="primary-action" id="inline-guess" type="button" disabled>Guess</button></div><div class="player-options" id="inline-player-options">${options}</div></div>`;
}

export function wirePlayerSearch(root, onSelect, searchId = "player-search", optionsId = "player-options", hideUntilTyped = false) {
  const search = root.querySelector(`#${searchId}`);
  const optionsList = root.querySelector(`#${optionsId}`);
  const options = [...root.querySelectorAll(`#${optionsId} .player-option`)];
  if (!search) return;
  if (hideUntilTyped && optionsList) optionsList.style.display = "none";
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase().trim();
    options.forEach((option) => { option.hidden = !option.textContent.toLowerCase().includes(query); });
  });
  if (hideUntilTyped) {
    search.addEventListener("focus", () => { if (optionsList) optionsList.style.display = "grid"; });
  }
  options.forEach((option) => option.addEventListener("click", () => onSelect(option.dataset.playerId)));
}