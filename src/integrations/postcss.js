import { writeThemeOutput } from "../core/output.js";
import createMantineThemePostCSS from "./postcss-shared.cjs";

const mantineTheme = createMantineThemePostCSS(writeThemeOutput);

export default mantineTheme;
