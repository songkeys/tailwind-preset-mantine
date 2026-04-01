#!/usr/bin/env node
import "tsx";
import { writeFile } from "node:fs/promises";
import * as nodeModule from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { generateTheme } from "./generate.js";

const pwd = process.cwd();
const STYLE_EXTENSIONS = [
	".css",
	".scss",
	".sass",
	".less",
	".styl",
	".stylus",
];
const ASSET_EXTENSIONS = [
	".svg",
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".avif",
	".ico",
	".bmp",
	".tiff",
	".woff",
	".woff2",
	".ttf",
	".otf",
	".eot",
];

function normalizeSpecifier(specifier) {
	return specifier.split("?")[0]?.split("#")[0] ?? specifier;
}

function matchesExtension(specifier, extensions) {
	const normalizedSpecifier = normalizeSpecifier(specifier);
	return extensions.some((extension) =>
		normalizedSpecifier.endsWith(extension),
	);
}

function ignoreNonCodeImports() {
	// Theme files often pull in styling and asset files, but generation only needs theme tokens.
	const require = nodeModule.createRequire(import.meta.url);
	const extensions = require.extensions;

	for (const extension of STYLE_EXTENSIONS) {
		if (!extensions[extension]) {
			extensions[extension] = (module) => {
				module.exports = {};
			};
		}
	}

	for (const extension of ASSET_EXTENSIONS) {
		if (!extensions[extension]) {
			extensions[extension] = (module) => {
				module.exports = "__tailwind_preset_mantine_asset__";
			};
		}
	}

	if (typeof nodeModule.registerHooks === "function") {
		nodeModule.registerHooks({
			load(url, context, nextLoad) {
				if (matchesExtension(url, STYLE_EXTENSIONS)) {
					return {
						format: "module",
						shortCircuit: true,
						source: "export default {};",
					};
				}

				if (matchesExtension(url, ASSET_EXTENSIONS)) {
					return {
						format: "module",
						shortCircuit: true,
						source: 'export default "__tailwind_preset_mantine_asset__";',
					};
				}

				return nextLoad(url, context);
			},
		});
	}
}

// Define CLI options
const options = {
	output: {
		type: "string",
		short: "o",
		default: "theme.css",
		description: "Output file name",
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

try {
	// Read the input theme file
	const themePath = resolve(pwd, inputFile);

	// Convert file path to URL for ESM import compatibility
	const themeURL = pathToFileURL(themePath);

	ignoreNonCodeImports();

	// Execute the theme file content to get the theme object
	const themeModule = await import(themeURL);
	const theme =
		themeModule.default?.default ??
		themeModule.default ??
		themeModule.default?.theme ??
		themeModule.default?.default?.theme;

	if (!theme) {
		console.error(
			"No theme found in the input file; please ensure the file exports a valid theme object",
		);
		process.exit(1);
	}

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
