import { createTheme } from "@mantine/core";
import buttonStyles from "./theme-with-css-import.module.css";

const theme = createTheme({
	colors: {
		brand: [
			"#fff1f2",
			"#ffe4e6",
			"#fecdd3",
			"#fda4af",
			"#fb7185",
			"#f43f5e",
			"#e11d48",
			"#be123c",
			"#9f1239",
			"#881337",
		],
	},
	components: {
		Button: {
			classNames: buttonStyles,
		},
	},
});

export default theme;
