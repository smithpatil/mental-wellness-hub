import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Content-Security-Policy for the production build (not injected in dev, where Vite's HMR needs inline scripts).
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://ui-avatars.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const injectCsp = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('</head>', `    <meta http-equiv="Content-Security-Policy" content="${csp}" />
  </head>`),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), injectCsp()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
