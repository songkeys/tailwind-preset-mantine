const createMantineThemePostCSS = require("./postcss-shared.cjs");

const mantineTheme = createMantineThemePostCSS(async (...args) => {
	const { writeThemeOutput } = await import("../core/output.js");
	return writeThemeOutput(...args);
});

module.exports = mantineTheme;
