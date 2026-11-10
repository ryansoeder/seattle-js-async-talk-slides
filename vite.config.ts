import { defineConfig } from 'vite'

// Workaround: @ktym4a/slidev-theme-ktym4a's uno.config.ts sets `content.filesystem`
// with a path relative to its own repo, which breaks UnoCSS in a real deck
// (Slidev's controls lose their styles, theme headings render invisible).
// Replace that content option: default file types + the theme's color constants.
export default defineConfig({
  slidev: {
    unocss: {
      content: {
        pipeline: {
          include: [
            /\.(vue|svelte|[jt]sx|vine.ts|mdx?|astro|elm|php|phtml|marko|html)($|\?)/,
            /slidev-theme-ktym4a\/constant\/theme\.ts$/,
          ],
        },
      },
    },
  },
})
