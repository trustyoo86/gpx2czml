'use strict';

const webpack = require('webpack');
const path = require('path');

const absolutePath = path.join(__dirname, '..');

module.exports = {
  entry: {
    gpx2czml: path.resolve(absolutePath, 'src', 'gpx2czml.js'),
  },
  output: {
    path: path.resolve(absolutePath, 'dist'),
    libraryTarget: 'umd',
    library: 'gpx2czml',
    libraryExport: 'default',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader'
          },
        ],
      },
    ],
  },
};