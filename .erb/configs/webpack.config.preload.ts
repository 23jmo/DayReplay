import path from 'path';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import baseConfig from './webpack.config.base';

const configuration: webpack.Configuration = {
  devtool: 'inline-source-map',
  mode: 'development',
  target: 'electron-preload',
  entry: {
    preload: path.join(__dirname, '../../src/preload.ts'),
  },
  output: {
    path: path.join(__dirname, '../../.erb/dll'),
    filename: '[name].js',
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
};

export default merge(baseConfig, configuration);
