import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all interfaces so the app is reachable from preview/proxy hosts.
    host: '0.0.0.0',
    port: 5173,
    // Accept requests forwarded from a tunnel/preview hostname.
    allowedHosts: true,
    // Proxy API calls to the Node backend and keep the
    // browser on relative URLs (never call localhost from browser code).
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Pointed to your Node backend port
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})