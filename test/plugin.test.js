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
const INPUT = readFileSync(CSS_ENTRY, "utf8");

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
