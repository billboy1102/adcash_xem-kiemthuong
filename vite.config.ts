import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.CAPACITOR_BUILD
  ? './'
  : process.env.GITHUB_ACTIONS
    ? '/adcash_xem-kiemthuong/'
    : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
