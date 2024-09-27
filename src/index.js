/// for reference: https://github.com/mantinedev/mantine/blob/master/packages/%40mantine/core/src/core/MantineProvider/global.css

/**
 * @typedef {import('@mantine/core').MantineThemeColorsOverride} MantineThemeColorsOverride
 * @typedef {import('tailwindcss').Config} TailwindConfig
 */

const { DEFAULT_THEME } = require("@mantine/core");

/**
 * @example
 *
 * ```ts
 * // tailwind.config.ts
 * import tailwindPresetMantine from 'tailwind-preset-mantine'
 *
 * export default {
 *  presets: [tailwindPresetMantine()],
 * };
 * ```
 *
 * If you have a custom mantine theme (https://mantine.dev/theming/theme-object/),
 * you should pass it as an option to make custom colors available to tailwind.
 *
 * ```ts
 * import tailwindPresetMantine from 'tailwind-preset-mantine'
 * import { createTheme } from '@mantine/core';
 *
 * const mantineTheme = createTheme({
 *   // ...your custom theme
 * });
 *
 * export default {
 *  presets: [tailwindPresetMantine({ mantineColors: mantineTheme.colors })],
 * };
 * ```
 */
module.exports = function tailwindPresetMantine({
	mantineColors = DEFAULT_THEME.colors,
} = {}) {
	/**
	 * @type {TailwindConfig}
	 */
	const preset = {
		content: [],
		darkMode: ["class", '[data-mantine-color-scheme="dark"]'],
		theme: {
			extend: {
				screens: {
					xs: "var(--mantine-breakpoint-xs)",
					sm: "var(--mantine-breakpoint-sm)",
					md: "var(--mantine-breakpoint-md)",
					lg: "var(--mantine-breakpoint-lg)",
					xl: "var(--mantine-breakpoint-xl)",
				},
				fontFamily: {
					DEFAULT: ["var(--mantine-font-family)"],
					sans: ["var(--mantine-font-family)"],
					mono: ["var(--mantine-font-family-monospace)"],
					headings: ["var(--mantine-font-family-headings)"],
				},
				fontSize: {
					xs: "var(--mantine-font-size-xs)",
					sm: "var(--mantine-font-size-sm)",
					md: "var(--mantine-font-size-md)",
					lg: "var(--mantine-font-size-lg)",
					xl: "var(--mantine-font-size-xl)",
					h1: "var(--mantine-h1-font-size)",
					h2: "var(--mantine-h2-font-size)",
					h3: "var(--mantine-h3-font-size)",
					h4: "var(--mantine-h4-font-size)",
					h5: "var(--mantine-h5-font-size)",
					h6: "var(--mantine-h6-font-size)",
					DEFAULT: "var(--mantine-font-size-md)",
				},
				fontWeight: {
					h1: "var(--mantine-h1-font-weight)",
					h2: "var(--mantine-h2-font-weight)",
					h3: "var(--mantine-h3-font-weight)",
					h4: "var(--mantine-h4-font-weight)",
					h5: "var(--mantine-h5-font-weight)",
					h6: "var(--mantine-h6-font-weight)",
				},
				lineHeight: {
					xs: "var(--mantine-line-height-xs)",
					sm: "var(--mantine-line-height-sm)",
					md: "var(--mantine-line-height-md)",
					lg: "var(--mantine-line-height-lg)",
					xl: "var(--mantine-line-height-xl)",
					h1: "var(--mantine-h1-line-height)",
					h2: "var(--mantine-h2-line-height)",
					h3: "var(--mantine-h3-line-height)",
					h4: "var(--mantine-h4-line-height)",
					h5: "var(--mantine-h5-line-height)",
					h6: "var(--mantine-h6-line-height)",
					heading: "var(--mantine-heading-line-height)",
					DEFAULT: "var(--mantine-line-height)",
				},
				spacing: {
					xs: "var(--mantine-spacing-xs)",
					sm: "var(--mantine-spacing-sm)",
					md: "var(--mantine-spacing-md)",
					lg: "var(--mantine-spacing-lg)",
					xl: "var(--mantine-spacing-xl)",
				},
				boxShadow: {
					xs: "var(--mantine-shadow-xs)",
					sm: "var(--mantine-shadow-sm)",
					md: "var(--mantine-shadow-md)",
					lg: "var(--mantine-shadow-lg)",
					xl: "var(--mantine-shadow-xl)",
					DEFAULT: "var(--mantine-shadow-xs)",
				},
				borderRadius: {
					xs: "var(--mantine-radius-xs)",
					sm: "var(--mantine-radius-sm)",
					md: "var(--mantine-radius-md)",
					lg: "var(--mantine-radius-lg)",
					xl: "var(--mantine-radius-xl)",
					DEFAULT: "var(--mantine-radius-default)",
				},
				colors: {
					...generateColors(mantineColors),
					...generatePrimaryColors(),
					...generateVariantSpecificColors(mantineColors),
					...generateVariantSpecificPrimaryColors(),
					...generateOtherTextColors(),
				},
				backgroundColor: {
					...generateColors(mantineColors),
					...generatePrimaryColors(),
					...generateVariantSpecificColors(mantineColors),
					...generateVariantSpecificPrimaryColors(),
					...generateOtherBackgroundColors(),
				},
				placeholderColor: {
					...generateColors(mantineColors),
					...generatePrimaryColors(),
					...generateVariantSpecificColors(mantineColors),
					...generateVariantSpecificPrimaryColors(),
					...generateOtherTextColors(),
				},
				ringColor: {
					...generateColors(mantineColors),
					...generatePrimaryColors(),
					...generateVariantSpecificColors(mantineColors),
					...generateVariantSpecificPrimaryColors(),
					...generateOtherBorderColors(),
				},
				divideColor: {
					...generateColors(mantineColors),
					...generatePrimaryColors(),
					...generateVariantSpecificColors(mantineColors),
					...generateVariantSpecificPrimaryColors(),
					...generateOtherBorderColors(),
				},
				borderColor: {
					...generateColors(mantineColors),
					...generatePrimaryColors(),
					...generateVariantSpecificColors(mantineColors),
					...generateVariantSpecificPrimaryColors(),
					...generateOtherBorderColors(),
				},
				zIndex: {
					app: "var(--mantine-z-index-app)",
					modal: "var(--mantine-z-index-modal)",
					popover: "var(--mantine-z-index-popover)",
					overlay: "var(--mantine-z-index-overlay)",
					max: "var(--mantine-z-index-max)",
				},
			},
		},
	};

	return preset;
};

