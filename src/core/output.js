import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPathsMatcher, getTsconfig } from "get-tsconfig";
import { generateManagedStylesheet } from "./generate.js";
import { collectThemeDependencies } from "./theme-dependencies.js";
import { loadThemeFromFile } from "./theme-loader.js";

const OUTPUT_FORMATS = ["theme", "standalone"];
const PACKAGE_JSON_FILENAMES = ["package.json"];
const THEME_SOURCE_EXTENSIONS = [
	".js",
	".jsx",
	".mjs",
	".cjs",
	".json",
	".ts",
	".tsx",
	".mts",
	".cts",
];
const JSON_FILE_CACHE = new Map();
const TSCONFIG_DISCOVERY_CACHE = new Map();
const TSCONFIG_FS_CACHE = new Map();
const TSCONFIG_PATHS_MATCHER_CACHE = new Map();

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

	return resolveTsconfigImport(specifier, dirname(importer));
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

function getMappedImportCandidates(
	specifier,
	mappings,
	baseDirectory,
	localOnly,
) {
	if (!mappings || typeof mappings !== "object") {
		return [];
	}

	for (const [pattern, target] of Object.entries(mappings)) {
		const match = matchSpecifierPattern(specifier, pattern);

		if (match == null) {
			continue;
		}

		const resolvedCandidates = [];

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

			resolvedCandidates.push(
				resolvedTarget.startsWith("file:")
					? fileURLToPath(resolvedTarget)
					: resolve(baseDirectory, resolvedTarget),
			);
		}

		return resolvedCandidates;
	}

	return [];
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
	if (JSON_FILE_CACHE.has(path)) {
		return JSON_FILE_CACHE.get(path);
	}

	const json = await readFile(path, "utf8")
		.then((source) => JSON.parse(source))
		.catch(() => null);

	JSON_FILE_CACHE.set(path, json);
	return json;
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
	return resolveFirstExistingThemeSource(
		getMappedImportCandidates(
			specifier,
			packageJson?.imports,
			dirname(packageJsonPath),
			true,
		),
	);
}

function getTsconfigPathsMatcher(tsconfigPath) {
	if (TSCONFIG_PATHS_MATCHER_CACHE.has(tsconfigPath.path)) {
		return TSCONFIG_PATHS_MATCHER_CACHE.get(tsconfigPath.path);
	}

	let matcher = null;

	try {
		matcher = createPathsMatcher(tsconfigPath);
	} catch {
		// Ignore unreadable or invalid configs and continue without alias support.
	}

	TSCONFIG_PATHS_MATCHER_CACHE.set(tsconfigPath.path, matcher);
	return matcher;
}

function getConfigDistance(startDirectory, configPath) {
	let currentDirectory = resolve(startDirectory);
	const configDirectory = dirname(configPath);
	let distance = 0;

	while (true) {
		if (currentDirectory === configDirectory) {
			return distance;
		}

		const parentDirectory = dirname(currentDirectory);

		if (parentDirectory === currentDirectory) {
			return Number.POSITIVE_INFINITY;
		}

		currentDirectory = parentDirectory;
		distance += 1;
	}
}

function getClosestTsconfigResult(startDirectory) {
	if (TSCONFIG_DISCOVERY_CACHE.has(startDirectory)) {
		return TSCONFIG_DISCOVERY_CACHE.get(startDirectory);
	}

	const tsconfigResult = getTsconfig(
		startDirectory,
		"tsconfig.json",
		TSCONFIG_FS_CACHE,
	);
	const jsconfigResult = getTsconfig(
		startDirectory,
		"jsconfig.json",
		TSCONFIG_FS_CACHE,
	);

	let closestResult = tsconfigResult ?? jsconfigResult;

	if (tsconfigResult && jsconfigResult) {
		const tsconfigDistance = getConfigDistance(
			startDirectory,
			tsconfigResult.path,
		);
		const jsconfigDistance = getConfigDistance(
			startDirectory,
			jsconfigResult.path,
		);

		closestResult =
			jsconfigDistance < tsconfigDistance ? jsconfigResult : tsconfigResult;
	}

	TSCONFIG_DISCOVERY_CACHE.set(startDirectory, closestResult);
	return closestResult;
}

function getThemeSourceCandidates(path) {
	const candidates = [path];

	if (extname(path)) {
		return candidates;
	}

	for (const extension of THEME_SOURCE_EXTENSIONS) {
		candidates.push(`${path}${extension}`);
	}

	for (const extension of THEME_SOURCE_EXTENSIONS) {
		candidates.push(join(path, `index${extension}`));
	}

	return candidates;
}

async function resolveFirstExistingThemeSource(candidatePaths) {
	for (const candidatePath of candidatePaths) {
		for (const candidate of getThemeSourceCandidates(candidatePath)) {
			if (await pathExists(candidate)) {
				return candidate;
			}
		}
	}

	return null;
}

/**
 * @param {string} specifier
 * @param {string} startDirectory
 */
async function resolveTsconfigImport(specifier, startDirectory) {
	const tsconfigResult = getClosestTsconfigResult(startDirectory);

	if (!tsconfigResult) {
		return null;
	}

	const pathsMatcher = getTsconfigPathsMatcher(tsconfigResult);
	return pathsMatcher
		? resolveFirstExistingThemeSource(pathsMatcher(specifier))
		: null;
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
