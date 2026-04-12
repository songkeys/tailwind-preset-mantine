import createMantineThemePostCSS from "./postcss-shared.cjs";
import { writeThemeOutput } from "../core/output.js";

const mantineTheme = createMantineThemePostCSS(writeThemeOutput);

export default mantineTheme;
