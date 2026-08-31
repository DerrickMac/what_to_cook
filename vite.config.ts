import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Bind to the network too, so you can open it on your phone.
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
