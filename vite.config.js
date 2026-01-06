import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const clientPort = Number(env.VITE_DEV_SERVER_PORT || 5000)
  const backendHost = env.BACKEND_HOST || 'localhost'
  const backendPort = Number(env.BACKEND_PORT || env.VITE_BACKEND_PORT || 8001)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: clientPort,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: `http://${backendHost}:${backendPort}`,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})

