/**
 * Base webpack config used across other specific configs
 */

import path from 'path';
import TsconfigPathsPlugins from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';
import { TsMetaPlugin } from '../../plugins/TsMetaPlugin';
import { dependencies as externals } from '../../release/app/package.json';
import webpackPaths from './webpack.paths';
const Dotenv = require('dotenv-webpack');

const configuration: webpack.Configuration = {
  // packages that is not included in the bundle
  externals: [
    ...Object.keys(externals || {}),
    {
      fsevents: "require('fsevents')",
    },
  ],

  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules\/(?!(@tagspacespro)\/).*/,
        use: {
          loader: 'ts-loader',
          options: {
            // Remove this line to enable type checking in webpack builds
            transpileOnly: true,
            // experimentalWatchApi: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      },
      // Don't require fully-specified extensions for ESM (.mjs) imports.
      // @mui/material@9's .mjs files import e.g. 'react-transition-group/
      // TransitionGroupContext' without a file extension; webpack's strict ESM
      // resolution otherwise fails them (broke build:dll and the prod renderer
      // build). Lives in the base config so every config that merges it —
      // renderer dev/prod, main, and the DLL (which borrows renderer.dev's
      // merged module) — inherits the fix. (capacitor/web carry their
      // own equivalent copy.)
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
    // https://github.com/webpack/webpack/issues/1114
    library: {
      type: 'commonjs2',
    },
    // globalObject: 'this',
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [webpackPaths.srcPath, 'node_modules'],
    // Pin react / react-dom to the renderer's own copies. Without this, an
    // external perspective package symlinked into release/app/node_modules
    // (via `npm run link4dev` from extensions-pro) would walk up looking
    // for react from outside the tagspaces tree and either fail or — worse
    // — load a duplicate React instance, breaking hooks. The aliases force
    // every `require('react')` / `require('react-dom')` in symlinked
    // packages to resolve to the host renderer's copy, guaranteeing a
    // single React runtime across all dynamically imported chunks.
    alias: {
      react: path.resolve(webpackPaths.rootPath, 'node_modules', 'react'),
      'react-dom': path.resolve(
        webpackPaths.rootPath,
        'node_modules',
        'react-dom',
      ),
    },
    plugins: [new TsconfigPathsPlugins()],
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      // Set to 'true' by the builder for the billing-free Lite Android APK,
      // where the in-app-purchase plugin is stripped (see services/iap.ts).
      TS_DISABLE_IAP: '',
    }),
    new Dotenv({
      path: path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        '@tagspaces/tagspaces-common/default.env',
      ),
    }),
    new TsMetaPlugin(),
  ],
};

export default configuration;
