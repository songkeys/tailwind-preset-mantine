import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTheme } from "@mantine/core";
import { generateTheme } from "../src/core/generate.js";

test("generateTheme emits merged Mantine namespaces for custom theme keys", () => {
	const css = generateTheme(
		createTheme({
			primaryColor: "deep-red",
			colors: {
				"deep-red": [
					"#fff5f5",
					"#ffe3e3",
					"#ffc9c9",
					"#ffa8a8",
					"#ff8787",
					"#ff6b6b",
					"#fa5252",
					"#f03e3e",
					"#e03131",
					"#c92a2a",
				],
			},
			spacing: { xxs: "0.5rem" },
			radius: { xxs: "0.125rem" },
			fontSizes: { xxs: "0.65rem" },
			lineHeights: { xxs: "1.3" },
			fontWeights: { blacker: "950" },
			shadows: { xxs: "0 0 1px rgb(0 0 0 / 0.4)" },
			headings: {
				sizes: {
					hero: {
						fontSize: "4rem",
						lineHeight: "1.1",
						fontWeight: "800",
					},
				},
			},
		}),
	);

	assert.match(css, /@theme inline {/);
	assert.match(css, /--spacing-xxs: var\(--mantine-spacing-xxs\);/);
	assert.match(css, /--radius-xxs: var\(--mantine-radius-xxs\);/);
	assert.match(css, /--text-xxs: var\(--mantine-font-size-xxs\);/);
	assert.match(
		css,
		/--text-xxs--line-height: var\(--mantine-line-height-xxs\);/,
	);
	assert.match(
		css,
		/--font-weight-blacker: var\(--mantine-font-weight-blacker\);/,
	);
	assert.match(css, /--shadow-xxs: var\(--mantine-shadow-xxs\);/);
	assert.match(css, /--text-hero: var\(--mantine-hero-font-size\);/);
	assert.match(
		css,
		/--text-hero--line-height: var\(--mantine-hero-line-height\);/,
	);
	assert.match(css, /--font-weight-hero: var\(--mantine-hero-font-weight\);/);
	assert.match(
		css,
		/--color-primary-outline: var\(--mantine-color-deep-red-outline\);/,
	);
	assert.doesNotMatch(css, /--color-deep-red-contrast:/);
	assert.match(
		css,
		/--color-primary-contrast: var\(--mantine-primary-color-contrast\);/,
	);
});

test("generateTheme preserves Tailwind sizing workarounds without forcing container heights", () => {
	const css = generateTheme();

	assert.match(css, /--width-xs: var\(--size-xs\);/);
	assert.match(css, /--min-width-xs: var\(--size-xs\);/);
	assert.match(css, /--max-width-xs: var\(--size-xs\);/);
	assert.match(css, /--flex-basis-xs: var\(--size-xs\);/);
	assert.match(css, /--container-xs: var\(--size-xs\);/);
	assert.doesNotMatch(css, /--height-xs:/);
	assert.doesNotMatch(css, /--min-height-xs:/);
	assert.doesNotMatch(css, /--max-height-xs:/);
});

test("generateTheme keeps breakpoint reset needed by Tailwind responsive utilities", () => {
	const css = generateTheme();

	assert.match(css, /--breakpoint-\*: initial;/);
	assert.match(css, /--breakpoint-xs: 36em;/);
	assert.doesNotMatch(css, /--breakpoint-xs: var\(--mantine-breakpoint-xs\);/);
});

test("generated index.css imports theme.css instead of duplicating theme content", () => {
	const css = readFileSync(
		new URL("../src/index.css", import.meta.url),
		"utf8",
	);

	assert.match(css, /@import "\.\/theme\.css";/);
	assert.doesNotMatch(css, /@theme inline {/);
});
