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
  heat: "Heat",
  slowball: "Slowball",
  leftHook: "Left Hook",
  rightHook: "Right Hook",
  corkscrew: "Corkscrew",
  zigZag: "Zig-Zag",
  bigFreeze: "Big Freeze",
  fireball: "Fireball",
  spitball: "Spitball",
  crazyball: "Crazyball",
  sloMo: "Slo-mo",
  elevator: "Elevator",
  attention: "Attention",
  intelligence: "Intelligence",
  aggression: "Aggression",
  height: "Height",
  appearance: "Appearance"
};
const IMPORTED_NUMERIC_FIELDS = {
  overallRank: "BBOL.r",
  offense: "Offense",
  defense: "Defense",
  speedTier: "Speed Tier",
  pitching: "Pitching",
  pitchingCal: "Pitching (Cal)"
};
const IMPORTED_TEXT_FIELDS = {
  bestPosition: "Best Position",
  description: "Description of the Player",
  tier: "Tier",
  tierDescription: "Short Description"
};
const TYPE_DISPLAY_VALUES = { Backyard: "Backyard", Generic: "Generic", "Pro/Clone": "Pro/Clone" };

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function numericValue(value, field, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid ${field} value for ${name}: ${value}`);
  return number;
}

function importedValue(value, field, name) {
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new Error(`Invalid ${field} value for ${name}: ${value}`);
}

function createPlayer(row) {
  const name = row["Player Name"]?.trim();
  const sourceId = row.ID;
  if (!name || sourceId === undefined || sourceId === null) throw new Error("Every included row requires Player Name and ID.");
  const type = typeof row.Type === "string" ? row.Type.trim() : "Generic";
  const player = {
    id: `${slugify(name)}-${slugify(String(sourceId))}`,
    sourceId,
    name,
    type: TYPE_DISPLAY_VALUES[type] ?? "Generic",
    nickname: row.Nickname?.trim() || "",
    bats: row.Bats?.trim() || "",
    throws: row.Throws?.trim() || "",
    gender: row.Gender?.trim() || "",
    birthdayMonth: row["B-Day Month"]?.trim() || "",
    birthdayDay: row["B-Day Day"] || ""
  };
  for (const [field, sourceField] of Object.entries(FIELD_MAP)) {
    player[field] = numericValue(row[sourceField], sourceField, name);
  }
  for (const [field, sourceField] of Object.entries(IMPORTED_NUMERIC_FIELDS)) {
    player[field] = importedValue(row[sourceField], sourceField, name);
  }
  for (const [field, sourceField] of Object.entries(IMPORTED_TEXT_FIELDS)) {
    player[field] = row[sourceField]?.trim() || "";
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
    " * @property {string} type",
    " * @property {number} battingPower",
    " * @property {number} battingContact",
    " * @property {number} stamina",
    " * @property {number} speed",
    " * @property {number} coordination",
    " * @property {number} arm",
    " * @property {number} throwing",
    " * @property {number} vision",
    " * @property {number} heat",
    " * @property {number} slowball",
    " * @property {number} leftHook",
    " * @property {number} rightHook",
    " * @property {number} corkscrew",
    " * @property {number} zigZag",
    " * @property {number} bigFreeze",
    " * @property {number} fireball",
    " * @property {number} spitball",
    " * @property {number} crazyball",
    " * @property {number} sloMo",
    " * @property {number} elevator",
    " * @property {number} attention",
    " * @property {number} intelligence",
    " * @property {number} aggression",
    " * @property {number} overallRank",
    " * @property {number} offense",
    " * @property {number} defense",
    " * @property {number} speedTier",
    " * @property {number} pitching",
    " * @property {number} pitchingCal",
    " * @property {string} bestPosition",
    " * @property {string} description",
    " * @property {string=} tier",
    " * @property {string=} tierDescription",
    " * @property {number=} height",
    " * @property {number=} appearance",
    " */",
    "",
    "export const CORE_STATS = [",
    "  \"type\", \"battingPower\", \"battingContact\", \"stamina\", \"speed\",",
    "  \"arm\", \"throwing\", \"vision\"",
    "];",
    "",
    "export const TYPE_DISPLAY_VALUES = {",
    "  Backyard: \"KID\", Generic: \"GNR\", \"Pro/Clone\": \"PRO\"",
    "};",
    "",
    "export const STATLINE_STATS = [",
    "  { key: \"headshot\", label: \"Headshot\", kind: \"image\" },",
    "  { key: \"battingPower\", label: \"Bat Power\" },",
    "  { key: \"battingContact\", label: \"Bat Contact\" },",
    "  { key: \"stamina\", label: \"Stamina\" },",
    "  { key: \"speed\", label: \"Speed\" },",
    "  { key: \"arm\", label: \"Arm Strength\" },",
    "  { key: \"throwing\", label: \"Arm Accuracy\" },",
    "  { key: \"vision\", label: \"Eye\" }",
    "];",
    "",
    "export const STAT_LABELS = {",
    "  type: \"Type\", battingPower: \"Power\", battingContact: \"Contact\", stamina: \"Stamina\", speed: \"Speed\", coordination: \"Coordination\", headshot: \"Headshot\",",
    "  arm: \"Arm Strength\", throwing: \"Arm Accuracy\", vision: \"Vision\"",
    "};",
    "",
    "export const STAT_EMOJIS = {",
    "  type: \"\\u{1F464}\", battingPower: \"\\u{1F4A3}\", battingContact: \"\\u{1F3AF}\", stamina: \"\\u{1F50B}\", speed: \"\\u{1F45F}\", coordination: \"🧤\",",
    "  arm: \"\\u{1F4AA}\", throwing: \"\\u{1F3F9}\", vision: \"\\u{1F440}\", headshot: \"🖼️\"",
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