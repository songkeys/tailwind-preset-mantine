#!/usr/bin/env -S npx tsx

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { generateTheme } from "./generate.js";

const pwd = process.cwd();

// Define CLI options
const options = {
	output: {
		type: "string",
		short: "o",
		default: "theme.css",
		description: "Output file name",
	},
	watch: {
		type: "boolean",
		short: "w",
		default: false,
		description: "Watch for changes",
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

if (values.watch) {
	console.log(`Watching ${inputFile} for changes...`);
	// TODO: Implement file watching
}

try {
	// Read the input theme file
	const themePath = resolve(pwd, inputFile);

	// Execute the theme file content to get the theme object
	const themeModule = await import(themePath);
	const theme = themeModule.default;

	// Generate CSS from theme object
	const css = generateTheme(theme);

	// Write to output file
	const outputPath = resolve(pwd, outputFile);
	await writeFile(outputPath, css);

	console.log(`Successfully generated ${outputFile}`);
} catch (error) {
	console.error("Error generating theme:", error.message);
	process.exit(1);
}
