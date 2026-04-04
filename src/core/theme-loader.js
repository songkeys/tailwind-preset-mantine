import "tsx";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function unwrapThemeExport(themeModule) {
	return (
		themeModule.default?.default ??
		themeModule.default ??
		themeModule.default?.theme ??
		themeModule.default?.default?.theme
	);
}

/**
 * @param {string} themePath
 * @param {string} baseDir
 */
export async function loadThemeFromFile(themePath, baseDir = process.cwd()) {
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
