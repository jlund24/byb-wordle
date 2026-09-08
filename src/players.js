import { PLAYERS, STAT_LABELS } from "./data/players.js?v=player-explorer-1";
import { getStatTier, speedTierNumber } from "./game/statlineState.js";
import { playerImageMarkup } from "./ui/playerImage.js";

const app = document.querySelector("#app");
const STAT_GROUPS = [
  { label: "Offense", overall: "offense", stats: ["battingPower", "battingContact", "vision"] },
  { label: "Defense", overall: "defense", stats: ["coordination", "arm", "throwing", "attention", "intelligence", "aggression"] },
  { label: "Speed", overall: "speedTier", stats: ["speed", "stamina"] },
  { label: "Pitching", overall: "pitching", stats: ["heat", "slowball", "leftHook", "rightHook", "corkscrew", "zigZag", "bigFreeze", "fireball", "spitball", "crazyball", "sloMo", "elevator"] }
];
const SORT_OPTIONS = [
  ["name", "Player Name"], ["overallRank", "Overall Rank"], ["offense", "Offense"],
  ["defense", "Defense"], ["pitching", "Pitching"], ["battingPower", "Bat Power"],
  ["battingContact", "Bat Contact"], ["speed", "Speed"], ["coordination", "Coordination"],
  ["stamina", "Stamina"], ["arm", "Arm Strength"], ["throwing", "Arm Accuracy"], ["vision", "Vision"]
];
const STAT_LABELS_EXTENDED = {
  ...STAT_LABELS, coordination: "Coordination", heat: "Heat", slowball: "Slowball", leftHook: "Left Hook", rightHook: "Right Hook",
  corkscrew: "Corkscrew", zigZag: "Zig-Zag", bigFreeze: "Big Freeze", fireball: "Fireball", spitball: "Spitball",
  crazyball: "Crazyball", sloMo: "Slo-mo", elevator: "Elevator", attention: "Attention", intelligence: "Intelligence", aggression: "Aggression"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function playerFromUrl() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return null;
  return PLAYERS.find((player) => player.id === id || String(player.sourceId) === id) ?? false;
}

function navMarkup() {
  return `<header><div class="header-top"><div><h1>Player Explorer</h1><p class="eyebrow">Browse ⚾ '01 players</p></div></div><nav class="site-nav" aria-label="Site navigation"><a href="./index.html">Backyardle</a><a href="./statline.html">Statline</a><a href="./players.html" aria-current="page">Players</a><a class="feedback-link" href="https://forms.gle/gLtTRZACfh8tKT6p6" target="_blank" rel="noopener noreferrer">Feedback <span aria-hidden="true">↗</span></a></nav></header>`;
}

