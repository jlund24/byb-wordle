import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const dataUrl = new URL("../src/data/players_01.json", import.meta.url);
const sourceUrl = new URL("../src/data/images.txt", import.meta.url);
const overridesUrl = new URL("../src/data/image-overrides.json", import.meta.url);
const destinationUrl = new URL("../src/data/images.json", import.meta.url);
const moduleDestinationUrl = new URL("../src/data/images.js", import.meta.url);

function normalize(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function imageName(url) {
  return basename(new URL(url).pathname, ".png");
}

function unique(values) {
  return [...new Set(values)];
}

function imageEntry(url, filename) {
  const localFilename = `${normalize(filename)}.png`;
  const entry = { url, filename: `${filename}.png` };
  const localAsset = findLocalAsset(normalize(filename));
  if (localAsset) {
    entry.localPath = localAsset;
  }
  return entry;
}

function findLocalAsset(assetKey) {
  for (const extension of ["png", "jpg", "jpeg"]) {
    const localPath = `./src/assets/player-images/${assetKey}.${extension}`;
    if (existsSync(fileURLToPath(new URL(`../${localPath.slice(2)}`, import.meta.url)))) return localPath;
  }
  return null;
}

function localOverrideEntry(assetName) {
  const assetKey = normalize(assetName.replace(/\.(png|jpe?g)$/i, ""));
  const localPath = findLocalAsset(assetKey);
  return localPath ? { filename: assetName, localPath } : null;
}

const [records, rawUrls, overrides] = await Promise.all([
  readFile(dataUrl, "utf8").then(JSON.parse),
  readFile(sourceUrl, "utf8").then((text) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)),
  readFile(overridesUrl, "utf8").then(JSON.parse)
]);

const urls = unique(rawUrls);
const players = records.map((record) => ({
  id: `${normalize(record["Player Name"])}-${normalize(String(record.ID))}`,
  name: record["Player Name"].trim(),
  appearance: Number(record.Appearance)
}));
const manifest = { version: 1, appearances: {}, names: {}, playerOverrides: {}, composites: {} };
const errors = [];

for (const url of urls) {
  const filename = imageName(url);
  const genericMatch = filename.match(/^generic-(\d+)$/i);
  const compositeMatch = filename.match(/^([NB])-(.+)$/i);

  if (genericMatch) {
    manifest.appearances[genericMatch[1]] = imageEntry(url, filename);
    continue;
  }

  if (compositeMatch) {
    manifest.composites[normalize(filename)] = imageEntry(url, filename);
    continue;
  }

  const key = normalize(filename);
  const exactMatches = players.filter((player) => normalize(player.name) === key);
  const prefixMatches = players.filter((player) => normalize(player.name).startsWith(`${key}-`));
  const matches = exactMatches.length ? exactMatches : prefixMatches;

  if (!matches.length) {
    errors.push(`No player match for ${filename}.png`);
    continue;
  }

  for (const player of matches) {
    manifest.names[normalize(player.name)] = imageEntry(url, filename);
  }
}

for (const player of players) {
  if (player.appearance === 0 && manifest.names[normalize(player.name)]) {
    manifest.playerOverrides[player.id] = manifest.names[normalize(player.name)];
  }
}

for (const [playerName, compositeName] of Object.entries(overrides.players ?? {})) {
  const player = players.find((candidate) => candidate.name === playerName);
  if (!player) {
    errors.push(`Image override names an unknown player: ${playerName}`);
    continue;
  }
  const compositeKey = normalize(compositeName.replace(/\.(png|jpe?g)$/i, ""));
  const composite = manifest.composites[compositeKey] ?? localOverrideEntry(compositeName);
  if (!composite) {
    errors.push(`Image override for ${playerName} references unknown composite: ${compositeName}`);
    continue;
  }
  manifest.playerOverrides[player.id] = composite;
}

const missingAppearances = Array.from({ length: 12 }, (_, index) => String(index + 1))
  .filter((appearance) => !manifest.appearances[appearance]);
if (missingAppearances.length) errors.push(`Missing generic appearances: ${missingAppearances.join(", ")}`);

const output = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(destinationUrl, output);
await writeFile(moduleDestinationUrl, `/** Generated from images.txt by scripts/generate-images.mjs. */\nexport const IMAGE_MANIFEST = ${output};`);
console.log(`Generated ${Object.keys(manifest.names).length} named mappings, ${Object.keys(manifest.appearances).length} appearance mappings, and ${Object.keys(manifest.composites).length} composite mappings.`);
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
}