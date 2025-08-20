import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      // Proxies API requests to the backend server during development.
      // For example, a request to /api/pictures will be forwarded to http://localhost:8000/pictures
      '/api': {
        target: 'http://localhost:8000', // Your backend server
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api/, ''), // Removes /api from the start of the path
      },
    }
  }
});
