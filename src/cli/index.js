#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { generateStandaloneTheme, generateTheme } from "../core/generate.js";
import { loadThemeFromFile } from "../core/theme-loader.js";

const pwd = process.cwd();
const OUTPUT_FORMATS = {
	theme: generateTheme,
	standalone: generateStandaloneTheme,
};

// Define CLI options
const options = {
	output: {
		type: "string",
		short: "o",
		default: "theme.css",
		description: "Output file name",
	},
	format: {
		type: "string",
		default: "theme",
		description: "Output format: theme or standalone",
	},
};

// Parse command line arguments
const { values, positionals } = parseArgs({ options, allowPositionals: true });

if (positionals.length === 0) {
	console.error("Please provide a theme file path");
	process.exit(1);
}

const inputFile = positionals[0];
const outputFile = values.output;
const outputFormat = values.format;

if (!(outputFormat in OUTPUT_FORMATS)) {
	console.error(
		`Invalid output format: ${outputFormat}. Expected one of: ${Object.keys(OUTPUT_FORMATS).join(", ")}`,
	);
	process.exit(1);
}

try {
	const { theme } = await loadThemeFromFile(inputFile, pwd);

	// Generate CSS from theme object
	const css = OUTPUT_FORMATS[outputFormat](theme);

	// Write to output file
	const outputPath = resolve(pwd, outputFile);
	await writeFile(outputPath, css);

	console.log(`Successfully generated ${outputFile}`);
} catch (error) {
	console.error("Error generating theme:", error.message);
	process.exit(1);
}
