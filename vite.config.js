import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5173,
        open: true,
        cors: true
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'three': ['three'],
                    'mediapipe': ['@mediapipe/hands', '@mediapipe/camera_utils', '@mediapipe/drawing_utils']
                }
            }
        }
    },
    optimizeDeps: {
        include: ['three', '@mediapipe/hands', '@mediapipe/camera_utils', '@mediapipe/drawing_utils']
    }
});
