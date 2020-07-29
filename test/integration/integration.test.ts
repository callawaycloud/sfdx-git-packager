import * as assert from 'assert';
import { compareSync } from 'dir-compare';
import { resolve } from 'path';
import { myExec, projectPath, setGitENV } from './util';

async function runTest(testName: string, params?: string[]) {
  const sourceRef = testName;
  const expectedOutputDir = testName;
  try {
    const program = resolve(__dirname, '..', '..', 'bin', 'run');
    const res = await myExec(
      `${program} git:package -d deploy --purge -s ${sourceRef} -t master ${params ? params.join(' ') : ''}`,
      projectPath);

    assert.equal(null, res.err);
    const compareRes = compareSync('test/integration/project/deploy', `test/integration/output/${expectedOutputDir}`, { compareContent: true });
    const mismatched = compareRes.diffSet.filter(diff => diff.state !== 'equal').map(diff => diff.name1 || diff.name2);
    assert.strictEqual(mismatched.length, 0, `${mismatched.length} file(s) were different: \n${mismatched.join('\n')}`);
    assert.strictEqual(true, compareRes.equal > 0);
  } catch (e) {
    assert.fail(e);
  }
}

describe('git:package integration test', async () => {
  before(async () => {
    setGitENV();
    await myExec('git checkout master', projectPath);
    await myExec('git reset --hard', projectPath);
  });

  describe('apex classes', async () => {
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

  describe('custom fields', async () => {
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

  describe('custom objects', async () => {
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

  describe('custom labels', async () => {
    it('detects a new custom label', async () => {
      await runTest('add_label');
    });
    it('detects an update to an custom object', async () => {
      await runTest('mod_label');
    });
  });

  describe('static resources', async () => {
    it('detects a new static resource', async () => {
      await runTest('add_static_resource');
    });
    it('detects an update to a static resource', async () => {
      await runTest('mod_static_resource');
    });
    it('detects full deletion of a static resource', async () => {
      await runTest('del_static_resource');
    });
    it('copies binary files without change', async () => {
      await runTest('add_static_resource_zip');
    });
  });

  describe('folder_types', async () => {
    it('detects partial deletion of a folder', async () => {
      await runTest('del_single_file_from_folder');
    });
  });

  describe('content assets', async () => {
    it('detects new content assets', async () => {
      await runTest('add_content_asset');
    });

    it('detects an update to content assets', async () => {
      await runTest('mod_content_asset');
    });

    it('detects full deletion of content assets', async () => {
      await runTest('del_content_asset');
    });
  });

  describe('ignore whitespace flag', async () => {
    it('ignores whitespace on modified files', async () => {
      await runTest('ignore_whitespace', ['-w']);
    });
  });
});
