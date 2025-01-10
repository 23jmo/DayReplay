/**
 * Base webpack config used across other specific configs
 */

import webpack from 'webpack';
import TsconfigPathsPlugins from 'tsconfig-paths-webpack-plugin';
import webpackPaths from './webpack.paths';
import { dependencies as externals } from '../../release/app/package.json';

const configuration: webpack.Configuration = {
  externals: [
    ...Object.keys(externals || {}).filter(
      dep => !['ffmpeg-static', 'get-windows'].includes(dep)
    ),
    'node-gyp',
    '@mapbox/node-pre-gyp'
  ],

  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },

  output: {
    path: webpackPaths.srcPath,
    library: {
      type: 'commonjs2',
    },
  },

  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx', '.mjs'],
    modules: [webpackPaths.srcPath, 'node_modules'],
    plugins: [new TsconfigPathsPlugins()],
  },

  experiments: {
    topLevelAwait: true,
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
  ],
};

export default configuration;
