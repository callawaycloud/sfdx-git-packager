import { extname } from 'path';
import { transformCustomLabels } from './transforms/labels';
import { getDirChildrenFromRef, getFileFromRef } from './util';

// these need to be re-written for windows... maybe use globs instead
const AURA_REGEX = /(.*\/aura\/\w*)\/.*/;
const LWC_REGEX = /(.*\/lwc\/\w*)\/.*/;
const COMP_META = /.*(.cls|\.trigger|\.page|\.component)-meta.xml/;
const STATIC_RESOURCE_FOLDER_REGEX = /(.*\/staticresources\/\w*)\/.*/;
const STATIC_RESOURCE_FILE_REGEX = /(.*\/staticresources\/\w*)\.\w*/;

export type ResolvedSource = {path: string, source: string};

interface MetadataResolver {
  match: ((path: string) => boolean) | RegExp;
  getMetadataPaths: (path: string, ref: string) => Promise<string[]>;
  getIsDirectory: () => boolean;
  transform?: (newSource: string, oldSource: string) => Promise<string>;
}

// order from most selective to least
const metadataResolvers: MetadataResolver[] = [
  { // MD that has paired -meta.xml file.  Probably missing some types
    match: path => {
      return ['.cls', '.trigger', '.page', '.component', '.email'].includes(extname(path));
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
  { // labels
    match: path => {
      return path.endsWith('labels-meta.xml');
    },
    getMetadataPaths: async (path: string, ref: string) => {
      return [path];
    },
    getIsDirectory: () => false,
    transform: async (newSource: string, oldSource: string) => {
      return transformCustomLabels(newSource, oldSource);
    }
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
      return await getDirChildrenFromRef(appDir, ref);
    },
    getIsDirectory: () => true
  },
  { // lwc bundles
    match: LWC_REGEX,
    getMetadataPaths: async (path: string, ref: string) => {
      const appDir = LWC_REGEX.exec(path)[1];
      return await getDirChildrenFromRef(appDir, ref);
    },
    getIsDirectory: () => true
  },
  { // decompressed static resource (folders)
    match: STATIC_RESOURCE_FOLDER_REGEX,
    getMetadataPaths: async (path: string, ref: string) => {
      const appDir = STATIC_RESOURCE_FOLDER_REGEX.exec(path)[1];
      return [...await getDirChildrenFromRef(appDir, ref), `${appDir}.resource-meta.xml`];
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
export async function resolveMetadata(path: string, sourceRef: string, targetRef: string) {
  const resolver = getResolver(path);
  if (resolver) {
    const paths = await resolver.getMetadataPaths(path, sourceRef);
    const resolved: ResolvedSource[] = [];
    for (path of paths) {
      let source: string;
      if (resolver.transform) {
        const newSource = await getFileFromRef(path, sourceRef);
        const oldSource = await getFileFromRef(path, targetRef);
        source = await resolver.transform(newSource, oldSource);
      } else {
        source = await getFileFromRef(path, sourceRef);
      }

      if (source) {
        resolved.push({
          path,
          source
        });
      }
    }
    return resolved;
  }
}
