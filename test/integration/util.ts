import { exec, ExecException } from 'child_process';
import * as fs from 'fs';

export async function myExec(cmd: string, cwd: string): Promise<{ err: ExecException | null, stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject('Timeout!'), 20000);
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
  });
}

export const integrationPath = 'test/integration';
export const projectPath = `${integrationPath}/project`;
export const deployPath = `${projectPath}/deploy`;
export const expectedOutputPath = `${integrationPath}/output`;

export async function getIntegBranches() {
  setGitENV();
  const res = await myExec('git branch --list', projectPath);
  return res.stdout.split(/\s+/).filter(branch => {
    return !['master', '*', ''].includes(branch);
  });
}

export function setGitENV() {
  if (fs.existsSync(`${projectPath}/.git`)) {
    process.env.GIT_DIR = '.git';
  } else {
    process.env.GIT_DIR = '.notgit';
  }
  process.env.GIT_WORK_TREE = '.';
}
