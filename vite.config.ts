import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' so the built site works from the GitHub Pages sub-path
// (https://prashantkr0923-commits.github.io/einvoice-prototype-uae/).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
