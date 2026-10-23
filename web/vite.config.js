import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps the build deployable from any path (GitHub Pages, Netlify, Vercel, S3).
// The library lives one level up, so let the dev server read from there.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
