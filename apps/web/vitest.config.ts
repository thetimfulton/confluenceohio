import { defineConfig } from 'vitest/config';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Lightweight plugin that transforms JSX in .tsx files using esbuild.
 * Needed because Next.js tsconfig has jsx: "preserve" which prevents
 * rolldown from transforming JSX in test files.
 */
function jsxTransform(): Plugin {
  return {
    name: 'vitest-jsx-transform',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.tsx')) return null;
      const { transform } = await import('esbuild');
      const result = await transform(code, {
        loader: 'tsx',
        jsx: 'automatic',
        jsxImportSource: 'react',
        sourcefile: id,
        sourcemap: true,
      });
      return { code: result.code, map: result.map };
    },
  };
}

export default defineConfig({
  plugins: [jsxTransform()],
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
});
