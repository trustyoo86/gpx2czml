/**
 * gpx2czml bundling webpack config
 */
'use strict';

const webpack = require('webpack');
const path = require('path');

// dev & prod mode
const isProd = (process.NODE_ENV === 'production');

// webpack config
const config = {
  entry: {
    'gpx2czml': path.resolve(__dirname, 'src', 'gpx2czml.ts'),
  },
  output: {
    filename: isProd ? '[name].min.js' : '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: isProd ? null : 'source-map',
  resolve: {
    extensions: ['.webpack.js', '.web.js', '.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          'awesome-typescript-loader'
        ]
      }
    ]
  },
  plugins: []
};

// uglify
if (isProd) {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin()
  );
}

module.exports = config;