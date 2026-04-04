import { expandMantineThemeDirectives } from "./transform-theme-directives.js";

export default function mantineTheme() {
	return {
		name: "tailwind-preset-mantine",
		enforce: "pre",
		async transform(code, id) {
			if (!id.includes(".css") || !code.includes("@mantine-theme")) {
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

			for (const file of dependencies) {
				this.addWatchFile(file);
			}

			return {
				code: transformed,
				map: null,
			};
		},
	};
}
