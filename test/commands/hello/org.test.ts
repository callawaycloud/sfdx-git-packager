import * as fs from 'fs';
import { exec, ExecException } from 'child_process';
import * as assert from 'assert';
import * as rimraf from 'rimraf';

async function myExec(cmd:string):Promise<{err: ExecException | null, stdout: string, stderr: string}> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(), 10000);
    exec(cmd, (err, stdout, stderr) => {
      resolve({err, stdout, stderr});
    });
  });
}

function prep(projectPath: string) {
  if (!fs.existsSync(projectPath)) {
    console.error(`${projectPath} project path not found for prep, tests results not valid`)
  } else {
    process.chdir(projectPath);
    process.env.GIT_DIR = ".notgit"
    process.env.GIT_WORK_TREE = "."
    if (fs.existsSync('deploy')) {
      rimraf('deploy', (err) => {});
    }
  }
}

function cleanUp(projectPath: string) {
  if (fs.existsSync('deploy')) {
    rimraf('deploy', (err) => {});
  }
}
const proj_path = "test/projects/basic_change";
describe('git:package', () => {
  before(() => {
    prep(proj_path);
  });
  it('it builds a deployment with changed files', async () => {
    try {
      const res = await myExec('sfdx git:package -d deploy --purge');
      assert.equal(null, res.err);
      assert.ok(fs.existsSync("deploy/package.xml"));
    } catch (e) {
      assert.fail(e);
    }
  });
  after(() => {
    cleanUp(proj_path);
  });
});