/**
 * @param {MantineThemeColorsOverride} mantineColors
 */
function generateColors(mantineColors) {
	/**
	 * @type {NonNullable<TailwindConfig['theme']>['colors']}
	 */
	const colors = {};

	for (const color of Object.keys(mantineColors)) {
		colors[color] = {
			50: `var(--mantine-color-${color}-0)`,
			100: `var(--mantine-color-${color}-1)`,
			200: `var(--mantine-color-${color}-2)`,
			300: `var(--mantine-color-${color}-3)`,
			400: `var(--mantine-color-${color}-4)`,
			500: `var(--mantine-color-${color}-5)`,
			600: `var(--mantine-color-${color}-6)`,
			700: `var(--mantine-color-${color}-7)`,
			800: `var(--mantine-color-${color}-8)`,
			900: `var(--mantine-color-${color}-9)`,
			DEFAULT: `var(--mantine-color-${color}-filled)`,
		};
	}

	return colors;
}

function generatePrimaryColors() {
	const colors = {
		primary: {
			50: "var(--mantine-primary-color-0)",
			100: "var(--mantine-primary-color-1)",
			200: "var(--mantine-primary-color-2)",
			300: "var(--mantine-primary-color-3)",
			400: "var(--mantine-primary-color-4)",
			500: "var(--mantine-primary-color-5)",
			600: "var(--mantine-primary-color-6)",
			700: "var(--mantine-primary-color-7)",
			800: "var(--mantine-primary-color-8)",
			900: "var(--mantine-primary-color-9)",
			DEFAULT: "var(--mantine-primary-color-6)",
		},
	};

	return colors;
}

/**
 * @param {MantineThemeColorsOverride} mantineColors
 */
function generateVariantSpecificColors(mantineColors) {
	/**
	 * @type {NonNullable<TailwindConfig['theme']>['colors']}
	 */
	const colors = {};

	for (const color of Object.keys(mantineColors)) {
		colors[`${color}-filled`] = `var(--mantine-color-${color}-filled)`;
		colors[`${color}-filled-hover`] =
			`var(--mantine-color-${color}-filled-hover)`;
		colors[`${color}-light`] = `var(--mantine-color-${color}-light)`;
		colors[`${color}-light-hover`] =
			`var(--mantine-color-${color}-light-hover)`;
		colors[`${color}-light-color`] =
			`var(--mantine-color-${color}-light-color)`;
		colors[`${color}-outline`] = `var(--mantine-color-${color}-outline)`;
		colors[`${color}-outline-hover`] =
			`var(--mantine-color-${color}-outline-hover)`;
	}

	return colors;
}

function generateVariantSpecificPrimaryColors() {
	/**
	 * @type {NonNullable<TailwindConfig['theme']>['colors']}
	 */
	const colors = {
		"primary-filled": "var(--mantine-primary-color-filled)",
		"primary-filled-hover": "var(--mantine-primary-color-filled-hover)",
		"primary-light": "var(--mantine-primary-color-light)",
		"primary-light-hover": "var(--mantine-primary-color-light-hover)",
		"primary-light-color": "var(--mantine-primary-color-light-color)",
		"primary-outline": "var(--mantine-primary-color-outline)",
		"primary-outline-hover": "var(--mantine-primary-color-outline-hover)",
	};

	return colors;
}

function generateOtherTextColors() {
	/**
	 * @type {NonNullable<TailwindConfig['theme']>['colors']}
	 */
	const colors = {
		white: "var(--mantine-color-white)",
		black: "var(--mantine-color-black)",
		body: "var(--mantine-color-text)",
		error: "var(--mantine-color-error)",
		placeholder: "var(--mantine-color-placeholder)",
		anchor: "var(--mantine-color-anchor)",
		DEFAULT: "var(--mantine-color-default-color)",
	};

	return colors;
}

function generateOtherBackgroundColors() {
	/**
	 * @type {NonNullable<TailwindConfig['theme']>['colors']}
	 */
	const colors = {
		white: "var(--mantine-color-white)",
		black: "var(--mantine-color-black)",
		body: "var(--mantine-color-body)",
		error: "var(--mantine-color-error)",
		placeholder: "var(--mantine-color-placeholder)",
		anchor: "var(--mantine-color-anchor)",
		DEFAULT: "var(--mantine-color-default)",
		hover: "var(--mantine-color-default-hover)",
	};

	return colors;
}

function generateOtherBorderColors() {
	/**
	 * @type {NonNullable<TailwindConfig['theme']>['colors']}
	 */
	const colors = {
		DEFAULT: "var(--mantine-color-default-border)",
	};

	return colors;
}
