import postcss from "postcss";
import { expandMantineThemeDirectives } from "./transform-theme-directives.js";

function mantineTheme() {
	return {
		postcssPlugin: "tailwind-preset-mantine",
		async Once(root, { result }) {
			const from = root.source?.input.file ?? result.opts.from;
			const dependencies = [];
			const css = await expandMantineThemeDirectives(root.toString(), {
				from,
				onDependency: (file) => dependencies.push(file),
			});

			if (dependencies.length === 0) {
				return;
			}

			root.removeAll();
			root.append(postcss.parse(css, { from }).nodes);

			for (const file of dependencies) {
				result.messages.push({
					type: "dependency",
					plugin: "tailwind-preset-mantine",
					file,
					parent: from,
				});
			}
		},
	};
}

mantineTheme.postcss = true;

export default mantineTheme;
