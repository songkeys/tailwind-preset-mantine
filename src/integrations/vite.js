import { collectThemeDependencies } from "../core/theme-dependencies.js";
import { expandMantineThemeDirectives } from "./transform-theme-directives.js";

export default function mantineTheme() {
	return {
		name: "tailwind-preset-mantine",
		enforce: "pre",
		async transform(code, id) {
			if (
				!id.includes(".css") ||
				(!code.includes("@mantine-theme") &&
					!code.includes("@mantine-standalone"))
			) {
				return null;
			}

			const from = id.split("?", 1)[0];
			const dependencies = [];
			const transformed = await expandMantineThemeDirectives(code, {
				from,
				onDependency: (file) => dependencies.push(file),
			});

			if (dependencies.length === 0) {
				return null;
			}

			const watchedFiles = new Set();

			for (const file of dependencies) {
				const transitiveDependencies = await collectThemeDependencies(
					file,
					async (specifier, importer) => {
						const resolved = await this.resolve(specifier, importer, {
							skipSelf: true,
						});

						if (resolved?.external) {
							return null;
						}

						return resolved?.id ?? null;
					},
				);

				for (const dependency of transitiveDependencies) {
					watchedFiles.add(dependency);
				}
			}

			for (const file of watchedFiles) {
				this.addWatchFile(file);
			}

			return {
				code: transformed,
				map: null,
			};
		},
	};
}
