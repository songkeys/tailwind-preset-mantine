import { execFile as execFileCallback } from "node:child_process";
import * as nodeModule from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const THIS_FILE = fileURLToPath(import.meta.url);
const CHILD_RESULT_MARKER = "__TWPM_THEME_RESULT__";
const require = nodeModule.createRequire(import.meta.url);
const TSX_LOADER_PATH = require.resolve("tsx");
const TSX_LOADER_URL = pathToFileURL(TSX_LOADER_PATH).href;
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
const ASSET_STUB = "__tailwind_preset_mantine_asset__";

let themeImportHooksInstalled = false;

function unwrapThemeExport(themeModule) {
	return (
		themeModule.default?.default ??
		themeModule.default ??
		themeModule.default?.theme ??
		themeModule.default?.default?.theme
	);
}

function normalizeSpecifier(specifier) {
	return specifier.split("?")[0]?.split("#")[0] ?? specifier;
}

function matchesExtension(specifier, extensions) {
	const normalizedSpecifier = normalizeSpecifier(specifier);
	return extensions.some((extension) =>
		normalizedSpecifier.endsWith(extension),
	);
}

function installThemeImportHooks() {
	if (themeImportHooksInstalled) {
		return;
	}

	if (typeof nodeModule.registerHooks !== "function") {
		throw new Error(
			"Build-time Mantine theme loading requires Node.js 22.15.0 or newer because it depends on node:module.registerHooks().",
		);
	}

	themeImportHooksInstalled = true;

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
				module.exports = ASSET_STUB;
			};
		}
	}

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
					source: `export default ${JSON.stringify(ASSET_STUB)};`,
				};
			}

			return nextLoad(url, context);
		},
	});
}

/**
 * @param {string} themePath
 * @param {string} baseDir
 */
async function loadThemeFromFileInProcess(themePath, baseDir = process.cwd()) {
	installThemeImportHooks();

	const absolutePath = resolve(baseDir, themePath);
	const themeModule = await import(pathToFileURL(absolutePath).href);
	const theme = unwrapThemeExport(themeModule);

	if (!theme) {
		throw new Error(
			"No theme found in the input file; please ensure the file exports a valid theme object",
		);
	}

	return { absolutePath, theme };
}

/**
 * @param {string} themePath
 * @param {string} baseDir
 */
export function getThemeLoaderChildArgs(
	themePath,
	baseDir = process.cwd(),
) {
	return ["--import", TSX_LOADER_URL, THIS_FILE, "--child", themePath, baseDir];
}

/**
 * @param {string} themePath
 * @param {string} baseDir
 */
export async function loadThemeFromFile(themePath, baseDir = process.cwd()) {
	const { stdout } = await execFile(
		process.execPath,
		getThemeLoaderChildArgs(themePath, baseDir),
		{
			cwd: resolve(baseDir),
			maxBuffer: 5 * 1024 * 1024,
		},
	);
	const markerIndex = stdout.lastIndexOf(CHILD_RESULT_MARKER);

	if (markerIndex === -1) {
		throw new Error("Theme loader child process did not return a result.");
	}

	return JSON.parse(stdout.slice(markerIndex + CHILD_RESULT_MARKER.length));
}

if (process.argv[1] === THIS_FILE && process.argv[2] === "--child") {
	const themePath = process.argv[3];
	const baseDir = process.argv[4] ?? process.cwd();

	try {
		const result = await loadThemeFromFileInProcess(themePath, baseDir);
		process.stdout.write(`${CHILD_RESULT_MARKER}${JSON.stringify(result)}`);
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
}
