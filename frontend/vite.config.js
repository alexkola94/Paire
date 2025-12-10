import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['paire-favicon.svg'],
      manifest: {
        name: 'Paire - Expense Manager',
        short_name: 'Paire',
        description: 'Shared expense tracking for couples',
        theme_color: '#6c5ce7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // Base path for GitHub Pages deployment
  // Use '/' for development, '/Paire/' for production
  base: mode === 'production' ? '/Paire/' : '/',
  server: {
    port: 3000,
    host: true, // Listen on all network interfaces (0.0.0.0)
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Disable manual chunking to avoid circular dependency issues
    // Let Vite handle automatic code splitting
    rollupOptions: {
      output: {
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Enable minification (using esbuild - faster and built into Vite)
    minify: 'esbuild',
    // esbuild is built into Vite, no additional dependencies needed
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
      ]
    }
  }
}))
