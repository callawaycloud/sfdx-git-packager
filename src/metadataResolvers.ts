import { extname } from 'path';
import { getFiles } from './util';

const AURA_REGEX = /(.*\/aura\/.*)\/.*/;

interface MetadataResolver {
  match: ((path: string) => boolean) | RegExp;
  getMetadataPaths: (path: string) => Promise<string[]>;
}

// order from most selective to least
const metadataResolvers: MetadataResolver[] = [
  {
    match: path => {
      return ['.cls', '.trigger', '.page', '.component'].includes(extname(path));
    },
    getMetadataPaths: async (path: string) => {
      return [path, path + '-meta.xml'];
    }
  },
  {
    match: path => {
      return path.endsWith('-meta.xml');
    },
    getMetadataPaths: async (path: string) => {
      return [path];
    }
  },
  {
    match: AURA_REGEX,
    getMetadataPaths: async (path: string) => {
      const appDir = AURA_REGEX.exec(path)[1];
      return (await getFiles(appDir));
    }
  }
];

export function resolveMetadata(path: string) {
  for (const resolver of metadataResolvers) {
    const isMatch = resolver.match instanceof RegExp ? resolver.match.test(path) : resolver.match(path);
    if (isMatch) {
      return resolver.getMetadataPaths(path);
    }
  }
  return null;
}
