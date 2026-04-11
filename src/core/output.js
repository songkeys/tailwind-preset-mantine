import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateStandaloneTheme, generateTheme } from "./generate.js";
import { collectThemeDependencies } from "./theme-dependencies.js";
import { loadThemeFromFile } from "./theme-loader.js";

const OUTPUT_FORMAT_GENERATORS = {
	theme: generateTheme,
	standalone: generateStandaloneTheme,
};

function validateOptions(options) {
	if (!options?.input) {
		throw new Error("Missing required `input` option.");
	}

	if (!options?.output) {
		throw new Error("Missing required `output` option.");
	}
}

export function validateOutputFormat(format = "theme") {
	if (!(format in OUTPUT_FORMAT_GENERATORS)) {
		throw new Error(
			`Invalid output format: ${format}. Expected one of: ${Object.keys(OUTPUT_FORMAT_GENERATORS).join(", ")}`,
		);
	}
}

/**
 * @param {{ input: string, output: string, format?: "theme" | "standalone" }} options
 * @param {string} [baseDir]
 */
export function resolveThemeOutputOptions(options, baseDir = process.cwd()) {
	validateOptions(options);

	const format = options.format ?? "theme";
	validateOutputFormat(format);

	return {
		inputPath: resolve(baseDir, options.input),
		outputPath: resolve(baseDir, options.output),
		format,
	};
}

/**
 * @param {string} specifier
 * @param {string} importer
 */
async function resolveThemeImport(specifier, importer) {
	if (!(specifier.startsWith(".") || specifier.startsWith("file:"))) {
		if (specifier.startsWith("/")) {
			return specifier;
		}

		return null;
	}

	try {
		return fileURLToPath(new URL(specifier, pathToFileURL(importer)));
	} catch {
		return null;
	}
}

/**
 * @param {{ input: string, output: string, format?: "theme" | "standalone" }} options
 * @param {{ baseDir?: string, resolveImport?: (specifier: string, importer: string) => Promise<string | null> }} [runtimeOptions]
 */
export async function buildThemeOutput(options, runtimeOptions = {}) {
	const { baseDir = process.cwd(), resolveImport = resolveThemeImport } =
		runtimeOptions;
	const { inputPath, outputPath, format } = resolveThemeOutputOptions(
		options,
		baseDir,
	);
	const { absolutePath, theme } = await loadThemeFromFile(inputPath);
	const css = OUTPUT_FORMAT_GENERATORS[format](theme);
	const dependencies = await collectThemeDependencies(
		absolutePath,
		resolveImport,
	);

	return {
		css,
		dependencies,
		format,
		inputPath: absolutePath,
		outputPath,
	};
}

/**
 * @param {{ input: string, output: string, format?: "theme" | "standalone" }} options
 * @param {{ baseDir?: string, resolveImport?: (specifier: string, importer: string) => Promise<string | null> }} [runtimeOptions]
 */
export async function writeThemeOutput(options, runtimeOptions = {}) {
	const result = await buildThemeOutput(options, runtimeOptions);
	await mkdir(dirname(result.outputPath), { recursive: true });

	let changed = true;

	try {
		const existing = await readFile(result.outputPath, "utf8");

		if (existing === result.css) {
			changed = false;
		}
	} catch {
		// File does not exist yet.
	}

	if (changed) {
		await writeFile(result.outputPath, result.css);
	}

	return {
		...result,
		changed,
	};
}
