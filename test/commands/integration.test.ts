import * as fs from 'fs';
import { exec, ExecException } from 'child_process';
import * as assert from 'assert';
import * as rimraf from 'rimraf';
import { compareSync } from 'dir-compare';

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
async function runTest(testName: string) {
  const sourceRef = testName;
  const targetRef = `${testName}^`;
  const expectedOutputDir = testName;
  console.log(targetRef, sourceRef, expectedOutputDir);
  try {
    const res = await myExec(`sfdx git:package -d deploy --purge -s ${sourceRef} -t ${targetRef}`);
    assert.equal(null, res.err);
    const compareRes = compareSync("deploy", `../output/${expectedOutputDir}`, { compareContent: true });
    assert.strictEqual(compareRes.distinct, 0);
    assert.strictEqual(compareRes.equal, 4);
  } catch (e) {
    assert.fail(e);
  }
}
const testProjPath = "test/project";
describe('git:package', () => {
  before(() => {
    prep(testProjPath);
  });
  it('it builds a deployment with changed files', async () => {
    await runTest('update_class');
  });
  after(() => {
    cleanUp(testProjPath);
  });
});
