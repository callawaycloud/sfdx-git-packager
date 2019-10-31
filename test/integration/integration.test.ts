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

  describe('apex classes', async() => {
    it('detects a new apex class', async () => {
      await runTest('add_class');
    });
    it('detects an update to an apex class', async () => {
      await runTest('mod_class');
    });
    it('detects an update to an apex class meta file', async () => {
      await runTest('mod_class_meta');
    });
    it('detects deletion of an apex class', async () => {
      await runTest('del_class');
    });
  });

  describe('custom fields', async() => {
    it('detects a new custom field', async () => {
      await runTest('add_field');
    });
    it('detects an update to an custom field', async () => {
      await runTest('mod_field');
    });
    it('detects deletion of an custom field', async () => {
      await runTest('del_field');
    });
  });

  describe('custom objects', async() => {
    it('detects a new custom object', async () => {
      await runTest('add_object');
    });
    it('detects an update to an custom object', async () => {
      await runTest('mod_object');
    });
    it('detects deletion of an custom object', async () => {
      await runTest('del_object');
    });
  });

  describe('static resources', async() => {
    it('detects a new static resource', async () => {
      await runTest('add_static_resource');
    });
    it('detects an update to a static resource', async () => {
      await runTest('mod_static_resource');
    });
    it('detects partial deletion of a static resource', async () => {
      await runTest('mod_partially_delete_static_resource');
    });
    it('detects full deletion of a static resource', async () => {
      await runTest('del_static_resource');
    });
  });

});
