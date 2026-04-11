#!/usr/bin/env node
import { parseArgs } from "node:util";
import { validateOutputFormat, writeThemeOutput } from "../core/output.js";

const pwd = process.cwd();

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

try {
	validateOutputFormat(outputFormat);
} catch (error) {
	console.error(
		error instanceof Error ? error.message : "Invalid output format.",
	);
	process.exit(1);
}

try {
	await writeThemeOutput(
		{
			input: inputFile,
			output: outputFile,
			format: outputFormat,
		},
		{ baseDir: pwd },
	);

	console.log(`Successfully generated ${outputFile}`);
} catch (error) {
	console.error("Error generating theme:", error.message);
	process.exit(1);
}
