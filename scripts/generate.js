// this file is to generate the theme.css and index.css file for the preset
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDefaultImports, generateTheme } from "../src/generate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultImports = generateDefaultImports();
const theme = generateTheme();

fs.writeFileSync(path.join(__dirname, "../src/theme.css"), theme);
fs.writeFileSync(
	path.join(__dirname, "../src/index.css"),
	defaultImports + theme,
);
