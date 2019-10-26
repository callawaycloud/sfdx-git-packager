// import * as fs from 'fs';
import { exec, ExecException } from 'child_process';
import * as assert from 'assert';
import { compareSync } from 'dir-compare';

const testProjPath = "test/integration/project";
async function myExec(cmd:string):Promise<{err: ExecException | null, stdout: string, stderr: string}> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(), 10000);
    exec(cmd, { cwd: testProjPath }, (err, stdout, stderr) => {
      resolve({err, stdout, stderr});
    });
  });
}

async function runTest(testName: string) {
  const sourceRef = testName;
  const targetRef = `${testName}^`;
  const expectedOutputDir = testName;
  try {
    const res = await myExec(`sfdx git:package -d deploy --purge -s ${sourceRef} -t ${targetRef}`);
    assert.equal(null, res.err);
    const compareRes = compareSync("test/integration/project/deploy", `test/integration/output/${expectedOutputDir}`, { compareContent: true });
    assert.strictEqual(compareRes.distinct, 0);
    assert.strictEqual(true, compareRes.equal > 0);
  } catch (e) {
    assert.fail(e);
  }
}

describe('git:package', () => {
  before(() => {
    process.env.GIT_DIR = ".notgit"
    process.env.GIT_WORK_TREE = "."
  });
  it('detects an update to an apex class', async () => {
    await runTest('update_class');
  });
  it('detects changes to a meta file', async () => {
    await runTest('update_meta_file');
  });
  it('detects a new object', async () => {
    await runTest('add_object');
  });
  it('detects changes to a object', async () => {
    await runTest('mod_object');
  });
});
