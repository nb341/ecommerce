import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { defineConfig } from 'vite';

// Dev server proxies /api to the API so requests stay same-origin (no CORS), matching the nginx
// proxy in the production image. Default target is the `http` launch profile / compose API port.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:5277';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    proxy: {
      '/api': { target: apiProxyTarget, changeOrigin: true },
    },
  },
});
