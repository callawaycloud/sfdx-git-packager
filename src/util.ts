import { spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import ignore from 'ignore';
import { join, resolve } from 'path';
import * as rimraf from 'rimraf';

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

export async function purgeFolder(targetDir: string): Promise<void> {
  const files = await fs.promises.readdir(targetDir);
  for (const file of files) {
    const stat = await fs.promises.stat(join(targetDir, file));
    if (stat.isDirectory()) {
      await purgeFolder(resolve(targetDir, file));
    } else {
      if (file.startsWith('.')) {
        continue;
      }
      const fPath = join(targetDir, file);
      await new Promise((res, rej) => {
        rimraf(fPath, err => {
          if (err) {
            rej(err);
          }
          res();
        });
      });
    }
  }
}
