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
    // Optimize for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
        }
      }
    }
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
