import { defineConfig } from 'vite';
export default defineConfig({worker:{format:'es'},build:{target:'es2022',chunkSizeWarningLimit:1200},server:{host:'0.0.0.0'}});
