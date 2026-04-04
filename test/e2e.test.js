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
const VITE_ROOT = fileURLToPath(
	new URL("../fixtures/e2e/vite/", import.meta.url),
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

async function findBuiltCssFile(directory) {
	const entries = await readdir(directory, { withFileTypes: true });

	for (const entry of entries) {
		const entryPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			const nestedPath = await findBuiltCssFile(entryPath);

			if (nestedPath) {
				return nestedPath;
			}

			continue;
		}

		if (entry.name.endsWith(".css")) {
			return entryPath;
		}
	}

	return null;
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

		const cssFile = await findBuiltCssFile(outDir);
		assert.ok(cssFile, "Expected Vite build to emit a CSS asset");

		const css = await readFile(cssFile, "utf8");
		assertGeneratedUtilities(css);
	} finally {
		await rm(outDir, { recursive: true, force: true });
	}
});
