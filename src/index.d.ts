import type {
	MantineBreakpointsValues,
	MantineThemeColorsOverride,
} from "@mantine/core";
import type { Config } from "tailwindcss";

declare function tailwindPresetMantine(
	options?: Partial<{
		mantineColors: MantineThemeColorsOverride;
		mantineBreakpoints: Partial<MantineBreakpointsValues>;
	}>,
): Config;

export = tailwindPresetMantine;
