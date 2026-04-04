import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import postcss from "postcss";
import mantineThemePostCSS from "../src/integrations/postcss.js";
import mantineThemeVite from "../src/integrations/vite.js";

const CSS_ENTRY = fileURLToPath(
	new URL("../fixtures/plugin/app.css", import.meta.url),
);
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
const INPUT = readFileSync(CSS_ENTRY, "utf8");
const STANDALONE_INPUT = `@import "tailwind-preset-mantine";
@mantine-standalone "./plugin-theme.ts";
`;

test("PostCSS plugin expands @mantine-theme directives into Tailwind theme variables", async () => {
	const result = await postcss([mantineThemePostCSS()]).process(INPUT, {
		from: CSS_ENTRY,
	});

	assert.doesNotMatch(result.css, /@mantine-theme/);
	assert.match(result.css, /@theme inline {/);
	assert.match(result.css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
	assert.match(
		result.css,
		/--color-primary-outline: var\(--mantine-color-deep-red-outline\);/,
	);
	assert.ok(
		result.messages.some(
			(message) =>
				message.type === "dependency" &&
				message.file === THEME_FILE &&
				message.parent === CSS_ENTRY,
		),
	);
});

test("PostCSS plugin loads theme graphs that import stylesheets and assets", async () => {
	const result = await postcss([mantineThemePostCSS()]).process(
		`@mantine-theme "${LOADER_THEME_WITH_ASSETS_FILE}";`,
		{
			from: CSS_ENTRY,
		},
	);

	assert.match(
		result.css,
		/--color-forest-500: var\(--mantine-color-forest-5\);/,
	);
});

test("PostCSS plugin expands @mantine-standalone directives into Mantine variables and Tailwind aliases", async () => {
	const result = await postcss([mantineThemePostCSS()]).process(
		STANDALONE_INPUT,
		{
			from: CSS_ENTRY,
		},
	);

	assert.doesNotMatch(result.css, /@mantine-standalone/);
	assert.match(result.css, /@layer mantine {/);
	assert.match(result.css, /--mantine-spacing-xxs:\s*(?:0?\.5rem);/);
	assert.match(result.css, /@theme inline {/);
	assert.match(result.css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
});

test("Vite plugin expands @mantine-theme directives and watches the theme file", async () => {
	const plugin = mantineThemeVite();
	const watchFiles = [];
	const transformed = await plugin.transform.call(
		{
			addWatchFile(file) {
				watchFiles.push(file);
			},
			async resolve(specifier, importer) {
				return {
					id: fileURLToPath(new URL(specifier, pathToFileURL(importer))),
				};
			},
		},
		INPUT,
		CSS_ENTRY,
	);

	assert.ok(transformed);
	assert.match(
		transformed.code,
		/--spacing-xxs: var\(--mantine-spacing-xxs\);/,
	);
	assert.deepEqual(
		watchFiles.sort(),
		[THEME_COLORS_FILE, THEME_FILE, THEME_SPACING_FILE].sort(),
	);
});

test("Vite plugin expands @mantine-standalone directives and watches the theme graph", async () => {
	const plugin = mantineThemeVite();
	const watchFiles = [];
	const transformed = await plugin.transform.call(
		{
			addWatchFile(file) {
				watchFiles.push(file);
			},
			async resolve(specifier, importer) {
				return {
					id: fileURLToPath(new URL(specifier, pathToFileURL(importer))),
				};
			},
		},
		STANDALONE_INPUT,
		CSS_ENTRY,
	);

	assert.ok(transformed);
	assert.match(transformed.code, /@layer mantine {/);
	assert.match(transformed.code, /--mantine-spacing-xxs:\s*(?:0?\.5rem);/);
	assert.match(
		transformed.code,
		/--spacing-xxs: var\(--mantine-spacing-xxs\);/,
	);
	assert.deepEqual(
		watchFiles.sort(),
		[THEME_COLORS_FILE, THEME_FILE, THEME_SPACING_FILE].sort(),
	);
});
