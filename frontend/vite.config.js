import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
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
    // Optimize for production with better code splitting
    rollupOptions: {
      output: {
        // Manual chunks for better caching and parallel loading
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core'
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
          // Chart libraries (heavy, load separately)
          if (id.includes('node_modules/chart.js') || 
              id.includes('node_modules/react-chartjs-2') || 
              id.includes('node_modules/recharts')) {
            return 'charts'
          }
          // i18n libraries
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n'
          }
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'date-utils'
          }
          // Icons (can be large)
          if (id.includes('node_modules/react-icons')) {
            return 'icons'
          }
          // Other vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Enable minification (using esbuild - faster and built into Vite)
    minify: 'esbuild',
    // esbuild automatically removes console.log in production builds
    // Increase chunk size warning limit (for better splitting)
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
