import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import tailwindPostCSS from "@tailwindcss/postcss";
import tailwindVite from "@tailwindcss/vite";
import postcss from "postcss";
import { build } from "vite";
import mantineThemePostCSS from "../src/integrations/postcss.js";
import mantineThemeVite from "../src/integrations/vite.js";

const POSTCSS_ENTRY = fileURLToPath(
	new URL("../fixtures/e2e/postcss/app.css", import.meta.url),
);
const POSTCSS_STANDALONE_ENTRY = fileURLToPath(
	new URL("../fixtures/e2e/postcss/standalone.css", import.meta.url),
);
const POSTCSS_THEME_SOURCE = fileURLToPath(
	new URL("../fixtures/e2e/shared/plugin-theme.ts", import.meta.url),
);
const POSTCSS_OUTPUT = fileURLToPath(
	new URL("../fixtures/e2e/postcss/mantine-theme.css", import.meta.url),
);
const VITE_ROOT = fileURLToPath(
	new URL("../fixtures/e2e/vite/", import.meta.url),
);
const VITE_THEME_SOURCE = fileURLToPath(
	new URL("../fixtures/e2e/shared/plugin-theme.ts", import.meta.url),
);
const VITE_OUTPUT = fileURLToPath(
	new URL("../fixtures/e2e/vite/mantine-theme.css", import.meta.url),
);
const VITE_STANDALONE_HTML = fileURLToPath(
	new URL("../fixtures/e2e/vite/index-standalone.html", import.meta.url),
);

async function cleanupFile(file) {
	try {
		await unlink(file);
	} catch {
		// Ignore missing files.
	}
}

