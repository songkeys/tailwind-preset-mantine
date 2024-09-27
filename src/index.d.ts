import type { MantineThemeOverride } from "@mantine/core";
import type { Config } from "tailwindcss";

declare function tailwindPresetMantine(
	options?: Partial<{ mantineTheme: MantineThemeOverride }>,
): Config;

export = tailwindPresetMantine;
