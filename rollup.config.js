import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const external = [
  '@yeez-tech/meta-encryptor',
  'node-fetch',
  // Node builtins (and node: specifiers)
  'crypto',
  'node:crypto',
  'stream',
  'http',
  'https',
  'url',
  'zlib',
  'buffer',
];

export default [
  {
    input: 'src/index.js',
    output: { file: 'dist/index.cjs', format: 'cjs', exports: 'named' },
    plugins: [
      json(),
      resolve({ preferBuiltins: false }),
      commonjs({ transformMixedEsModules: true }),
    ],
    external,
  },
  {
    input: 'src/index.js',
    output: { file: 'dist/index.js', format: 'es', exports: 'named' },
    plugins: [
      json(),
      resolve({ preferBuiltins: false }),
      commonjs({ transformMixedEsModules: true }),
    ],
    external,
  },
];


