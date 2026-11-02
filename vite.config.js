import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      // Browser downloads can be temporarily locked on Windows. Generated files
      // are not app sources and must not be watched (or trigger HMR).
      ignored: ['**/output', '**/output/**', '**/tmp/pdfs', '**/tmp/pdfs/**'],
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
