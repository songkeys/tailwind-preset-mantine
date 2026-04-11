export interface MantineThemePluginOptions {
	input: string;
	output?: string;
	format?: "theme" | "standalone";
}

declare function mantineTheme(
	options: MantineThemePluginOptions,
): import("vite").PluginOption;

export default mantineTheme;
