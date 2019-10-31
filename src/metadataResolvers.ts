import { extname } from 'path';
import { getFilesFromRef } from './util';

// these need to be re-written for windows... maybe use globs instead
const AURA_REGEX = /(.*\/aura\/\w*)\/.*/;
const LWC_REGEX = /(.*\/lwc\/\w*)\/.*/;
const COMP_META = /.*(.cls|\.trigger|\.page|\.component)-meta.xml/;
const STATIC_RESOURCE_FOLDER_REGEX = /(.*\/staticresources\/\w*)\/.*/;
const STATIC_RESOURCE_FILE_REGEX = /(.*\/staticresources\/\w*)\.\w*/;

interface MetadataResolver {
  match: ((path: string) => boolean) | RegExp;
  getMetadataPaths: (path: string, ref: string) => Promise<string[]>;
  getIsDirectory: () => boolean;
}

// order from most selective to least
const metadataResolvers: MetadataResolver[] = [
  { // MD that has paired -meta.xml file.  Probably missing some types
    match: path => {
      return ['.cls', '.trigger', '.page', '.component'].includes(extname(path));
    },
    getMetadataPaths: async (path: string) => {
      return [path, path + '-meta.xml'];
    },
    getIsDirectory: () => false
  },
  { // reverse of above rule
    match: COMP_META,
    getMetadataPaths: async (path: string, ref: string) => {
      return [path, path.replace('-meta.xml', '')];
    },
    getIsDirectory: () => false
  },
  { // other metadata
    match: path => {
      return path.endsWith('-meta.xml');
    },
    getMetadataPaths: async (path: string, ref: string) => {
      return [path];
    },
    getIsDirectory: () => false
  },
  { // aura bundles
    match: AURA_REGEX,
    getMetadataPaths: async (path: string, ref: string) => {
      const appDir = AURA_REGEX.exec(path)[1];
      return await getFilesFromRef(appDir, ref);
    },
    getIsDirectory: () => true
  },
  { // lwc bundles
    match: LWC_REGEX,
    getMetadataPaths: async (path: string, ref: string) => {
      const appDir = LWC_REGEX.exec(path)[1];
      return await getFilesFromRef(appDir, ref);
    },
    getIsDirectory: () => true
  },
  { // decompressed static resource (folders)
    match: STATIC_RESOURCE_FOLDER_REGEX,
    getMetadataPaths: async (path: string, ref: string) => {
      const appDir = STATIC_RESOURCE_FOLDER_REGEX.exec(path)[1];
      return [...await getFilesFromRef(appDir, ref), `${appDir}.resource-meta.xml`];
    },
    getIsDirectory: () => true
  },
  { // static resource (single files)
    match: STATIC_RESOURCE_FILE_REGEX,
    getMetadataPaths: async (path: string) => {
      const baseName = STATIC_RESOURCE_FILE_REGEX.exec(path)[1];
      return [path, `${baseName}.resource-meta.xml`];
    },
    getIsDirectory: () => false
  }
];

export function getResolver(path: string) {
  for (const resolver of metadataResolvers) {
    const isMatch = resolver.match instanceof RegExp ? resolver.match.test(path) : resolver.match(path);
    if (isMatch) {
      return resolver;
    }
  }
  return null;
}

// given a path, return all other paths that must be included along side for a valid deployment
export function resolveMetadata(path: string, ref: string) {
  const resolver = getResolver(path);
  return resolver && resolver.getMetadataPaths(path, ref);
}
