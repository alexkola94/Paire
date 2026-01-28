import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    include: ['react-map-gl/mapbox', 'mapbox-gl', 'react-window']
  },
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
  base: '/',
  server: {
    port: 3000,
    host: true, // Listen on all network interfaces (0.0.0.0)
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5038',
        changeOrigin: true,
        secure: false
      },
      '/swagger': {
        target: 'http://localhost:5038',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Stable vendor chunks for better long-term cache reuse
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('mapbox-gl') || id.includes('react-map-gl')) {
              return 'vendor-mapbox'
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
          }
        }
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
