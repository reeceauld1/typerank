import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Set by the GitHub Pages workflow to "/<repo-name>/" for project pages;
  // defaults to root for local dev and any other deployment target.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(),
     tailwindcss(),
  ],
})
