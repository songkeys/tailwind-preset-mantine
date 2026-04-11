import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import mantineThemePostCSS from "../src/integrations/postcss.js";
import mantineThemeVite from "../src/integrations/vite.js";

const THEME_FILE = fileURLToPath(
	new URL("../fixtures/plugin/plugin-theme.ts", import.meta.url),
);
const THEME_COLORS_FILE = fileURLToPath(
	new URL("../fixtures/plugin/theme/colors.ts", import.meta.url),
);
const THEME_SPACING_FILE = fileURLToPath(
	new URL("../fixtures/plugin/theme/spacing.ts", import.meta.url),
);
const LOADER_THEME_WITH_ASSETS_FILE = fileURLToPath(
	new URL("../fixtures/loader/theme-with-assets-import.ts", import.meta.url),
);

async function withTempDir(run) {
	const directory = await mkdtemp(join(tmpdir(), "tailwind-preset-mantine-"));

	try {
		return await run(directory);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

test("PostCSS plugin generates theme output and reports theme dependencies", async () => {
	await withTempDir(async (directory) => {
		const cssEntry = join(directory, "app.css");
		const outputFile = join(directory, "mantine-theme.css");
		await writeFile(cssEntry, '@import "./mantine-theme.css";\n');

		const result = await postcss([
			mantineThemePostCSS({
				input: THEME_FILE,
				output: outputFile,
			}),
		]).process(await readFile(cssEntry, "utf8"), {
			from: cssEntry,
		});

		const css = await readFile(outputFile, "utf8");
		assert.match(css, /@import "tailwindcss\/theme\.css" layer\(theme\);/);
		assert.match(css, /@theme inline {/);
		assert.match(css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
		assert.match(
			css,
			/--color-primary-outline: var\(--mantine-color-deep-red-outline\);/,
		);
		assert.deepEqual(
			result.messages
				.filter((message) => message.type === "dependency")
				.map((message) => message.file)
				.sort(),
			[THEME_COLORS_FILE, THEME_FILE, THEME_SPACING_FILE].sort(),
		);
	});
});

test("PostCSS plugin supports standalone output", async () => {
	await withTempDir(async (directory) => {
		const cssEntry = join(directory, "app.css");
		const outputFile = join(directory, "mantine-theme.css");
		await writeFile(cssEntry, '@import "./mantine-theme.css";\n');

		await postcss([
			mantineThemePostCSS({
				input: THEME_FILE,
				output: outputFile,
				format: "standalone",
			}),
		]).process(await readFile(cssEntry, "utf8"), {
			from: cssEntry,
		});

		const css = await readFile(outputFile, "utf8");
		assert.match(css, /@import "tailwindcss\/theme\.css" layer\(theme\);/);
		assert.match(css, /@layer mantine {/);
		assert.match(css, /--mantine-spacing-xxs:\s*(?:0?\.5rem);/);
		assert.match(css, /@theme inline {/);
		assert.match(css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
	});
});

test("PostCSS plugin generates output for themes that import stylesheets and assets", async () => {
	await withTempDir(async (directory) => {
		const cssEntry = join(directory, "app.css");
		const outputFile = join(directory, "mantine-theme.css");
		await writeFile(cssEntry, '@import "./mantine-theme.css";\n');

		await postcss([
			mantineThemePostCSS({
				input: LOADER_THEME_WITH_ASSETS_FILE,
				output: outputFile,
			}),
		]).process(await readFile(cssEntry, "utf8"), {
			from: cssEntry,
		});

		const css = await readFile(outputFile, "utf8");
		assert.match(css, /@import "tailwindcss\/theme\.css" layer\(theme\);/);
		assert.match(css, /--color-forest-500: var\(--mantine-color-forest-5\);/);
	});
});

test("Vite plugin generates theme output and watches the theme graph", async () => {
	await withTempDir(async (directory) => {
		const outputFile = join(directory, "mantine-theme.css");
		const plugin = mantineThemeVite({
			input: THEME_FILE,
			output: outputFile,
		});
		const watchFiles = [];

		await plugin.configResolved?.({
			root: process.cwd(),
		});
		await plugin.buildStart?.call({
			addWatchFile(file) {
				watchFiles.push(file);
			},
		});

		const css = await readFile(outputFile, "utf8");
		assert.match(css, /@import "tailwindcss\/theme\.css" layer\(theme\);/);
		assert.match(css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
		assert.deepEqual(
			watchFiles.sort(),
			[THEME_COLORS_FILE, THEME_FILE, THEME_SPACING_FILE].sort(),
		);
	});
});

test("Vite plugin supports standalone output", async () => {
	await withTempDir(async (directory) => {
		const outputFile = join(directory, "mantine-theme.css");
		const plugin = mantineThemeVite({
			input: THEME_FILE,
			output: outputFile,
			format: "standalone",
		});

		await plugin.configResolved?.({
			root: process.cwd(),
		});
		await plugin.buildStart?.call({
			addWatchFile() {},
		});

		const css = await readFile(outputFile, "utf8");
		assert.match(css, /@import "tailwindcss\/theme\.css" layer\(theme\);/);
		assert.match(css, /@layer mantine {/);
		assert.match(css, /--mantine-spacing-xxs:\s*(?:0?\.5rem);/);
		assert.match(css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
	});
});
