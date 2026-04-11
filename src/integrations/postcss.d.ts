export interface MantineThemePluginOptions {
	input: string;
	output?: string;
	format?: "theme" | "standalone";
}

declare const mantineTheme: {
	(options: MantineThemePluginOptions): import("postcss").Plugin;
	postcss: true;
};

export default mantineTheme;
