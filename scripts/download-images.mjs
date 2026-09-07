import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const sourceUrl = new URL("../src/data/images.txt", import.meta.url);
const assetDirectory = new URL("../src/assets/player-images/", import.meta.url);
const generatorPath = fileURLToPath(new URL("./generate-images.mjs", import.meta.url));

function normalize(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function imageName(url) {
  return basename(new URL(url).pathname, ".png");
}

const urls = [...new Set((await readFile(sourceUrl, "utf8")).split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
await mkdir(assetDirectory, { recursive: true });
const failures = [];
let downloaded = 0;
let skipped = 0;

for (const url of urls) {
  const filename = imageName(url);
  const outputUrl = new URL(`${normalize(filename)}.png`, assetDirectory);
  const tempUrl = new URL(`${normalize(filename)}.source.png`, assetDirectory);
  try {
    try {
      await readFile(outputUrl);
      skipped += 1;
      continue;
    } catch {
      // Download missing local assets.
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await writeFile(tempUrl, Buffer.from(await response.arrayBuffer()));
    await execFile("sips", ["-Z", "96", fileURLToPath(tempUrl), "--out", fileURLToPath(outputUrl)]);
    await rm(tempUrl, { force: true });
    downloaded += 1;
  } catch (error) {
    await rm(tempUrl, { force: true });
    failures.push(`${filename}.png: ${error.message}`);
  }
}

await execFile(process.execPath, [generatorPath]);
console.log(`Downloaded ${downloaded} optimized images; skipped ${skipped} existing images.`);
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
}