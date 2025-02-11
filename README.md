# tailwind-preset-mantine

[![npm version](https://img.shields.io/npm/v/tailwind-preset-mantine.svg)](https://www.npmjs.com/package/tailwind-preset-mantine)

A Tailwind CSS (v4) preset for seamless integration with Mantine UI (v7) components.

## Compatibility

| Tailwind CSS Version | Mantine Version | Preset Version |
|---------------------|-----------------|----------------|
| v4                  | v7             | v2 (current)             |
| v3                  | v7             | ([v1](https://github.com/songkeys/tailwind-preset-mantine/tree/v1))* |

*Note: you can still use v1 for Tailwind CSS via [`@config`](https://tailwindcss.com/docs/upgrade-guide#using-a-javascript-config-file) directive.

## Installation

```bash
npm install tailwind-preset-mantine@beta
```

## Usage

### Default mantine theme

1. All-in-one import (recommended)

To use the preset in your Tailwind CSS configuration, add it to the css file:

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
> Note that here we setup tailwind slightly different from [the official docs](https://arc.net/l/quote/eifghbsm). We use the [CSS `@layer` directive](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to control the order of the css. This is because we want to make sure that the mantine styles doesn't get overridden by tailwind reset (tw_base). In this case, the order is `tw_base -> mantine -> tw_components -> tw_utilities`

### Custom mantine theme

If you have a custom mantine theme (<https://mantine.dev/theming/theme-object/>), you can create a theme file using `@mantine/core`'s `createTheme` function and generate the CSS using our CLI:

1. Create a theme file (e.g., `theme.js`):

```js
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

2. Generate the CSS using our CLI:

```bash
npx tailwind-preset-mantine theme.js -o theme.css
```

Options:
- `-o, --output`: Output file name/location (default: "theme.css")

3. Import the generated CSS file in your application:

```css
@import "tailwind-preset-mantine";
@import "./theme.css"; /* <-- add the generated theme */
```

## Minimal template

Here's a minimal template that you can use to get started:

<https://github.com/songkeys/next-app-mantine-tailwind-template/tree/tw4>

## License

MIT
