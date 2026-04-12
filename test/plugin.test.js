import assert from "node:assert/strict";
import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	utimes,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { buildThemeOutput } from "../src/core/output.js";
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

test("PostCSS plugin resolves relative paths from a nested app root", async () => {
	await withTempDir(async (directory) => {
		const rootSourceDirectory = join(directory, "src");
		const rootThemeFile = join(rootSourceDirectory, "theme.ts");
		const rootOutputFile = join(directory, "mantine-theme.css");
		const appDirectory = join(directory, "apps", "web");
		const sourceDirectory = join(appDirectory, "src");
		const cssEntry = join(appDirectory, "app.css");
		const themeFile = join(sourceDirectory, "theme.ts");
		const outputFile = join(appDirectory, "mantine-theme.css");

		await mkdir(rootSourceDirectory, { recursive: true });
		await mkdir(sourceDirectory, { recursive: true });
		await writeFile(cssEntry, '@import "./mantine-theme.css";\n');
		await writeFile(
			rootThemeFile,
			'export default { spacing: { xxs: "2rem" } };\n',
		);
		await writeFile(
			themeFile,
			'export default { spacing: { xxs: "0.5rem" } };\n',
		);

		const result = await postcss([
			mantineThemePostCSS({
				input: "./src/theme.ts",
				output: "./mantine-theme.css",
			}),
		]).process(await readFile(cssEntry, "utf8"), {
			cwd: directory,
			from: cssEntry,
		});

		const css = await readFile(outputFile, "utf8");
		assert.match(css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
		assert.doesNotMatch(css, /--mantine-spacing-xxs:\s*2rem;/);
		await assert.rejects(access(rootOutputFile));
		assert.deepEqual(
			result.messages
				.filter((message) => message.type === "dependency")
				.map((message) => message.file),
			[themeFile],
		);
	});
});

test("buildThemeOutput tracks themes that rely on tsconfig path aliases", async () => {
	await withTempDir(async (directory) => {
		const themeDirectory = join(directory, "theme");
		const themeFile = join(directory, "mantine-theme.ts");
		const colorsFile = join(themeDirectory, "colors.ts");

		await mkdir(themeDirectory, { recursive: true });
		await writeFile(
			join(directory, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					baseUrl: ".",
					paths: {
						"@theme/*": ["./theme/*"],
					},
				},
			}),
		);
		await writeFile(
			colorsFile,
			'export const colors = { brand: ["#000000", "#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777", "#888888", "#999999"] };\n',
		);
		await writeFile(
			themeFile,
			'import { colors } from "@theme/colors";\nexport default { colors, primaryColor: "brand" };\n',
		);

		const result = await buildThemeOutput(
			{
				input: "./mantine-theme.ts",
				output: "./mantine-theme.css",
			},
			{ baseDir: directory },
		);

		assert.equal(result.inputPath, themeFile);
		assert.match(result.css, /--color-brand-500:/);
		assert.deepEqual(
			result.dependencies.sort(),
			[colorsFile, themeFile].sort(),
		);
	});
});

test("buildThemeOutput tracks themes that rely on package import aliases", async () => {
	await withTempDir(async (directory) => {
		const themeDirectory = join(directory, "theme");
		const themeFile = join(directory, "mantine-theme.ts");
		const colorsFile = join(themeDirectory, "colors.ts");

		await mkdir(themeDirectory, { recursive: true });
		await writeFile(
			join(directory, "package.json"),
			JSON.stringify({
				type: "module",
				imports: {
					"#theme/*": "./theme/*",
				},
			}),
		);
		await writeFile(
			colorsFile,
			'export const colors = { brand: ["#000000", "#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777", "#888888", "#999999"] };\n',
		);
		await writeFile(
			themeFile,
			'import { colors } from "#theme/colors";\nexport default { colors, primaryColor: "brand" };\n',
		);

		const result = await buildThemeOutput(
			{
				input: "./mantine-theme.ts",
				output: "./mantine-theme.css",
			},
			{ baseDir: directory },
		);

		assert.equal(result.inputPath, themeFile);
		assert.match(result.css, /--color-brand-500:/);
		assert.deepEqual(
			result.dependencies.sort(),
			[colorsFile, themeFile].sort(),
		);
	});
});

