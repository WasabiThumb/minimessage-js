import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';

// For some reason importing these from
// package.json doesn't work
const pkg = {
    "main": "dist/minimessage.cjs.js",
    "module": "dist/minimessage.esm.js",
    "browser": "dist/minimessage.umd.js",
};

export default [
    // UMD build for the browser
    {
        input: './src/index.ts',
        output: {
            name: 'adventure',
            file: pkg.browser,
            format: 'umd'
        },
        plugins: [
            resolve(),
            commonjs(),
            esbuild()
        ]
    },

    // CJS and ESM build for Node
    {
        input: './src/index.ts',
        external: [],
        output: [
            { file: pkg.main, format: 'cjs' },
            { file: pkg.module, format: 'es' }
        ],
        plugins: [
            esbuild()
        ]
    }
];
