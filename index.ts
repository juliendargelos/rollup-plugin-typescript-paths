import { join } from 'path';
import { CompilerOptions, findConfigFile, nodeModuleNameResolver, sys } from 'typescript';

export const resolveTypescriptPaths = ({
	tsConfigPath = findConfigFile('./', sys.fileExists),
	absolute = true,
	transform,
}: Options = {}) => {
	const { compilerOptions, outDir } = getTsConfig(tsConfigPath);

	return {
		name: 'resolve-typescript-paths',
		resolveId: (importee: string, importer: string) => {
			if (importee.startsWith('\0') || !compilerOptions.paths) {
				return null;
			}

			const hasMatchingPath = Object.keys(compilerOptions.paths).some(path =>
				new RegExp(path.replace('*', '\\w*')).test(importee),
			);

			if (!hasMatchingPath) {
				return null;
			}

			const { resolvedModule } = nodeModuleNameResolver(importee, importer, compilerOptions, sys);

			if (!resolvedModule) {
				return null;
			}

			const { resolvedFileName } = resolvedModule;

			if (!resolvedFileName || resolvedFileName.endsWith('.d.ts')) {
				return null;
			}

			const jsFileName = join(outDir, resolvedFileName.replace(/\.tsx?$/i, '.js'));

			let resolved = absolute ? sys.resolvePath(jsFileName) : jsFileName;

			if (transform) {
				resolved = transform(resolved);
			}

			return resolved;
		},
	};
};

const getTsConfig = (configPath?: string): TsConfig => {
	const defaults: TsConfig = { compilerOptions: {}, outDir: '.' };

	if (!configPath) {
		return defaults;
	}

	const configJson = sys.readFile(configPath);

	if (!configJson) {
		return defaults;
	}

	const config: Partial<TsConfig> = JSON.parse(configJson);

	return { ...defaults, ...config };
};

export interface Options {
	/**
	 * Custom path to your `tsconfig.json`. Use this if the plugin can't seem to
	 * find the correct one by itself.
	 */
	tsConfigPath?: string;

	/**
	 * Whether to resolve to absolute paths or not; defaults to `true`.
	 */
	absolute?: boolean;

	/**
	 * If the plugin successfully resolves a path, this function allows you to
	 * hook into the process and transform that path before it is returned.
	 */
	transform?(path: string): string;
}

interface TsConfig {
	compilerOptions: CompilerOptions;
	outDir: string;
}
