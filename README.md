# tailwind-preset-mantine

[![npm version](https://img.shields.io/npm/v/tailwind-preset-mantine.svg)](https://www.npmjs.com/package/tailwind-preset-mantine)

A [Tailwind CSS (v4)](https://tailwindcss.com/) preset for seamless integration with [Mantine UI (>= v7)](https://mantine.dev/).

## Compatibility

| Tailwind CSS Version | Mantine Version | Preset Version |
|----------------------|-----------------|----------------|
| v4                   | v7 or v8 or v9  | v3 (current)   |
| v4                   | v7 or v8        | v2             |
| v3                   | v7 or v8        | [v1]*          |

*Note: you can still use v1 for Tailwind CSS V4 via [`@config`](https://tailwindcss.com/docs/upgrade-guide#using-a-javascript-config-file) directive.

## Installation

```bash
npm install tailwind-preset-mantine
```

Refer to [Tailwind Installation](https://tailwindcss.com/docs/installation/) for the rest of requirements to install tailwind depends on your project setup or framework.

## Usage

### Default mantine theme

1. All-in-one import (recommended)

When importing the styles, instead of importing the tailwind css file, importing this preset in the css file:

```css
@import "tailwind-preset-mantine";
```

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

2. Manual import (advanced)

Note that you don't have to import tailwind or mantine styles, this preset will handle that for you. If you want to import it yourself, you can use the `./theme.css` file:

```css
@layer theme, base, mantine, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

@import "@mantine/core/styles.layer.css";

@import "tailwind-preset-mantine/theme.css"; /* <-- import the preset */
```

> What's `@layer`?
>
> Note that here we setup tailwind slightly different from [the official docs](https://arc.net/l/quote/vtfxbocq). We use the [CSS `@layer` directive](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to control the order of the css. This is because we want to make sure that the mantine styles doesn't get overridden by tailwind reset (base). In this case, the order is `theme -> base -> mantine -> components -> utilities`.

### Custom mantine theme

If you have a custom mantine theme (<https://mantine.dev/theming/theme-object/>), the recommended v4 setup is to keep the default preset import and point to your theme file directly from CSS using `@mantine-theme`.

Build-time custom theme loading requires Node.js 22.15.0 or newer.

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

2. Expand the `@mantine-theme` directive during CSS compilation.

PostCSS:

```js
import mantineTheme from "tailwind-preset-mantine/postcss";
import tailwindcss from "@tailwindcss/postcss";

export default {
  plugins: [mantineTheme(), tailwindcss()],
};
```

Vite:

```ts
import { defineConfig } from "vite";
import mantineTheme from "tailwind-preset-mantine/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [mantineTheme(), tailwindcss()],
});
```

The Vite plugin also watches local modules imported by your Mantine theme file, so updates to split files like `theme/colors.ts` or `theme/spacing.ts` trigger CSS rebuilds automatically.

3. Import the preset and point it at your Mantine theme file:

```css
@import "tailwind-preset-mantine";
@mantine-theme "./mantine-theme.ts";
```

This keeps the default preset import path unchanged while still generating Tailwind theme variables from your merged Mantine theme during development and production builds.

The theme loader ignores imported stylesheet and common asset files in the theme import graph, so `mantine-theme.ts` can safely import CSS modules, Sass files, images, fonts, or colocated `.tsx` helper modules that reference those files.

### CLI fallback

If your setup does not use PostCSS or Vite, you can still pre-generate the theme CSS using the CLI:

```bash
npx tailwind-preset-mantine mantine-theme.ts -o theme.css
```

Options:
- `-o, --output`: Output file name/location (default: "theme.css")

Then import the generated file after the preset:

```css
@import "tailwind-preset-mantine";
@import "./theme.css";
```

## Minimal template

Here's a minimal template that you can use to get started:

<https://github.com/songkeys/next-app-mantine-tailwind-template>

## License

MIT

[v1]: https://github.com/songkeys/tailwind-preset-mantine/tree/v1
