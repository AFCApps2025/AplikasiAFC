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
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://xjzrrxmrgxuebimvkxhp.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqenJyeG1yZ3h1ZWJpbXZreGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTUwODIsImV4cCI6MjA3MTE5MTA4Mn0.ntXRlLylqiJfA5NbGet1h0977CXPHVCE_G-9OM5R0Wg'),
    'module': {},
    'exports': {},
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
      external: [],
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    chunkSizeWarningLimit: 3000,
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-dom/client',
      'react/jsx-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'date-fns',
      'clsx',
      'lucide-react'
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
});