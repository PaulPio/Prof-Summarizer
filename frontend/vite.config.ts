import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@shared-list-models': path.resolve(__dirname, '../backend/supabase/functions/_shared/list-models-utils.ts'),
        },
      },
      test: {
        environment: 'node',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
      },
    };
});
