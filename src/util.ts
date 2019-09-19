import { spawn } from 'child_process';
import * as fs from 'fs';
import { join, resolve } from 'path';

import ignore from 'ignore';

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

export function spawnPromise(cmd: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const diffProcess = spawn(cmd, args);
    let stdo = '';
    let err = '';
    diffProcess.stdout.on('data', d => stdo += d.toString());

    diffProcess.stderr.on('data', d => err += d.toString());

    diffProcess.on('exit', code => {
      if (code === 0) {
        return resolve(stdo);
      }
      reject(err);
    });
  });
}

export async function copyFileFromRef(path: string, ref: string, destination: string) {
  const source = await spawnPromise('git', ['show', `${ref}:${path}`]);
  await fs.promises.writeFile(destination, source);
}

export async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });

  const files = [];
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(await getFiles(res));
    } else {
      files.push(res);
    }

  }

  return Array.prototype.concat(...files);
}
