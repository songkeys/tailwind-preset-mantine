# tailwind-preset-mantine

[![npm version](https://img.shields.io/npm/v/tailwind-preset-mantine.svg)](https://www.npmjs.com/package/tailwind-preset-mantine)

A Tailwind CSS preset for seamless integration with Mantine UI components.

## Installation

```bash
npm install tailwind-preset-mantine
```

## Usage

To use the preset in your Tailwind CSS configuration, add it to the `presets` array:

```ts
// tailwind.config.ts
import tailwindPresetMantine from 'tailwind-preset-mantine';

export default {
	presets: [
		tailwindPresetMantine,
	],
};
```

If you have a custom mantine theme (https://mantine.dev/theming/theme-object/), you should pass it as an option to make custom colors available to tailwind.

```ts
import tailwindPresetMantine from 'tailwind-preset-mantine'
import { createTheme } from '@mantine/core';

const mantineTheme = createTheme({
	// ...your custom theme
});

export default {
	presets: [tailwindPresetMantine({ mantineTheme })],
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
> Note that here we setup tailwind slightly different from [the official docs](https://arc.net/l/quote/eifghbsm). We use the [CSS `@layer` directive](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to control the order of the css. This is because we want to make sure that the mantine styles doesn't get overridden by tailwind reset (tw_base). In this case, the order is `tw_base -> mantine -> tw_components -> tw_utilities`

### 2. postcss.config.js

To make it work, you also need to change the postcss config like this:

```diff
// postcss.config.js
module.exports = {
	plugins: {
		'postcss-import': {},
		'postcss-preset-mantine': {},
		'postcss-simple-vars': {
			variables: {
				'mantine-breakpoint-xs': '36em',
				'mantine-breakpoint-sm': '48em',
				'mantine-breakpoint-md': '62em',
				'mantine-breakpoint-lg': '75em',
				'mantine-breakpoint-xl': '88em',
			},
		},

		// for tailwind
+ autoprefixer: {},
+ 'tailwindcss/nesting': {},
+ tailwindcss: {},
	},
}
```

## License

MIT
