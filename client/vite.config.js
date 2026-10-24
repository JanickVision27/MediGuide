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
    // Proxy API calls to the deployed Node backend so the browser always uses
    // relative /api URLs. In production the same proxy is defined in
    // client/vercel.json, which keeps API calls same-origin (no CORS/cookie issues).
    proxy: {
      '/api': {
        // Use http://localhost:5000 instead when running the API locally.
        target: 'https://mediguide-0a1e.onrender.com',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
    // `vite preview` serves the production build, which uses the relative /api
    // base, so mirror the dev proxy here as well.
    proxy: {
      '/api': {
        target: 'https://mediguide-0a1e.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})