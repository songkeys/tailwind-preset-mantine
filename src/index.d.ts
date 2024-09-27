import type { MantineThemeColorsOverride } from "@mantine/core";
import type { Config } from "tailwindcss";

declare function tailwindPresetMantine(
	options?: Partial<{ mantineColors: MantineThemeColorsOverride }>,
): Config;

export = tailwindPresetMantine;
