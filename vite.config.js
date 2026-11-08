import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildThemeCss } from './src/data/design.js';

const virtualId = 'virtual:design-tokens.css';
const resolvedVirtualId = `\0${virtualId}`;

function designTokens() {
  return {
    name: 'design-tokens',
    resolveId(id) {
      if (id === virtualId) return resolvedVirtualId;
      return null;
    },
    load(id) {
      if (id === resolvedVirtualId) return buildThemeCss();
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), designTokens()],
  build: {
    target: 'es2020',
  },
});
