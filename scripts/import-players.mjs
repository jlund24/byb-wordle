import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourceUrl = new URL("../src/data/players_01.json", import.meta.url);
const destinationUrl = new URL("../src/data/players.js", import.meta.url);

const FIELD_MAP = {
  battingPower: "Bat Power",
  battingContact: "Bat Contact",
  stamina: "Stamina",
  speed: "Speed",
  coordination: "Coordination",
  arm: "Arm Strength",
  throwing: "Arm Accuracy",
  vision: "Eye",
  height: "Height"
};

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
  const sourceId = row.ID;
  if (!name || sourceId === undefined || sourceId === null) throw new Error("Every included row requires Player Name and ID.");
  const player = { id: `${slugify(name)}-${slugify(String(sourceId))}`, name };
  for (const [field, sourceField] of Object.entries(FIELD_MAP)) {
    player[field] = numericValue(row[sourceField], sourceField, name);
  }
  return player;
}

function moduleSource(players) {
  const metadata = [
    "/**",
    " * Generated from players_01.json by scripts/import-players.mjs.",
    " * Run npm run import:players after changing the JSON or FIELD_MAP.",
    " */",
    "",
    "/** @typedef {Object} Player",
    " * @property {string} id",
    " * @property {string} name",
    " * @property {number} battingPower",
    " * @property {number} battingContact",
    " * @property {number} stamina",
    " * @property {number} speed",
    " * @property {number} coordination",
    " * @property {number} arm",
    " * @property {number} throwing",
    " * @property {number} vision",
    " * @property {number=} height",
    " */",
    "",
    "export const CORE_STATS = [",
    "  \"battingPower\", \"battingContact\", \"stamina\", \"speed\",",
    "  \"coordination\", \"arm\", \"throwing\", \"vision\"",
    "];",
    "",
    "export const STAT_LABELS = {",
    "  battingPower: \"Power\", battingContact: \"Contact\", stamina: \"Stamina\", speed: \"Speed\",",
    "  coordination: \"Coordination\", arm: \"Arm Strength\", throwing: \"Arm Accuracy\", vision: \"Vision\"",
    "};",
    "",
    "export const STAT_EMOJIS = {",
    "  battingPower: \"\\u{1F4A3}\", battingContact: \"\\u{1F3AF}\", stamina: \"\\u{1F50B}\", speed: \"\\u{1F45F}\",",
    "  coordination: \"\\u{1F9E4}\", arm: \"\\u{1F4AA}\", throwing: \"\\u{1F3F9}\", vision: \"\\u{1F440}\"",
    "};"
  ].join("\n");
  return `${metadata}\n\n/** @type {Player[]} */\nexport const PLAYERS = ${JSON.stringify(players, null, 2)};\n`;
}

const records = JSON.parse(await readFile(sourceUrl, "utf8"));
if (!Array.isArray(records)) throw new Error("Player JSON must contain an array of records.");
const sampleRecord = records[0] || {};
for (const field of ["Player Name", "ID", ...Object.values(FIELD_MAP)]) {
  if (!(field in sampleRecord)) throw new Error(`Missing mapped JSON field: ${field}`);
}

const players = records.map(createPlayer);
const ids = new Set(players.map((player) => player.id));
if (ids.size !== players.length) throw new Error("Generated player IDs are not unique.");

await writeFile(destinationUrl, moduleSource(players));
console.log(`Generated ${players.length} players in ${fileURLToPath(destinationUrl)}.`);