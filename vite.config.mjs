import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose both prefixes so FCM can use either LAUNDRY_FIREBASE_* or standard VITE_FIREBASE_* from .env
  envPrefix: ["LAUNDRY_", "VITE_"],
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
