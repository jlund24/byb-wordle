import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourceUrl = new URL("../src/data/players_01.json", import.meta.url);

function getTypeForId(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return "Generic";
  if (numericId >= 1 && numericId <= 30) return "Backyard";
  if (numericId === 263) return "Backyard";
  if (numericId >= 31 && numericId <= 61) return "Pro/Clone";
  if (numericId >= 232 && numericId <= 262) return "Pro/Clone";
  return "Generic";
}

const records = JSON.parse(await readFile(sourceUrl, "utf8"));
if (!Array.isArray(records)) throw new Error("Player JSON must contain an array of records.");

let updated = 0;
for (const record of records) {
  const nextType = getTypeForId(record.ID);
  if (record.Type !== nextType) {
    record.Type = nextType;
    updated += 1;
  }
}

await writeFile(sourceUrl, `${JSON.stringify(records, null, 2)}\n`);
console.log(`Updated ${updated} records with Type in ${fileURLToPath(sourceUrl)}.`);
