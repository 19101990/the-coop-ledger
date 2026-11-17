import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa';

/** Geist + Geist Mono, Latin subset, upright: the only font files a normal page needs. */
const LATIN_FONT = /geist(-mono)?-latin-wght-normal-[\w-]+\.woff2$/;

/**
 * Adds <link rel="preload"> for the Latin font files to the built index.html. Without it the
 * browser only finds the fonts once the app has rendered text (~1.5s into a mobile load);
 * with it they download alongside the JavaScript. The file names are hashed, so this reads
 * them from the build output.
 */
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return; // dev server: nothing to preload
        return Object.keys(ctx.bundle)
          .filter((file) => LATIN_FONT.test(file))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head' as const,
          }));
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    preloadFonts(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        // Default app files, plus the two Latin fonts so the app keeps its font offline.
        globPatterns: ['**/*.{js,css,html}', 'assets/geist-latin-wght-normal-*.woff2', 'assets/geist-mono-latin-wght-normal-*.woff2'],
      },
      // Precache the icons referenced from index.html (the manifest icons are added automatically).
      includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'The Coop',
        short_name: 'The Coop',
        description: 'Internal farm management ledger',
        // Status/title bar matches the app's light header; the launch splash uses the icon's dark ink.
        theme_color: '#f8f8f9',
        background_color: '#18181b',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            // Full-bleed version Android can crop to circles/squircles without clipping the egg.
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})