import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({build:{outDir:'.qa-dist',rollupOptions:{input:{game:fileURLToPath(new URL('../index.html',import.meta.url)),checks:fileURLToPath(new URL('./visual-check.html',import.meta.url))}}},server:{hmr:false}});
