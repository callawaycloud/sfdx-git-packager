import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { resolve } from 'path';

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
  await fs.writeFile(destination, source);
}

export async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = dirents.map(dirent => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  });
  return Array.prototype.concat(...files);
}
