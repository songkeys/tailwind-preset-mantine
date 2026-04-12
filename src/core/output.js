import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateManagedStylesheet } from "./generate.js";
import { collectThemeDependencies } from "./theme-dependencies.js";
import { loadThemeFromFile } from "./theme-loader.js";

const OUTPUT_FORMATS = ["theme", "standalone"];
const TSCONFIG_FILENAMES = ["tsconfig.json", "jsconfig.json"];
const PACKAGE_JSON_FILENAMES = ["package.json"];

function validateOptions(options) {
	if (!options?.input) {
		throw new Error("Missing required `input` option.");
	}
}

export function validateOutputFormat(format = "theme") {
	if (!OUTPUT_FORMATS.includes(format)) {
		throw new Error(
			`Invalid output format: ${format}. Expected one of: ${OUTPUT_FORMATS.join(", ")}`,
		);
	}
}

/**
 * @param {string} inputPath
 * @param {string | undefined} output
 * @param {string} baseDir
 */
function resolveOutputPath(inputPath, output, baseDir) {
	if (output) {
		return resolve(baseDir, output);
	}

	const inputDirectory = dirname(inputPath);
	const inputFilename = basename(inputPath, extname(inputPath));

	return join(inputDirectory, `${inputFilename}.css`);
}

/**
 * @param {{ input: string, output?: string, format?: "theme" | "standalone" }} options
 * @param {string} [baseDir]
 */
export function resolveThemeOutputOptions(options, baseDir = process.cwd()) {
	validateOptions(options);

	const format = options.format ?? "theme";
	validateOutputFormat(format);
	const inputPath = resolve(baseDir, options.input);

	return {
		inputPath,
		outputPath: resolveOutputPath(inputPath, options.output, baseDir),
		format,
	};
}

/**
 * @param {string} specifier
 * @param {string} importer
 */
async function resolveThemeImport(specifier, importer) {
	if (specifier.startsWith("/")) {
		return specifier;
	}

	try {
		if (specifier.startsWith("file:")) {
			return fileURLToPath(specifier);
		}

		if (specifier.startsWith(".")) {
			return fileURLToPath(new URL(specifier, pathToFileURL(importer)));
		}
	} catch {
		// Fall through to config-based alias resolution.
	}

	if (specifier.startsWith("#")) {
		const packageJsonPath = await findClosestConfig(
			dirname(importer),
			PACKAGE_JSON_FILENAMES,
		);
		const packageImport = await resolvePackageImport(
			specifier,
			packageJsonPath,
		);

		if (packageImport) {
			return packageImport;
		}
	}

	const tsconfigPath = await findClosestConfig(
		dirname(importer),
		TSCONFIG_FILENAMES,
	);
	return resolveTsconfigImport(specifier, tsconfigPath);
}

function matchSpecifierPattern(specifier, pattern) {
	const wildcardIndex = pattern.indexOf("*");

	if (wildcardIndex === -1) {
		return specifier === pattern ? "" : null;
	}

	const prefix = pattern.slice(0, wildcardIndex);
	const suffix = pattern.slice(wildcardIndex + 1);

	if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
		return null;
	}

	return specifier.slice(prefix.length, specifier.length - suffix.length);
}

function flattenImportTargets(target) {
	if (typeof target === "string") {
		return [target];
	}

	if (Array.isArray(target)) {
		return target.flatMap((item) => flattenImportTargets(item));
	}

	if (!target || typeof target !== "object") {
		return [];
	}

	const orderedConditions = ["default", "import", "node"];
	const orderedTargets = [];

	for (const condition of orderedConditions) {
		if (condition in target) {
			orderedTargets.push(target[condition]);
		}
	}

	for (const [condition, value] of Object.entries(target)) {
		if (!orderedConditions.includes(condition)) {
			orderedTargets.push(value);
		}
	}

	return orderedTargets.flatMap((value) => flattenImportTargets(value));
}

function resolveMappedImport(specifier, mappings, baseDirectory, localOnly) {
	if (!mappings || typeof mappings !== "object") {
		return null;
	}

	for (const [pattern, target] of Object.entries(mappings)) {
		const match = matchSpecifierPattern(specifier, pattern);

		if (match == null) {
			continue;
		}

		for (const candidate of flattenImportTargets(target)) {
			if (typeof candidate !== "string") {
				continue;
			}

			if (localOnly && !candidate.startsWith("./")) {
				continue;
			}

			const resolvedTarget = candidate.includes("*")
				? candidate.replace("*", match)
				: candidate;

			if (
				/^[a-z]+:/i.test(resolvedTarget) &&
				!resolvedTarget.startsWith("file:")
			) {
				continue;
			}

			return resolvedTarget.startsWith("file:")
				? fileURLToPath(resolvedTarget)
				: resolve(baseDirectory, resolvedTarget);
		}
	}

	return null;
}

async function pathExists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} path
 */
async function readJsonFile(path) {
	return readFile(path, "utf8")
		.then((source) => JSON.parse(source))
		.catch(() => null);
}

/**
 * @param {string} startDirectory
 * @param {string[]} filenames
 */
async function findClosestConfig(startDirectory, filenames) {
	let currentDirectory = startDirectory;

	while (true) {
		for (const filename of filenames) {
			const candidate = join(currentDirectory, filename);

			if (await pathExists(candidate)) {
				return candidate;
			}
		}

		const parentDirectory = dirname(currentDirectory);

		if (parentDirectory === currentDirectory) {
			return null;
		}

		currentDirectory = parentDirectory;
	}
}

/**
 * @param {string} specifier
 * @param {string | null} packageJsonPath
 */
async function resolvePackageImport(specifier, packageJsonPath) {
	if (!packageJsonPath) {
		return null;
	}

	const packageJson = await readJsonFile(packageJsonPath);
	return resolveMappedImport(
		specifier,
		packageJson?.imports,
		dirname(packageJsonPath),
		true,
	);
}

/**
 * @param {string} specifier
 * @param {string | null} tsconfigPath
 */
async function resolveTsconfigImport(specifier, tsconfigPath) {
	if (!tsconfigPath) {
		return null;
	}

	const tsconfig = await readJsonFile(tsconfigPath);
	const compilerOptions = tsconfig?.compilerOptions;

	if (!compilerOptions?.paths) {
		return null;
	}

	const baseDirectory = resolve(
		dirname(tsconfigPath),
		compilerOptions.baseUrl ?? ".",
	);

	return resolveMappedImport(
		specifier,
		compilerOptions.paths,
		baseDirectory,
		false,
	);
}

/**
 * @param {{ input: string, output?: string, format?: "theme" | "standalone" }} options
 * @param {{ baseDir?: string, resolveImport?: (specifier: string, importer: string) => Promise<string | null> }} [runtimeOptions]
 */
export async function buildThemeOutput(options, runtimeOptions = {}) {
	const { baseDir = process.cwd(), resolveImport = resolveThemeImport } =
		runtimeOptions;
	const { inputPath, outputPath, format } = resolveThemeOutputOptions(
		options,
		baseDir,
	);
	const dependencies = await collectThemeDependencies(inputPath, resolveImport);
	const { absolutePath, theme } = await loadThemeFromFile(inputPath, baseDir);
	const css = generateManagedStylesheet(theme, format);

	return {
		css,
		dependencies,
		format,
		inputPath: absolutePath,
		outputPath,
	};
}

/**
 * @param {{ input: string, output?: string, format?: "theme" | "standalone" }} options
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
