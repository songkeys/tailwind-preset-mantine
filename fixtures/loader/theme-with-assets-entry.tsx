import { createTheme } from "@mantine/core";
import brandFontUrl from "./theme-font.woff2";
import brandLogoUrl from "./theme-logo.svg";

if (!brandFontUrl || !brandLogoUrl) {
	throw new Error("Expected asset imports to be stubbed");
}

export const themeWithAssets = createTheme({
	colors: {
		forest: [
			"#eefbf1",
			"#def3e2",
			"#bde7c4",
			"#98daa3",
			"#79d08a",
			"#64ca78",
			"#57c56d",
			"#45ad5b",
			"#3a9a4f",
			"#2d8741",
		],
	},
});
