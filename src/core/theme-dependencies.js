import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { init, parse } from "es-module-lexer";

const THEME_SOURCE_EXTENSIONS = new Set([
	".js",
	".mjs",
	".cjs",
	".ts",
	".mts",
	".cts",
]);

/**
 * @param {string} entryFile
 * @param {(specifier: string, importer: string) => Promise<string | null>} resolveImport
 */
export async function collectThemeDependencies(entryFile, resolveImport) {
	await init;

	const dependencies = new Set([entryFile]);
	const visited = new Set();

	async function visit(file) {
		if (visited.has(file)) {
			return;
		}

		visited.add(file);

		const source = await readFile(file, "utf8");
		const [imports] = parse(source);

		for (const record of imports) {
			if (record.d !== -1 || record.n == null) {
				continue;
			}

			const resolved = await resolveImport(record.n, file);

			if (resolved == null || resolved.startsWith("\0")) {
				continue;
			}

			const normalized = resolved.split("?", 1)[0];

			if (!THEME_SOURCE_EXTENSIONS.has(extname(normalized))) {
				continue;
			}

			dependencies.add(normalized);
			await visit(normalized);
		}
	}

	await visit(entryFile);

	return [...dependencies];
}
