import type { Configuration } from 'webpack';
import { merge }              from 'webpack-merge';
import grafanaConfig          from './.config/webpack/webpack.config';

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const config = async (env: any): Promise<Configuration> => {
	const baseConfig = await grafanaConfig(env);

	const extendedConfig = {
		entry: {
			module: './module.ts',
		},
		resolve: {
			plugins: [
				new TsconfigPathsPlugin()
			],
		}
	};

	return merge(baseConfig, extendedConfig);
};

export default config;
