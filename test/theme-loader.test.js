import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { getThemeLoaderChildArgs } from "../src/core/theme-loader.js";

const execFile = promisify(execFileCallback);
const require = createRequire(import.meta.url);

test("theme loader child args use a file URL for the tsx import hook", () => {
	const args = getThemeLoaderChildArgs(
		"fixtures/loader/theme-with-assets-import.ts",
		"fixtures/loader",
	);

	assert.equal(args[0], "--import");
	assert.equal(args[1], pathToFileURL(require.resolve("tsx")).href);
	assert.match(args[1], /^file:/);
	assert.equal(args[3], "--child");
	assert.equal(args[5], resolve("fixtures/loader"));
});

test("Node rejects raw Windows paths for --import but accepts file URLs", async () => {
	await assert.rejects(
		execFile(process.execPath, ["--import", "C:\\fake\\loader.mjs", "-e", ""]),
		(error) => {
			assert.match(error.stderr, /ERR_UNSUPPORTED_ESM_URL_SCHEME/);
			assert.match(error.stderr, /Received protocol 'c:'/);
			return true;
		},
	);

	await assert.rejects(
		execFile(process.execPath, ["--import", "file:///C:/fake/loader.mjs", "-e", ""]),
		(error) => {
			assert.doesNotMatch(error.stderr, /ERR_UNSUPPORTED_ESM_URL_SCHEME/);
			assert.match(error.stderr, /ERR_MODULE_NOT_FOUND/);
			return true;
		},
	);
});
