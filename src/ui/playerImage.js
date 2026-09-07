import { IMAGE_MANIFEST } from "../data/images.js";

function normalize(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function playerImage(player) {
  if (!player) return null;
  const override = IMAGE_MANIFEST.playerOverrides[player.id];
  const named = IMAGE_MANIFEST.names[normalize(player.name)];
  const appearance = IMAGE_MANIFEST.appearances[String(player.appearance)];
  return override ?? named ?? appearance ?? null;
}

export function playerImageKey(player) {
  return playerImage(player)?.filename ?? null;
}

export function playerImageMarkup(player, { loading = "lazy", decorative = true } = {}) {
  const image = playerImage(player);
  if (!image) return `<span class="player-avatar player-avatar-missing" aria-hidden="true"></span>`;
  const alt = decorative ? "" : `Headshot of ${player.name}`;
  const priority = loading === "eager" ? "high" : "low";
  return `<img class="player-avatar" src="${escapeAttribute(image.localPath ?? image.url)}" data-fallback-src="${escapeAttribute(image.url)}" alt="${escapeAttribute(alt)}" width="40" height="40" loading="${loading}" fetchpriority="${priority}" decoding="async" />`;
}