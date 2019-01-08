const babel = require('rollup-plugin-babel')
const resolve = require('rollup-plugin-node-resolve')
const common = require('rollup-plugin-commonjs')

module.exports = [
  {
    input: 'src/when.js',
    output: { format: 'cjs', file: 'build/index.cjs.js' },
    plugins: [
      resolve({
        jail: './',
        preferBuiltins: true,
        extensions: ['.js', '.json', '.jsx']
      }),
      babel(),
      common({
        exclude: ['node_modules/**']
      })
    ]
  }
]
