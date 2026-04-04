import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CLI_PATH = join(__dirname, "../src/cli/index.js");
const FIXTURES_DIR = join(__dirname, "../fixtures/cli");
const LOADER_FIXTURES_DIR = join(__dirname, "../fixtures/loader");

// Helper function to run CLI with args
async function runCLI(args = []) {
	return new Promise((resolve, reject) => {
		const cli = spawn(CLI_PATH, args, {
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		cli.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		cli.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		cli.on("close", (code) => {
			resolve({
				code,
				stdout,
				stderr,
			});
		});

		cli.on("error", reject);
	});
}

// Helper function to clean up output file
async function cleanupFile(filepath) {
	try {
		await access(filepath);
		await unlink(filepath);
	} catch {
		// File doesn't exist, no need to clean up
	}
}

// Helper function to run theme generation test
async function testThemeGeneration(fixturePath, outputPath, options = {}) {
	const { extraArgs = [], assertOutput } = options;

	try {
		const { code, stdout, stderr } = await runCLI([
			fixturePath,
			"-o",
			outputPath,
			...extraArgs,
		]);
		assert.equal(code, 0, `CLI failed with error: ${stderr}`);
		assert.match(stdout, /Successfully generated/);

		// Verify file exists
		await access(outputPath);
		const css = await readFile(outputPath, "utf8");
		await assertOutput?.(css);

		// Clean up
		await cleanupFile(outputPath);
	} catch (err) {
		// Clean up even if test fails
		await cleanupFile(outputPath);
		throw err;
	}
}

// Test: CLI should show error when no input file is provided
test("shows error when no input file is provided", async () => {
	const { code, stderr } = await runCLI([]);
	assert.equal(code, 1);
	assert.match(stderr, /Please provide a theme file path/);
});

// Test: CLI should process default theme
test("processes default theme", async () => {
	const inputPath = join(FIXTURES_DIR, "default-theme.js");
	await testThemeGeneration(inputPath, "default-theme-output.css");
});

// Test: CLI should process custom JS theme
test("processes custom JS theme", async () => {
	const inputPath = join(FIXTURES_DIR, "custom-theme.js");
	await testThemeGeneration(inputPath, "custom-theme-output.css");
});

// Test: CLI should process custom TS theme
test("processes custom TS theme", async () => {
	const inputPath = join(FIXTURES_DIR, "custom-theme-ts.ts");
	await testThemeGeneration(inputPath, "custom-theme-ts-output.css");
});

test("processes theme files that import stylesheets", async () => {
	const inputPath = join(LOADER_FIXTURES_DIR, "theme-with-css-import.ts");
	await testThemeGeneration(inputPath, "theme-with-css-import-output.css");
});

test("processes theme files that import assets through tsx modules", async () => {
	const inputPath = join(LOADER_FIXTURES_DIR, "theme-with-assets-import.ts");
	await testThemeGeneration(inputPath, "theme-with-assets-import-output.css");
});

// Test: CLI should process CJS theme
test("processes CJS theme", async () => {
	const inputPath = join(FIXTURES_DIR, "cjs-theme.cjs");
	await testThemeGeneration(inputPath, "cjs-theme-output.css");
});

test("supports standalone output format", async () => {
	const inputPath = join(FIXTURES_DIR, "custom-theme-ts.ts");
	await testThemeGeneration(inputPath, "standalone-theme-output.css", {
		extraArgs: ["--format", "standalone"],
		assertOutput: async (css) => {
			assert.match(css, /@layer mantine {/);
			assert.match(css, /--mantine-color-deep-red-0:|--mantine-spacing-xs:/);
			assert.match(css, /--spacing-xs: var\(--mantine-spacing-xs\);/);
		},
	});
});

// Test: CLI should handle custom output path
test("handles custom output path with --output flag", async () => {
	const inputPath = join(FIXTURES_DIR, "default-theme.js");
	const customOutput = "custom-output-long.css";
	await testThemeGeneration(inputPath, customOutput);
});

// Test: CLI should handle custom output path with short flag
test("handles custom output path with -o flag", async () => {
	const inputPath = join(FIXTURES_DIR, "default-theme.js");
	const customOutput = "custom-output-short.css";
	await testThemeGeneration(inputPath, customOutput);
});

// Test: CLI should handle invalid input file
test("handles invalid input file", async () => {
	const { code, stderr } = await runCLI(["non-existent-file.js"]);
	assert.equal(code, 1);
	assert.match(stderr, /Error generating theme/);
});

test("handles invalid output format", async () => {
	const inputPath = join(FIXTURES_DIR, "default-theme.js");
	const { code, stderr } = await runCLI([inputPath, "--format", "unknown"]);
	assert.equal(code, 1);
	assert.match(stderr, /Invalid output format/);
});

// Test: CLI should handle invalid file content
test("handles invalid theme file content", async () => {
	const { code, stderr } = await runCLI(["invalid-theme.js"]);
	assert.equal(code, 1);
	assert.match(stderr, /Error generating theme/);
});
