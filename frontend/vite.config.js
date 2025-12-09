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
        // Simplified chunking strategy to avoid circular dependency issues
        manualChunks: (id) => {
          // Only split out very large libraries to avoid initialization issues
          if (id.includes('node_modules')) {
            // React and React DOM together (they depend on each other)
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor'
            }
            // Chart libraries (heavy, load separately)
            if (id.includes('node_modules/chart.js') || 
                id.includes('node_modules/react-chartjs-2') || 
                id.includes('node_modules/recharts')) {
              return 'charts'
            }
            // Everything else in one vendor chunk to avoid circular deps
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
    // esbuild is built into Vite, no additional dependencies needed
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
