const STAT_RANGES = [
	{ min: 0, max: 25 },
	{ min: 26, max: 50 },
	{ min: 51, max: 75 },
	{ min: 76, max: 100 }
];

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
			const current = ranges[stat] || { min: 0, max: 100 };
			if (comparison === "higher") current.min = Math.max(current.min, guess.playerStats[stat] + 1);
			if (comparison === "lower") current.max = Math.min(current.max, guess.playerStats[stat] - 1);
			if (comparison === "equal") current.min = current.max = guess.playerStats[stat];
			ranges[stat] = { ...current, label: `${current.min}-${current.max}` };
		}
	}

	return ranges;
}