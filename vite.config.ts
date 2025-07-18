import { defineConfig, loadEnv } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'path'

const envName = process.env.CFG ?? 'development'
const modeEnv = loadEnv(envName, process.cwd())
const base = modeEnv.VITE_BASE ?? ''

export default defineConfig({
  base,
  plugins: [solidPlugin(),
    basicSsl()
  ],
  server: {
    host: '0.0.0.0',
    port: 3003,
    // https: true
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, "./index.html"),
        launcher: resolve(__dirname, './launcher.html')
      },
    },
    target: 'esnext',
    outDir: '../pages/rgwl'
  },
});
