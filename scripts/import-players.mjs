import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourceUrl = new URL("../src/data/player_data.csv", import.meta.url);
const destinationUrl = new URL("../src/data/players.js", import.meta.url);

/**
 * Add fields here to extend the browser player model from the raw CSV.
 * Values are emitted as numbers; use a custom transform for non-numeric columns.
 */
const FIELD_MAP = {
  battingPower: "Bat Pow",
  battingContact: "Bat Con",
  stamina: "Stamina",
  speed: "Run",
  coordination: "Coord",
  arm: "Arm Str",
  throwing: "Arm Acc",
  vision: "Eye",
  height: "Height"
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = []; value = "";
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function numericValue(value, field, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid ${field} value for ${name}: ${value}`);
  return number;
}

function createPlayer(row) {
  const name = row["Player Name"]?.trim();
  const sourceId = row["ID#"]?.trim();
  if (!name || !sourceId) throw new Error("Every included row requires Player Name and ID#.");
  const player = { id: `${slugify(name)}-${slugify(sourceId)}`, name };
  for (const [field, csvColumn] of Object.entries(FIELD_MAP)) {
    player[field] = numericValue(row[csvColumn], csvColumn, name);
  }
  return player;
}

function moduleSource(players) {
  return `/**\n * Generated from player_data.csv by scripts/import-players.mjs.\n * Run \`npm run import:players\` after changing the CSV or FIELD_MAP.\n */\n\n/** @typedef {Object} Player\n * @property {string} id\n * @property {string} name\n * @property {number} battingPower\n * @property {number} battingContact\n * @property {number} stamina\n * @property {number} speed\n * @property {number} coordination\n * @property {number} arm\n * @property {number} throwing\n * @property {number} vision\n * @property {number=} height\n */\n\nexport const CORE_STATS = [\n  "battingPower", "battingContact", "stamina", "speed",\n  "coordination", "arm", "throwing", "vision"\n];\n\nexport const STAT_LABELS = {\n  battingPower: "Power", battingContact: "Contact", stamina: "Stamina", speed: "Speed",\n  coordination: "Coordination", arm: "Arm", throwing: "Throwing", vision: "Vision"\n};\n\n/** @type {Player[]} */\nexport const PLAYERS = ${JSON.stringify(players, null, 2)};\n`;
}

const records = parseCsv(await readFile(sourceUrl, "utf8"));
const [headers, ...rows] = records;
for (const csvColumn of ["Player Name", "ID#", ...Object.values(FIELD_MAP)]) {
  if (!headers.includes(csvColumn)) throw new Error(`Missing mapped CSV column: ${csvColumn}`);
}
const players = rows
  .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])))
  .filter((row) => row["BBOL.r"] !== "DROP")
  .map(createPlayer);
const ids = new Set(players.map((player) => player.id));
if (ids.size !== players.length) throw new Error("Generated player IDs are not unique.");

await writeFile(destinationUrl, moduleSource(players));
console.log(`Generated ${players.length} players in ${fileURLToPath(destinationUrl)}.`);