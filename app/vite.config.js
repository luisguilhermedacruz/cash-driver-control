import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração do Vite: o plugin do React transforma os arquivos .jsx em JavaScript que o navegador entende.
export default defineConfig({
  plugins: [react()],
})