function assertGeneratedUtilities(css) {
	assert.match(css, /\.p-xxs\s*\{\s*padding:\s*var\(--mantine-spacing-xxs\);/m);
	assert.match(
		css,
		/\.bg-primary-outline\s*\{\s*background-color:\s*var\(--mantine-color-deep-red-outline\);/m,
	);
	assert.match(
		css,
		/\.text-primary-text\s*\{\s*color:\s*var\(--mantine-color-deep-red-text\);/m,
	);
	assert.match(
		css,
		/\.font-bold\s*\{[^}]*font-weight:\s*var\(--mantine-font-weight-bold,\s*700\);/m,
	);
	assert.match(css, /\.basis-md\s*\{\s*flex-basis:\s*var\(--size-md\);/m);
	assert.ok(
		/\.\\@xs\\\/navbar\\:block\s*\{\s*@container navbar \(width >= 20rem\)\s*\{\s*display:\s*block;/m.test(
			css,
		) ||
			/@container navbar \(min-width:\s*20rem\)\s*\{\s*\.\\@xs\\\/navbar\\:block\s*\{\s*display:\s*block;/m.test(
				css,
			),
		"Expected Tailwind to generate the @xs/navbar:block container query variant",
	);
}

function assertDarkGeneratedUtility(css) {
	assert.match(css, /\.dark\\:bg-primary-outline/);
	assert.match(css, /\[data-mantine-color-scheme="dark"\]/);
}

function assertStandaloneMantineVariables(css) {
	assert.match(css, /--mantine-spacing-xxs:\s*(?:0?\.5rem);/);
	assert.match(
		css,
		/--mantine-primary-color-filled:\s*var\(--mantine-color-deep-red-filled\);/,
	);
	assert.match(
		css,
		/:root\[data-mantine-color-scheme="dark"\], :host\(\[data-mantine-color-scheme="dark"\]\)\s*\{/m,
	);
}

async function findBuiltCssFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const cssFiles = [];

	for (const entry of entries) {
		const entryPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			cssFiles.push(...(await findBuiltCssFiles(entryPath)));
			continue;
		}

		if (entry.name.endsWith(".css")) {
			cssFiles.push(entryPath);
		}
	}

	return cssFiles;
}

test("PostCSS e2e generates Tailwind utilities from managed theme output", async () => {
	await cleanupFile(POSTCSS_OUTPUT);

	try {
		const input = await readFile(POSTCSS_ENTRY, "utf8");
		const result = await postcss([
			mantineThemePostCSS({
				input: POSTCSS_THEME_SOURCE,
				output: POSTCSS_OUTPUT,
			}),
			tailwindPostCSS(),
		]).process(input, {
			from: POSTCSS_ENTRY,
		});

		assertGeneratedUtilities(result.css);
		assertDarkGeneratedUtility(result.css);
	} finally {
		await cleanupFile(POSTCSS_OUTPUT);
	}
});

test("PostCSS e2e generates standalone Mantine variables and Tailwind utilities", async () => {
	await cleanupFile(POSTCSS_OUTPUT);

	try {
		const input = await readFile(POSTCSS_STANDALONE_ENTRY, "utf8");
		const result = await postcss([
			mantineThemePostCSS({
				input: POSTCSS_THEME_SOURCE,
				output: POSTCSS_OUTPUT,
				format: "standalone",
			}),
			tailwindPostCSS(),
		]).process(input, {
			from: POSTCSS_STANDALONE_ENTRY,
		});

		assertStandaloneMantineVariables(result.css);
		assertGeneratedUtilities(result.css);
	} finally {
		await cleanupFile(POSTCSS_OUTPUT);
	}
});

test("Vite e2e generates Tailwind utilities from managed theme output", async () => {
	const outDir = await mkdtemp(join(tmpdir(), "tailwind-preset-mantine-vite-"));
	await cleanupFile(VITE_OUTPUT);

	try {
		await build({
			configFile: false,
			logLevel: "silent",
			root: VITE_ROOT,
			plugins: [
				mantineThemeVite({
					input: VITE_THEME_SOURCE,
					output: VITE_OUTPUT,
				}),
				tailwindVite(),
			],
			build: {
				outDir,
				emptyOutDir: true,
				minify: false,
				cssMinify: false,
			},
		});

		const [cssFile] = await findBuiltCssFiles(outDir);
		assert.ok(cssFile, "Expected Vite build to emit a CSS asset");

		const css = await readFile(cssFile, "utf8");
		assertGeneratedUtilities(css);
		assertDarkGeneratedUtility(css);
	} finally {
		await cleanupFile(VITE_OUTPUT);
		await rm(outDir, { recursive: true, force: true });
	}
});

test("Vite e2e generates standalone Mantine variables and Tailwind utilities", async () => {
	const outDir = await mkdtemp(join(tmpdir(), "tailwind-preset-mantine-vite-"));
	await cleanupFile(VITE_OUTPUT);

	try {
		await build({
			configFile: false,
			logLevel: "silent",
			root: VITE_ROOT,
			plugins: [
				mantineThemeVite({
					input: VITE_THEME_SOURCE,
					output: VITE_OUTPUT,
					format: "standalone",
				}),
				tailwindVite(),
			],
			build: {
				outDir,
				emptyOutDir: true,
				minify: false,
				cssMinify: false,
				rollupOptions: {
					input: VITE_STANDALONE_HTML,
				},
			},
		});

		const cssFiles = await findBuiltCssFiles(outDir);
		assert.ok(cssFiles.length > 0, "Expected Vite build to emit a CSS asset");

		const cssByFile = await Promise.all(
			cssFiles.map(async (file) => ({
				file,
				css: await readFile(file, "utf8"),
			})),
		);
		const standaloneAsset = cssByFile.find(({ css }) =>
			css.includes("--mantine-spacing-xxs"),
		);

		assert.ok(
			standaloneAsset,
			"Expected Vite build to emit a standalone CSS asset",
		);

		const { css } = standaloneAsset;
		assertStandaloneMantineVariables(css);
		assertGeneratedUtilities(css);
	} finally {
		await cleanupFile(VITE_OUTPUT);
		await rm(outDir, { recursive: true, force: true });
	}
});
