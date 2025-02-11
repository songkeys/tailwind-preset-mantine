import { createTheme } from "@mantine/core";

const theme = createTheme({
	colors: {
		"deep-red": [
			"#ffeaec",
			"#fcd4d7",
			"#f4a7ac",
			"#ec777e",
			"#e64f57",
			"#e3353f",
			"#e22732",
			"#c91a25",
			"#b41220",
			"#9e0419",
		],
		"light-blue": [
			"#dffbff",
			"#caf2ff",
			"#99e2ff",
			"#64d2ff",
			"#3cc4fe",
			"#23bcfe",
			"#09b8ff",
			"#00a1e4",
			"#008fcd",
			"#007cb6",
		],
	},
	breakpoints: {
		xs: "360px",
		sm: "480px",
		md: "768px",
		lg: "960px",
		xl: "1200px",
	},
});

export default theme;
