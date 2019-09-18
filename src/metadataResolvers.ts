import { basename, extname } from 'path';
import { getFiles } from './util';

const AURA_REGEX = /(.*\/aura\/\w*)\/.*/;
const COMP_META = /.*(.cls|\.trigger|\.page|\.component)-meta.xml/;
const STATIC_RESOURCE_FOLDER_REGEX = /(.*\/staticresources\/\w*)\/.*/;
const STATIC_RESOURCE_FILE_REGEX = /(.*\/staticresources\/\w*)\.\w*/;

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
    match: COMP_META,
    getMetadataPaths: async (path: string) => {
      return [path, path.replace('-meta.xml', '')];
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
      return await getFiles(appDir);
    }
  },
  {
    match: STATIC_RESOURCE_FOLDER_REGEX,
    getMetadataPaths: async (path: string) => {
      const appDir = STATIC_RESOURCE_FOLDER_REGEX.exec(path)[1];
      console.log(appDir);
      return [...await getFiles(appDir), `${appDir}.resource-meta.xml`];
    }
  },
  {
    match: STATIC_RESOURCE_FILE_REGEX,
    getMetadataPaths: async (path: string) => {
      const baseName = STATIC_RESOURCE_FILE_REGEX.exec(path)[1];
      return [path, `${baseName}.resource-meta.xml` ];
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
