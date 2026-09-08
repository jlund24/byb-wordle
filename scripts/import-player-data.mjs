import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const jsonUrl = new URL("../src/data/players_01.json", import.meta.url);
const csvUrl = new URL("../src/data/player_data.csv", import.meta.url);
const IMPORT_FIELDS = ["BBOL.r", "Offense", "Speed", "Defense", "Pitching", "Pitching (Cal)", "Best Position", "Description of the Player"];
const NUMERIC_FIELDS = new Set(IMPORT_FIELDS.slice(0, 6));
const JSON_FIELD_NAMES = { Speed: "Speed Tier" };
const NAME_ALIASES = {
  "Amir Khan (w/ Achmed Khan)": "Amir (w/ Achmed)",
  "Marky Dubois (w/ Billy Jean & vs Sox)": "Marky (w/ BJ & vs Sox)",
  "Marky Dubois (w/ Billy Jean & on Sox)": "Marky (w/ BJ & on Sox)"
};

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

const [records, csvSource] = await Promise.all([
  readFile(jsonUrl, "utf8").then(JSON.parse),
  readFile(csvUrl, "utf8")
]);
const rows = parseCsv(csvSource);
const headers = rows.shift();
const indexes = Object.fromEntries(IMPORT_FIELDS.map((field) => [field, headers.indexOf(field)]));
const missingHeaders = IMPORT_FIELDS.filter((field) => indexes[field] === -1);
if (missingHeaders.length) throw new Error(`Missing CSV columns: ${missingHeaders.join(", ")}`);

const csvPlayers = new Map();
const csvPlayersById = new Map();
for (const row of rows) {
  const name = row[headers.indexOf("Player Name")]?.trim();
  if (!name) continue;
  if (csvPlayers.has(name)) throw new Error(`Duplicate CSV Player Name: ${name}`);
  const data = Object.fromEntries(IMPORT_FIELDS.map((field) => {
    const value = row[indexes[field]]?.trim() ?? "";
    const outputField = JSON_FIELD_NAMES[field] ?? field;
    if (!NUMERIC_FIELDS.has(field)) return [outputField, value];
    const number = Number(value);
    return [outputField, Number.isFinite(number) ? number : value];
  }));
  csvPlayers.set(name, data);
  csvPlayersById.set(String(row[headers.indexOf("ID#")]?.trim()), data);
}

const fallbackMatches = new Map();
const matches = records.map((record) => {
  const byId = csvPlayersById.get(String(record.ID));
  const exact = csvPlayers.get(record["Player Name"]) || csvPlayers.get(NAME_ALIASES[record["Player Name"]]);
  if (byId && byId !== exact) {
    fallbackMatches.set(record["Player Name"], record.ID);
    return byId;
  }
  if (exact) return exact;
  if (byId) fallbackMatches.set(record["Player Name"], record.ID);
  return byId;
});
const unmatched = records.filter((record, index) => !matches[index]);
const unused = [...csvPlayers.entries()].filter(([, data]) => !matches.includes(data)).map(([name]) => name);
if (unmatched.length || unused.length) {
  console.error(`Unmatched JSON names (${unmatched.length}): ${unmatched.map((record) => record["Player Name"]).join(" | ")}`);
  console.error(`Unused CSV names (${unused.length}): ${unused.join(" | ")}`);
  process.exitCode = 1;
} else {
  for (const [index, record] of records.entries()) {
    delete record["Speed Defense"];
    Object.assign(record, matches[index]);
  }
  await writeFile(jsonUrl, `${JSON.stringify(records, null, 2)}\n`);
  console.log(`Imported ${records.length} CSV records into ${fileURLToPath(jsonUrl)} (${fallbackMatches.size} matched by ID fallback).`);
}
