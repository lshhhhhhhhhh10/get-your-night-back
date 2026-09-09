import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({base:'./',build:{outDir:'../assets/build',emptyOutDir:true,lib:{entry:resolve(import.meta.dirname,'main.js'),formats:['es'],fileName:()=> 'game.js'},rollupOptions:{output:{assetFileNames:'[name][extname]'}}}});
