import { writeThemeOutput } from "../core/output.js";

/**
 * @typedef {{
 * 	input: string;
 * 	output: string;
 * 	format?: "theme" | "standalone";
 * }} MantineThemePluginOptions
 */

/**
 * @param {MantineThemePluginOptions} options
 */
function mantineTheme(options) {
	return {
		postcssPlugin: "tailwind-preset-mantine",
		async Once(_, { result }) {
			const { dependencies } = await writeThemeOutput(options, {
				baseDir: process.cwd(),
			});

			for (const file of dependencies) {
				result.messages.push({
					type: "dependency",
					plugin: "tailwind-preset-mantine",
					file,
					parent: result.opts.from,
				});
			}
		},
	};
}

mantineTheme.postcss = true;

export default mantineTheme;
