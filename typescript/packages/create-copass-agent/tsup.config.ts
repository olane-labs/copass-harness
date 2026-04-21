import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2022',
  dts: false,
});
