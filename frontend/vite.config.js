import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React ecosystem vendor chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || 
                id.includes('react-dom') || 
                id.includes('react-router-dom')) {
              return 'vendor';
            }
            // Socket.io client chunk
            if (id.includes('socket.io-client')) {
              return 'socket';
            }
            // Baqi node_modules
            return 'vendor';
          }
        },
      },
    },
  },
});