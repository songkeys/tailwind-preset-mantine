import type { MantineThemeColors } from "@mantine/core";
import type { Config } from "tailwindcss";

declare function tailwindPresetMantine(
	options?: Partial<{ mantineColors: MantineThemeColors }>,
): Config;

export = tailwindPresetMantine;
