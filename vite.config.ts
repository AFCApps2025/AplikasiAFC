import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    open: true,
    proxy: {
      '/api/sheets-sync': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sheets-sync/, '/src/api/sheets-sync')
      }
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/AplikasiAFC/',
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast'],
          supabase: ['@supabase/supabase-js'],
          utils: ['date-fns', 'clsx', 'class-variance-authority'],
          icons: ['lucide-react'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query']
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    target: ['es2020', 'chrome80', 'firefox78', 'safari14'],
    polyfillModulePreload: false,
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@tanstack/react-query',
      'date-fns',
      'clsx',
      'lucide-react'
    ],
    exclude: ['@supabase/supabase-js']
  },
});