test("buildThemeOutput tracks JSON theme helpers", async () => {
	await withTempDir(async (directory) => {
		const themeFile = join(directory, "theme.ts");
		const spacingFile = join(directory, "spacing.json");

		await writeFile(
			spacingFile,
			JSON.stringify({
				xxs: "0.5rem",
			}),
		);
		await writeFile(
			themeFile,
			'import spacing from "./spacing.json" with { type: "json" };\nexport default { spacing };\n',
		);

		const result = await buildThemeOutput({
			input: themeFile,
			output: join(directory, "theme.css"),
			format: "standalone",
		});

		assert.match(result.css, /--mantine-spacing-xxs:\s*(?:0?\.5rem);/);
		assert.deepEqual(
			result.dependencies.sort(),
			[spacingFile, themeFile].sort(),
		);
	});
});

test("buildThemeOutput invalidates the cached theme graph when a helper changes", async () => {
	await withTempDir(async (directory) => {
		const themeFile = join(directory, "theme.ts");
		const spacingFile = join(directory, "spacing.ts");
		const outputFile = join(directory, "theme.css");

		await writeFile(spacingFile, 'export const spacing = { xxs: "0.5rem" };\n');
		await writeFile(
			themeFile,
			'import { spacing } from "./spacing.ts";\nexport default { spacing };\n',
		);

		const initial = await buildThemeOutput({
			input: themeFile,
			output: outputFile,
			format: "standalone",
		});
		assert.match(initial.css, /--mantine-spacing-xxs:\s*(?:0?\.5rem);/);

		await writeFile(spacingFile, 'export const spacing = { xxs: "1rem" };\n');
		const nextMtime = new Date(Date.now() + 1_000);
		await utimes(spacingFile, nextMtime, nextMtime);
		await delay(20);

		const updated = await buildThemeOutput({
			input: themeFile,
			output: outputFile,
			format: "standalone",
		});
		assert.match(updated.css, /--mantine-spacing-xxs:\s*1rem;/);
	});
});

test("buildThemeOutput tracks extensionless theme imports", async () => {
	await withTempDir(async (directory) => {
		const themeFile = join(directory, "theme.ts");
		const spacingFile = join(directory, "spacing.ts");

		await writeFile(spacingFile, 'export const spacing = { xxs: "0.5rem" };\n');
		await writeFile(
			themeFile,
			'import { spacing } from "./spacing";\nexport default { spacing };\n',
		);

		const result = await buildThemeOutput({
			input: themeFile,
			output: join(directory, "theme.css"),
		});

		assert.deepEqual(
			result.dependencies.sort(),
			[spacingFile, themeFile].sort(),
		);
	});
});

test("buildThemeOutput tracks CommonJS theme helpers", async () => {
	await withTempDir(async (directory) => {
		const themeFile = join(directory, "theme.cjs");
		const spacingFile = join(directory, "spacing.cjs");

		await writeFile(
			spacingFile,
			'module.exports = { spacing: { xxs: "0.5rem" } };\n',
		);
		await writeFile(
			themeFile,
			'const { spacing } = require("./spacing.cjs");\nmodule.exports = { spacing };\n',
		);

		const result = await buildThemeOutput({
			input: themeFile,
			output: join(directory, "theme.css"),
		});

		assert.deepEqual(
			result.dependencies.sort(),
			[spacingFile, themeFile].sort(),
		);
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

test("Vite plugin reruns generation when a dependency changes mid-refresh", async () => {
	await withTempDir(async (directory) => {
		const themeFile = join(directory, "theme.ts");
		const spacingFile = join(directory, "spacing.ts");
		const outputFile = join(directory, "mantine-theme.css");
		const watcherHandlers = new Map();
		const plugin = mantineThemeVite({
			input: "./theme.ts",
			output: "./mantine-theme.css",
			format: "standalone",
		});

		await writeFile(spacingFile, 'export const spacing = { xxs: "0.5rem" };\n');
		await writeFile(
			themeFile,
			'import { spacing } from "./spacing.ts";\nAtomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);\nexport default { spacing };\n',
		);

		await plugin.configResolved?.({
			root: directory,
		});
		await plugin.buildStart?.call({
			addWatchFile() {},
		});

		assert.match(
			await readFile(outputFile, "utf8"),
			/--mantine-spacing-xxs:\s*(?:0?\.5rem);/,
		);

		plugin.configureServer?.({
			watcher: {
				add() {},
				on(event, handler) {
					watcherHandlers.set(event, handler);
				},
			},
		});

		const handleFileChange = watcherHandlers.get("change");
		assert.equal(typeof handleFileChange, "function");

		await delay(20);
		await writeFile(spacingFile, 'export const spacing = { xxs: "1rem" };\n');
		await handleFileChange(spacingFile);

		assert.match(
			await readFile(outputFile, "utf8"),
			/--mantine-spacing-xxs:\s*1rem;/,
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
