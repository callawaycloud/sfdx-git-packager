import { myExec, setGitENV, projectPath } from './util';
import * as assert from 'assert';
import { compareSync } from 'dir-compare';

async function runTest(testName: string) {
  const sourceRef = testName;
  const targetRef = `${testName}^`;
  const expectedOutputDir = testName;
  try {
    const res = await myExec(
      `sfdx git:package -d deploy --purge -s ${sourceRef} -t ${targetRef}`,
      projectPath);
    assert.equal(null, res.err);
    const compareRes = compareSync("test/integration/project/deploy", `test/integration/output/${expectedOutputDir}`, { compareContent: true });
    assert.strictEqual(compareRes.distinct, 0);
    assert.strictEqual(true, compareRes.equal > 0);
  } catch (e) {
    assert.fail(e);
  }
}

describe('git:package integration test', async () => {
  before(() => {
    setGitENV();
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
