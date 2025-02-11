import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CLI_PATH = join(__dirname, "../src/cli.js");
const FIXTURES_DIR = join(__dirname, "fixtures");

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
async function testThemeGeneration(fixturePath, outputPath) {
	try {
		const { code, stdout, stderr } = await runCLI([
			fixturePath,
			"-o",
			outputPath,
		]);
		assert.equal(code, 0, `CLI failed with error: ${stderr}`);
		assert.match(stdout, /Successfully generated/);

		// Verify file exists
		await access(outputPath);

		// Clean up
		await cleanupFile(outputPath);
	} catch (err) {
		// Clean up even if test fails
		await cleanupFile(outputPath);
		throw err;
	}
}

// Test: CLI should show error when no input file is provided
test("shows error when no input file is provided", async (t) => {
	const { code, stderr } = await runCLI([]);
	assert.equal(code, 1);
	assert.match(stderr, /Please provide a theme file path/);
});

// Test: CLI should process default theme
test("processes default theme", async (t) => {
	const inputPath = join(FIXTURES_DIR, "default-theme.js");
	await testThemeGeneration(inputPath, "default-theme-output.css");
});

// Test: CLI should process custom JS theme
test("processes custom JS theme", async (t) => {
	const inputPath = join(FIXTURES_DIR, "custom-theme.js");
	await testThemeGeneration(inputPath, "custom-theme-output.css");
});

// Test: CLI should process custom TS theme
test("processes custom TS theme", async (t) => {
	const inputPath = join(FIXTURES_DIR, "custom-theme-ts.ts");
	await testThemeGeneration(inputPath, "custom-theme-ts-output.css");
});

// Test: CLI should process CJS theme
test("processes CJS theme", async (t) => {
	const inputPath = join(FIXTURES_DIR, "cjs-theme.cjs");
	await testThemeGeneration(inputPath, "cjs-theme-output.css");
});

// Test: CLI should handle custom output path
test("handles custom output path with --output flag", async (t) => {
	const inputPath = join(FIXTURES_DIR, "default-theme.js");
	const customOutput = "custom-output-long.css";
	await testThemeGeneration(inputPath, customOutput);
});

// Test: CLI should handle custom output path with short flag
test("handles custom output path with -o flag", async (t) => {
	const inputPath = join(FIXTURES_DIR, "default-theme.js");
	const customOutput = "custom-output-short.css";
	await testThemeGeneration(inputPath, customOutput);
});

// Test: CLI should handle invalid input file
test("handles invalid input file", async (t) => {
	const { code, stderr } = await runCLI(["non-existent-file.js"]);
	assert.equal(code, 1);
	assert.match(stderr, /Error generating theme/);
});

// Test: CLI should handle invalid file content
test("handles invalid theme file content", async (t) => {
	const { code, stderr } = await runCLI(["invalid-theme.js"]);
	assert.equal(code, 1);
	assert.match(stderr, /Error generating theme/);
});