function metadata(player) {
  return [
    ["Bats", player.bats], ["Throws", player.throws], ["Gender", player.gender],
    ["Nickname", player.nickname], ["Type", player.type], ["Best Position", player.bestPosition], ["Height", player.height ? `${player.height}/5` : ""],
    ["Birthday", player.birthdayMonth && player.birthdayDay ? `${player.birthdayMonth} ${player.birthdayDay}` : ""]
  ].filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function tierBadgeMarkup(player) {
  return player.tier ? ` <span class="tier-divider" aria-hidden="true">·</span> <span class="tier-badge">${escapeHtml(player.tier)}</span>` : "";
}

function playerCard(player) {
  const overallStats = [["offense", "OFF"], ["defense", "DEF"], ["speedTier", "SPD"], ["pitching", "PIT"]];
  return `<a class="player-card" href="./players.html?id=${encodeURIComponent(player.sourceId)}"><div class="player-card-heading">${playerImageMarkup(player)}<div><h3>${escapeHtml(player.name)}</h3><p><span class="player-card-rank">${escapeHtml(player.type)} · Rank ${escapeHtml(player.overallRank)}</span>${tierBadgeMarkup(player)}</p></div><span class="player-card-arrow" aria-hidden="true">→</span></div><div class="player-card-meta player-card-overalls">${overallStats.map(([key, label]) => `<span><strong>${label}</strong> ${player[key]}</span>`).join("")}</div><p class="player-card-description">${escapeHtml(player.tierDescription || player.description)}</p></a>`;
}

function statBar(player, key) {
  const label = STAT_LABELS_EXTENDED[key];
  const value = Number(player[key]);
  const tier = getStatTier(value, key);
  const display = key === "speed" ? `${speedTierNumber(tier)} (${value})` : value;
  return `<div class="explorer-stat"><div class="explorer-stat-label"><span>${label}</span><strong>${display}</strong><small>${tier}</small></div><div class="explorer-stat-track"><span style="width:${value}%"></span></div></div>`;
}

function detailMarkup(player) {
  const tierDescriptionMarkup = player.tierDescription ? `<p class="player-tier-description">${escapeHtml(player.tierDescription)}</p>` : "";
  return `${navMarkup()}<a class="explorer-back" href="./players.html">← All players</a><section class="player-detail"><div class="player-detail-header">${playerImageMarkup(player, { loading: "eager", decorative: false })}<div><p class="eyebrow">${escapeHtml(player.type)}</p><h2>${escapeHtml(player.name)}</h2><p class="player-ranking"><span>Overall rank ${escapeHtml(player.overallRank)}</span>${tierBadgeMarkup(player)}</p></div></div>${tierDescriptionMarkup}<p class="player-detail-description">${escapeHtml(player.description)}</p><dl class="player-detail-meta">${metadata(player)}</dl><div class="explorer-stat-groups">${STAT_GROUPS.map(({ label, overall, stats }) => `<section class="explorer-stat-group"><h3>${label}<strong>${escapeHtml(player[overall])}</strong></h3>${label === "Pitching" ? `${stats.slice(0, 4).map((key) => statBar(player, key)).join("")}<div class="pitch-divider">Special pitches</div><div class="pitch-special-grid">${stats.slice(4).map((key) => statBar(player, key)).join("")}</div>` : stats.map((key) => statBar(player, key)).join("")}</section>`).join("")}</div></section>`;
}

function listMarkup() {
  return `${navMarkup()}<section class="explorer-controls" aria-label="Player search and sorting"><label class="explorer-search"><span>Search players</span><input id="player-search" type="search" placeholder="Search players..." autocomplete="off" /></label><div class="explorer-sort"><label for="player-sort">Sort by</label><select id="player-sort">${SORT_OPTIONS.map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select><button id="sort-direction" class="sort-direction" type="button" aria-label="Sort ascending" title="Sort ascending">&#8593;</button></div></section><div class="explorer-status" id="explorer-status"></div><section class="player-list" id="player-list" aria-label="Players"></section>`;
}

function renderList() {
  const search = app.querySelector("#player-search").value.trim().toLowerCase();
  const sortKey = app.querySelector("#player-sort").value;
  const descending = app.dataset.descending === "true";
  const filtered = PLAYERS.filter((player) => `${player.name} ${player.nickname}`.toLowerCase().includes(search));
  filtered.sort((first, second) => {
    const firstValue = sortKey === "name" ? first.name : first[sortKey];
    const secondValue = sortKey === "name" ? second.name : second[sortKey];
    const comparison = typeof firstValue === "string" ? firstValue.localeCompare(secondValue) : firstValue - secondValue;
    return (descending ? -1 : 1) * comparison || first.name.localeCompare(second.name);
  });
  app.querySelector("#explorer-status").textContent = `${filtered.length} player${filtered.length === 1 ? "" : "s"}`;
  app.querySelector("#player-list").innerHTML = filtered.length ? filtered.map(playerCard).join("") : `<p class="explorer-empty">No players found.</p>`;
}

function render() {
  const player = playerFromUrl();
  app.innerHTML = player ? detailMarkup(player) : player === false ? `${navMarkup()}<section class="explorer-empty-page"><h2>Player not found</h2><p>That player ID does not match anyone in the player pool.</p><a class="secondary-button" href="./players.html">Return to players</a></section>` : listMarkup();
  if (player !== null) return;
  app.dataset.descending = "false";
  renderList();
  app.querySelector("#player-search").addEventListener("input", renderList);
  app.querySelector("#player-sort").addEventListener("change", renderList);
  app.querySelector("#sort-direction").addEventListener("click", (event) => {
    app.dataset.descending = app.dataset.descending !== "true" ? "true" : "false";
    const descending = app.dataset.descending === "true";
    event.currentTarget.innerHTML = descending ? "&#8595;" : "&#8593;";
    event.currentTarget.setAttribute("aria-label", descending ? "Sort descending" : "Sort ascending");
    event.currentTarget.title = descending ? "Sort descending" : "Sort ascending";
    renderList();
  });
}

render();
