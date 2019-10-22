import * as fs from 'fs';
import { exec } from 'child_process';
import * as assert from 'assert';

async function myExec(cmd:string) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(), 10000);
    exec(cmd, (err, stdout, stderr) => {
      resolve({err, stdout, stderr});
    });
  });
}

function turnGitOn(dir: string) {
  process.chdir(dir);
  fs.renameSync('.notgit','.git');
}

function turnGitOff() {
  fs.renameSync('.git','.notgit');
}
const proj_path = "test/projects/basic_change";
describe('git:package', () => {
  before(() => {
    turnGitOn(proj_path);
  });
  it('it builds a deployment with changed files', async () => {
    try {
      const res = await myExec('sfdx git:package -d deploy --purge');
      assert.ok(fs.existsSync("deploy/package.xml"));
    } catch (e) {
      assert.fail(e);
    }
  });
  after(() => {
    turnGitOff();
  });
});
