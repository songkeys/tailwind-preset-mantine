import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import mantineThemePostCSS from "../src/postcss.js";
import mantineThemeVite from "../src/vite.js";

const CSS_ENTRY = fileURLToPath(new URL("./fixtures/app.css", import.meta.url));
const THEME_FILE = fileURLToPath(
	new URL("./fixtures/plugin-theme.ts", import.meta.url),
);
const INPUT = `@import "tailwind-preset-mantine";
@mantine-theme "./plugin-theme.ts";
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

test("Vite plugin expands @mantine-theme directives and watches the theme file", async () => {
	const plugin = mantineThemeVite();
	const watchFiles = [];
	const transformed = await plugin.transform.call(
		{
			addWatchFile(file) {
				watchFiles.push(file);
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
	assert.deepEqual(watchFiles, [THEME_FILE]);
});
