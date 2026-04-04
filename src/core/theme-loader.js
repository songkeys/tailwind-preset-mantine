import "tsx";
import { stat } from "node:fs/promises";
import * as nodeModule from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

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

	themeImportHooksInstalled = true;

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
				module.exports = ASSET_STUB;
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
						source: `export default ${JSON.stringify(ASSET_STUB)};`,
					};
				}

				return nextLoad(url, context);
			},
		});
	}
}

/**
 * @param {string} themePath
 * @param {string} baseDir
 */
export async function loadThemeFromFile(themePath, baseDir = process.cwd()) {
	installThemeImportHooks();

	const absolutePath = resolve(baseDir, themePath);
	const themeURL = pathToFileURL(absolutePath);
	const { mtimeMs } = await stat(absolutePath);
	const themeModule = await import(`${themeURL.href}?t=${mtimeMs}`);
	const theme = unwrapThemeExport(themeModule);

	if (!theme) {
		throw new Error(
			"No theme found in the input file; please ensure the file exports a valid theme object",
		);
	}

	return { absolutePath, theme };
}
