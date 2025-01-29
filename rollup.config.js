import typescript from '@rollup/plugin-typescript';

export default [
  {
    // ESM build
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es'
    },
    plugins: [typescript()]
  },
  {
    // CommonJS build
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs'
    },
    plugins: [typescript()]
  },
  {
    // UMD build (for browsers)
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'YourLibraryName'
    },
    plugins: [typescript()]
  }
];