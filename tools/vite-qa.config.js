import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {buildVersionPlugin} from './build-version-plugin.mjs';
export default defineConfig({plugins:[buildVersionPlugin()],define:{__DUEL_QA__:'true'},build:{outDir:'.qa-dist',rollupOptions:{input:{game:fileURLToPath(new URL('../index.html',import.meta.url)),checks:fileURLToPath(new URL('./visual-check.html',import.meta.url)),contacts:fileURLToPath(new URL('./contact-check.html',import.meta.url)),updates:fileURLToPath(new URL('./update-check.html',import.meta.url)),menu:fileURLToPath(new URL('./menu-check.html',import.meta.url)),vehicles:fileURLToPath(new URL('./vehicle-art-check.html',import.meta.url)),audio:fileURLToPath(new URL('./audio-race-check.html',import.meta.url))}}},server:{hmr:false}});
