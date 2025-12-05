import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // O Vite expõe automaticamente variáveis iniciadas com VITE_ em import.meta.env
  // Não é necessário usar o bloco 'define' para process.env a menos que esteja usando
  // bibliotecas legadas que dependam estritamente dele.
  define: {
    'process.env': {} // Fallback seguro para bibliotecas antigas que possam acessar process.env
  }
});