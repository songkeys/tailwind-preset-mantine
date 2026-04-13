# tailwind-preset-mantine

[![npm version](https://img.shields.io/npm/v/tailwind-preset-mantine.svg)](https://www.npmjs.com/package/tailwind-preset-mantine)

A [Tailwind CSS (v4)](https://tailwindcss.com/) preset for seamless integration with [Mantine UI (>= v7)](https://mantine.dev/).

## Compatibility

| Tailwind CSS Version | Mantine Version | Preset Version |
|----------------------|-----------------|----------------|
| v4                   | v7 or v8 or v9  | v4 (current)   |
| v4                   | v7 or v8 or v9  | v3             |
| v4                   | v7 or v8        | v2             |
| v3                   | v7 or v8        | [v1]*          |

*Note: you can still use v1 for Tailwind CSS V4 via [`@config`](https://tailwindcss.com/docs/upgrade-guide#using-a-javascript-config-file) directive.

## Installation

```bash
npm install tailwind-preset-mantine
```

Refer to the [Tailwind installation guide](https://tailwindcss.com/docs/installation/) for the rest of the setup steps, since they depend on your framework or build tooling.

## Usage

### Default mantine theme

1. All-in-one import (recommended)

When importing the styles, instead of importing the tailwind css file, importing this preset in the css file:

```css
@import "tailwind-preset-mantine";
```

(No extra tailwind / mantine styles imported mantually.)

That's it!

Now you can use tailwind with mantine's style applied:

```tsx
import { Button } from '@mantine/core';

export default function Page() {
	// `bg-red-500` will be `background-color: var(--mantine-color-red-5)`
	// `text-white` will be `color: var(--mantine-color-white)`
	return <Button className="bg-red-500 text-white">Hello</Button>
}
```

2. More styles from other mantine libraries

If you use additional Mantine packages with their own styles, import them after the preset:

```css
@import "tailwind-preset-mantine";

@import "@mantine/dates/styles.layer.css";
@import "@mantine/dropzone/styles.layer.css";
@import "@mantine/carousel/styles.layer.css";
@import "@mantine/notifications/styles.layer.css";
@import "mantine-react-table/styles.css";
```

`@mantine/core/styles.layer.css` is already included by `tailwind-preset-mantine`, so you do not need to import it again in the all-in-one setup.

3. Manual import (advanced)

If you want to take more control on the import, you can expand and use the `./theme.css` file:

```css
@layer theme, base, mantine, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

@import "@mantine/core/styles.layer.css";

@import "tailwind-preset-mantine/theme.css"; /* <-- import the preset */
```

With more styles you have:

```css
@layer theme, base, mantine, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

@import "@mantine/core/styles.layer.css";
@import "@mantine/dates/styles.layer.css";
@import "@mantine/dropzone/styles.layer.css";
@import "@mantine/carousel/styles.layer.css";
@import "@mantine/notifications/styles.layer.css";

@import "tailwind-preset-mantine/theme.css"; /* <-- import the preset */
@import "mantine-react-table/styles.css"; /* regular CSS, placement relative to theme.css is flexible */
```

Additional Mantine package `styles.layer.css` imports can be placed either before or after `tailwind-preset-mantine/theme.css`. The important part is that they are imported after the `@layer theme, base, mantine, components, utilities;` declaration so they participate in the `mantine` layer correctly. The example above keeps them grouped with other Mantine imports for readability.

> What's `@layer`?
>
> Note that here we setup tailwind slightly different from [the official docs](https://arc.net/l/quote/vtfxbocq). We use the [CSS `@layer` directive](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to control the order of the css. This is because we want to make sure that the mantine styles doesn't get overridden by tailwind reset (base). In this case, the order is `theme -> base -> mantine -> components -> utilities`.

### Custom mantine theme

If you have a custom mantine theme (<https://mantine.dev/theming/theme-object/>), the recommended setup is to generate a complete stylesheet from your theme file and import that stylesheet directly.

1. Create a theme file (e.g., `mantine-theme.ts`):

```ts
import { createTheme } from "@mantine/core";

const theme = createTheme({
  colors: {
    // your custom colors
    "brand-blue": [
      "#e6f7ff",
      "#bae7ff",
      "#91d5ff",
      "#69c0ff",
      "#40a9ff",
      "#1890ff",
      "#096dd9",
      "#0050b3",
      "#003a8c",
      "#002766",
    ],
  },
  breakpoints: {
    // your custom breakpoints
    xs: "360px",
    sm: "480px",
    md: "768px",
    lg: "960px",
    xl: "1200px",
  },
  // other theme customizations
});

export default theme;
```

2. Configure the integration to generate a stylesheet from your Mantine theme.

By default, the generated file is written next to the theme file with the same basename and a `.css` extension. For example, `./src/mantine-theme.ts` generates `./src/mantine-theme.css`.

PostCSS:

```js
import mantineTheme from "tailwind-preset-mantine/postcss";

export default {
  plugins: [
    mantineTheme({
      input: "./src/mantine-theme.ts",
    }),
  ],
};
```

Next.js:

```js
// postcss.config.mjs
export default {
  plugins: {
    "tailwind-preset-mantine/postcss": {
      input: "./src/mantine-theme.ts",
    },
    "@tailwindcss/postcss": {},
  },
};
```

Vite:

```ts
import { defineConfig } from "vite";
import mantineTheme from "tailwind-preset-mantine/vite";

export default defineConfig({
  plugins: [
    mantineTheme({
      input: "./src/mantine-theme.ts",
    }),
  ],
});
```

The Vite integration also watches local modules imported by your Mantine theme file, so updates to split files like `theme/colors.ts` or `theme/spacing.ts` trigger the generated stylesheet to update automatically.

3. Import the generated stylesheet.

```css
@import "./mantine-theme.css";
```

The generated stylesheet includes the default imports and your merged Mantine theme.

#### Integration options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `input` | Yes | – | Path to the Mantine theme source file |
| `output` | No | `input` basename with `.css` extension | Path to the generated stylesheet |
| `format` | No | `theme` | `theme` generates Tailwind aliases only; `standalone` generates Mantine variables plus Tailwind aliases |

### Standalone pages without MantineProvider

If a page does not render `MantineProvider` but still needs your custom Mantine variables, generate the standalone variant instead:

PostCSS or Vite:

```ts
mantineTheme({
  input: "./src/mantine-theme.ts",
  format: "standalone",
});
```

This generates both:
- Mantine CSS variables like `--mantine-color-*` and `--mantine-spacing-*`
- Tailwind aliases like `--color-*` and `--spacing-*`

`standalone` defaults to the light color scheme. To use the dark scheme on a standalone page, set `data-mantine-color-scheme="dark"` on the document root or host element.

If you already render `MantineProvider` on the same page, prefer the default `theme` format instead. `standalone` is meant for routes or templates that do not get Mantine runtime variable injection.

### CLI fallback

If your setup does not use PostCSS or Vite, you can still generate the theme CSS with the CLI:

```bash
npx tailwind-preset-mantine mantine-theme.ts
```

Options:
- `-o, --output`: Output file name/location (defaults to the input filename with a `.css` extension)
- `--format theme|standalone`: Output either Tailwind aliases only (`theme`, default) or Mantine variables plus Tailwind aliases (`standalone`)

Then import the generated file:

```css
@import "./mantine-theme.css";
```

Use `--format standalone` when generating CSS for pages that do not render `MantineProvider`.

## Minimal template

Here's a minimal template that you can use to get started:

<https://github.com/songkeys/next-app-mantine-tailwind-template>

## License

MIT

[v1]: https://github.com/songkeys/tailwind-preset-mantine/tree/v1
