const { access } = require("node:fs/promises");
const { dirname, resolve } = require("node:path");

/**
 * @typedef {{
 * 	input: string;
 * 	output?: string;
 * 	format?: "theme" | "standalone";
 * }} MantineThemePluginOptions
 */

/**
 * Create a PostCSS plugin factory from a theme output writer.
 *
 * The CJS wrapper uses this helper so the package can expose a `require()`
 * entry without loading the ESM theme graph until PostCSS actually runs.
 *
 * @param {(options: MantineThemePluginOptions, runtimeOptions?: { baseDir?: string }) => Promise<{ dependencies?: string[] }>} writeThemeOutput
 */
function createMantineThemePostCSS(writeThemeOutput) {
	/**
	 * @param {MantineThemePluginOptions} options
	 */
	function mantineTheme(options) {
		async function resolveBaseDir(result) {
			const candidates = [];
			const cwd = result.opts.cwd ?? process.cwd();

			if (result.opts.from) {
				let current = resolve(cwd, result.opts.from);
				current = dirname(current);

				while (true) {
					candidates.push(current);
					const parent = dirname(current);

					if (parent === current) {
						break;
					}

					current = parent;
				}
			}

			candidates.push(cwd);

			const dedupedCandidates = [...new Set(candidates)];

			for (const baseDir of dedupedCandidates) {
				try {
					await access(resolve(baseDir, options.input));
					return baseDir;
				} catch {
					// Try the next candidate directory.
				}
			}

			return cwd;
		}

		return {
			postcssPlugin: "tailwind-preset-mantine",
			async Once(_, { result }) {
				const baseDir = await resolveBaseDir(result);
				const { dependencies = [] } = await writeThemeOutput(options, {
					baseDir,
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
	return mantineTheme;
}

module.exports = createMantineThemePostCSS;
