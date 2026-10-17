import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    base: process.env.VITE_BASE_URL || '/',
    server: {
        port: 5173,
        open: true,
    },
    preview: {
        port: 5174,
        host: '0.0.0.0',
        open: false,
    },
});
