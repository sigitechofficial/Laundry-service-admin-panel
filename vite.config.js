import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: 'LAUNDRY_', // Use LAUNDRY_ prefix for environment variables
  server: {
    host: true, // Listen on all addresses
    allowedHosts: [
      'unprolifically-unsuggestible-zackary.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok.app'
    ],
  },
});
