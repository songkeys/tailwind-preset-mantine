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
export default function mantineTheme(options) {
	let root = process.cwd();
	let outputPath = "";
	let dependencyFiles = new Set();
	let generatePromise = null;

	async function generateThemeOutput() {
		if (!generatePromise) {
			generatePromise = writeThemeOutput(options, { baseDir: root }).finally(
				() => {
					generatePromise = null;
				},
			);
		}

		const result = await generatePromise;
		outputPath = result.outputPath;
		dependencyFiles = new Set(result.dependencies);
		return result;
	}

	return {
		name: "tailwind-preset-mantine",
		async configResolved(config) {
			root = config.root;
		},
		async buildStart() {
			const result = await generateThemeOutput();

			for (const file of result.dependencies) {
				this.addWatchFile(file);
			}
		},
		configureServer(server) {
			const refresh = async () => {
				const result = await generateThemeOutput();
				server.watcher.add([...result.dependencies]);
			};

			const handleFileChange = async (file) => {
				if (file === outputPath || !dependencyFiles.has(file)) {
					return;
				}

				await refresh();
			};

			server.watcher.on("change", handleFileChange);
			server.watcher.on("add", handleFileChange);
			server.watcher.on("unlink", handleFileChange);

			void refresh();
		},
	};
}
