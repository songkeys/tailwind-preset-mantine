# tailwind-preset-mantine

[![npm version](https://img.shields.io/npm/v/tailwind-preset-mantine.svg)](https://www.npmjs.com/package/tailwind-preset-mantine)

A Tailwind CSS preset for seamless integration with Mantine UI components.

## Installation

```bash
npm install tailwind-preset-mantine
```

## Usage

### Default mantine theme

To use the preset in your Tailwind CSS configuration, add it to the `presets` array:

```ts
// tailwind.config.ts
import tailwindPresetMantine from 'tailwind-preset-mantine';

export default {
	presets: [
		tailwindPresetMantine(),
	],
};
```

Now you can use tailwind with mantine's style applied:

```tsx
import { Button } from '@mantine/core';

export default function Page() {
	// `bg-red-500` will be `background-color: var(--mantine-color-red-5)`
	// `text-white` will be `color: var(--mantine-color-white)`
	return <Button className="bg-red-500 text-white">Hello</Button>
}
```

### Custom mantine theme

If you have a custom mantine theme (https://mantine.dev/theming/theme-object/), you should pass it as an option to make custom colors and custom breakpoints available to tailwind.

Let's define your custom mantine `colors` and `breakpoints` first:

```tsx
// src/theme.ts
import {
  type MantineThemeColors,
  type MantineBreakpointsValues,
} from "@mantine/core";

export const colors: MantineThemeColors = {
	// ...your custom colors
}
export const breakpoints: MantineBreakpointsValues = {
	// ...your custom breakpoints
}
```

Pass your custom `colors` and `breakpoints` to `MantineProvider`:

```tsx
// src/mantine-provider.tsx
import {
	MantineProvider,
	mergeMantineTheme,
	DEFAULT_THEME,
} from '@mantine/core';
import { colors, breakpoints } from './theme';

const theme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({
    breakpoints,
    colors,
  }),
);

export default function MantineProvider({ children }: { children: React.ReactNode }) {
	return <MantineProvider theme={{ colors, breakpoints }}>{children}</MantineProvider>
}
```

Then pass them to `tailwind-preset-mantine`:

```ts
// tailwind.config.ts
import tailwindPresetMantine from 'tailwind-preset-mantine'
import { colors, breakpoints } from './theme';

export default {
	presets: [tailwindPresetMantine({
		mantineColors: colors,
		mantineBreakpoints: breakpoints
	})],
};
```

> Why separate the `colors` and `breakpoints` definition in a single file?
>
> Because if passing the whole `mantineTheme` object, the property [`mantineTheme.components`](https://mantine.dev/theming/theme-object/#components) might include (s)css modules, which could fail to resolve due to the absence of an (s)css loader when loading the Tailwind config file.
>
> If you have a better solution, please let me know in the [issue](https://github.com/songkeys/tailwind-preset-mantine/issues).

## Prevent style conflicts

You will encounter style conflicts when using mantine and tailwind together. (See this [tough discussion](https://github.com/orgs/mantinedev/discussions/1672).) To prevent this, you can follow the steps below:

### 1. global.css

Change your global.css to use CSS layers to prevent style conflicts:

```css
@layer tw_base, mantine, tw_components, tw_utilities;

/* import tailwind */
@import "tailwindcss/base" layer(tw_base);
@import "tailwindcss/components" layer(tw_components);
@import "tailwindcss/utilities" layer(tw_utilities);

/* import mantine */
@import "@mantine/core/styles.layer.css";
```

> What's `@layer`?
>
> Note that here we setup tailwind slightly different from [the official docs](https://arc.net/l/quote/eifghbsm). We use the [CSS `@layer` directive](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to control the order of the css. This is because we want to make sure that the mantine styles doesn't get overridden by tailwind reset (tw_base). In this case, the order is `tw_base -> mantine -> tw_components -> tw_utilities`

### 2. postcss.config.js

To make it work, you also need to change the postcss config like this:

```diff
// postcss.config.js
module.exports = {
	plugins: {
		'postcss-import': {},
		'postcss-preset-mantine': {},
		// for tailwind
+		autoprefixer: {},
+		'tailwindcss/nesting': {},
+		tailwindcss: {},
	},
}
```

## Minimal template

Here's a minimal template that you can use to get started:

<https://github.com/songkeys/next-app-mantine-tailwind-template>

## License

MIT
