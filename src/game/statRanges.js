import { speedTierRange } from "./statlineState.js";

const STAT_RANGES = [
	{ min: 0, max: 25 },
	{ min: 26, max: 50 },
	{ min: 51, max: 75 },
	{ min: 76, max: 100 }
];

const TYPE_VALUES = ["Backyard", "Generic", "Pro/Clone"];

export function getStatRange(value) {
	const range = STAT_RANGES.find(({ min, max }) => value >= min && value <= max);
	return { ...range, label: `${range.min}-${range.max}` };
}

export function valueFallsInRange(value, range) {
	return value >= range.min && value <= range.max;
}

export function possibleRangesForGuesses(guesses) {
	const ranges = {};

	for (const guess of guesses) {
		for (const [stat, comparison] of Object.entries(guess.comparisons || {})) {
			if (stat === "type" || typeof guess.playerStats[stat] !== "number") continue;
			const current = ranges[stat] || { min: 0, max: 100 };
			if (stat === "speed") {
				const values = speedTierRange(guess.playerStats[stat]).range.split("-").map(Number);
				const min = values[0];
				const max = values[1] ?? min;
				if (comparison === "higher") current.min = Math.max(current.min, max + 1);
				if (comparison === "lower") current.max = Math.min(current.max, min - 1);
				if (comparison === "equal") { current.min = Math.max(current.min, min); current.max = Math.min(current.max, max); }
			} else {
				if (comparison === "higher") current.min = Math.max(current.min, guess.playerStats[stat] + 1);
				if (comparison === "lower") current.max = Math.min(current.max, guess.playerStats[stat] - 1);
				if (comparison === "equal") current.min = current.max = guess.playerStats[stat];
			}
			ranges[stat] = { ...current, label: `${current.min}-${current.max}` };
		}
	}

	return ranges;
}

export function possibleTypesForGuesses(guesses) {
	let possibleTypes = [...TYPE_VALUES];

	for (const guess of guesses) {
		const comparison = guess.comparisons?.type;
		if (comparison === "equal") possibleTypes = [guess.playerStats.type];
		if (comparison === "wrong") possibleTypes = possibleTypes.filter((type) => type !== guess.playerStats.type);
	}

	return possibleTypes;
}