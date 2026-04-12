import { writeThemeOutput } from "../core/output.js";

/**
 * @typedef {{
 * 	input: string;
 * 	output?: string;
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
	let pendingRegeneration = false;

	async function runGeneration() {
		const result = await writeThemeOutput(options, { baseDir: root });
		outputPath = result.outputPath;
		dependencyFiles = new Set(result.dependencies);
		return result;
	}

	async function generateThemeOutput({ queueNextRun = false } = {}) {
		if (generatePromise) {
			pendingRegeneration ||= queueNextRun;
			return generatePromise;
		}

		generatePromise = (async () => {
			let result;

			do {
				pendingRegeneration = false;
				result = await runGeneration();
			} while (pendingRegeneration);

			return result;
		})().finally(() => {
			generatePromise = null;
		});

		return generatePromise;
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
			const refresh = async (options = undefined) => {
				const result = await generateThemeOutput(options);
				server.watcher.add([...result.dependencies]);
			};

			const handleFileChange = async (file) => {
				if (file === outputPath || !dependencyFiles.has(file)) {
					return;
				}

				await refresh({ queueNextRun: true });
			};

			server.watcher.on("change", handleFileChange);
			server.watcher.on("add", handleFileChange);
			server.watcher.on("unlink", handleFileChange);

			void refresh();
		},
	};
}
