import { spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import ignore from 'ignore';
import { join, resolve } from 'path';

const PKG_IGNORE = '.packageIgnore';

export async function getIgnore(projectRoot: string) {
  const ig = ignore();
  const ignorePath = join(projectRoot, PKG_IGNORE);
  if (fs.existsSync(ignorePath)) {
    const file = await (await fs.promises.readFile(ignorePath)).toString();
    ig.add(file);
  }

  return ig;
}

export function spawnPromise(cmd: string, args: string[], options?: SpawnOptions) {
  return new Promise<string>((res, reject) => {
    const diffProcess = spawn(cmd, args, options);
    let stdo = '';
    let err = '';
    diffProcess.stdout.on('data', d => stdo += d.toString());

    diffProcess.stderr.on('data', d => err += d.toString());

    diffProcess.on('exit', code => {
      if (code === 0) {
        return res(stdo);
      }
      reject(err);
    });
  });
}

export async function copyFileFromRef(path: string, ref: string, destination: string) {
  const source = await getFileFromRef(path, ref);
  await fs.promises.writeFile(destination, source);
}

export async function getFileFromRef(path: string, ref: string) {
  return await spawnPromise('git', ['show', `${ref}:${path}`]);
}

export async function getDirChildrenFromRef(dir: string, ref: string): Promise<string[]> {
  // probably a better way to check if the file exists
  try {
    return (await spawnPromise('git', ['ls-tree', '-r', '--name-only', `${ref}:${dir}`]))
      .split('\n')
      .filter(f => f)
      .map(fPath => join(dir, fPath));
  } catch (e) {
    return [];
  }
}

export async function purgeFolder(targetDir: string): Promise<void> {
  const files = await fs.promises.readdir(targetDir);
  for (const file of files) {
    const stat = await fs.promises.stat(join(targetDir, file));
    if (stat.isDirectory()) {
      await purgeFolder(resolve(targetDir, file));
      await fs.promises.rmdir(resolve(targetDir, file));
    } else {
      await fs.promises.unlink(join(targetDir, file));
    }
  }
}
