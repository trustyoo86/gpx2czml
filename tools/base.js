'use strict';

const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    gpx2czml: path.join(__dirname, '..', 'src', 'gpx2czml.js'),
  },
  output: {
    path: path.join(__dirname, '..', 'dist'),
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