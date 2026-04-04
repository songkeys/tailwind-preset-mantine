import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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
const VITE_ROOT = fileURLToPath(
	new URL("../fixtures/e2e/vite/", import.meta.url),
);
const VITE_STANDALONE_HTML = fileURLToPath(
	new URL("../fixtures/e2e/vite/index-standalone.html", import.meta.url),
);

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

test("PostCSS e2e generates Tailwind utilities from @mantine-theme", async () => {
	const input = await readFile(POSTCSS_ENTRY, "utf8");
	const result = await postcss([
		mantineThemePostCSS(),
		tailwindPostCSS(),
	]).process(input, {
		from: POSTCSS_ENTRY,
	});

	assertGeneratedUtilities(result.css);
});

test("PostCSS e2e generates standalone Mantine variables and Tailwind utilities", async () => {
	const input = await readFile(POSTCSS_STANDALONE_ENTRY, "utf8");
	const result = await postcss([
		mantineThemePostCSS(),
		tailwindPostCSS(),
	]).process(input, {
		from: POSTCSS_STANDALONE_ENTRY,
	});

	assertStandaloneMantineVariables(result.css);
	assertGeneratedUtilities(result.css);
});

test("Vite e2e generates Tailwind utilities from @mantine-theme", async () => {
	const outDir = await mkdtemp(join(tmpdir(), "tailwind-preset-mantine-vite-"));

	try {
		await build({
			configFile: false,
			logLevel: "silent",
			root: VITE_ROOT,
			plugins: [mantineThemeVite(), tailwindVite()],
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
	} finally {
		await rm(outDir, { recursive: true, force: true });
	}
});

test("Vite e2e generates standalone Mantine variables and Tailwind utilities", async () => {
	const outDir = await mkdtemp(join(tmpdir(), "tailwind-preset-mantine-vite-"));

	try {
		await build({
			configFile: false,
			logLevel: "silent",
			root: VITE_ROOT,
			plugins: [mantineThemeVite(), tailwindVite()],
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
		await rm(outDir, { recursive: true, force: true });
	}
});
