import { access, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { init, parse } from "es-module-lexer";

const THEME_SOURCE_EXTENSIONS = new Set([
	".js",
	".jsx",
	".mjs",
	".cjs",
	".ts",
	".tsx",
	".mts",
	".cts",
]);
const COMMONJS_REQUIRE_PATTERN =
	/\brequire\s*\(\s*(['"`])([^'"`\n\r]+)\1\s*\)/g;

function normalizeResolvedPath(resolved) {
	return resolved.split("?", 1)[0]?.split("#", 1)[0] ?? resolved;
}

async function fileExists(file) {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

async function resolveThemeSourceDependency(
	specifier,
	importer,
	resolveImport,
) {
	const resolved = await resolveImport(specifier, importer);

	if (resolved == null || resolved.startsWith("\0")) {
		return null;
	}

	const normalized = normalizeResolvedPath(resolved);
	const extension = extname(normalized);

	if (THEME_SOURCE_EXTENSIONS.has(extension)) {
		return normalized;
	}

	if (extension) {
		return null;
	}

	for (const candidateExtension of THEME_SOURCE_EXTENSIONS) {
		const candidate = `${normalized}${candidateExtension}`;

		if (await fileExists(candidate)) {
			return candidate;
		}
	}

	for (const candidateExtension of THEME_SOURCE_EXTENSIONS) {
		const candidate = join(normalized, `index${candidateExtension}`);

		if (await fileExists(candidate)) {
			return candidate;
		}
	}

	return null;
}

function collectRequireSpecifiers(source) {
	const specifiers = [];

	for (const match of source.matchAll(COMMONJS_REQUIRE_PATTERN)) {
		specifiers.push(match[2]);
	}

	return specifiers;
}

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
		const specifiers = new Set();

		for (const record of imports) {
			if (record.n == null) {
				continue;
			}

			specifiers.add(record.n);
		}

		for (const specifier of collectRequireSpecifiers(source)) {
			specifiers.add(specifier);
		}

		for (const specifier of specifiers) {
			const dependency = await resolveThemeSourceDependency(
				specifier,
				file,
				resolveImport,
			);

			if (dependency == null) {
				continue;
			}

			dependencies.add(dependency);
			await visit(dependency);
		}
	}

	await visit(entryFile);

	return [...dependencies];
}
