import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
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