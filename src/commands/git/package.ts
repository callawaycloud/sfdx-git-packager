import { flags, SfdxCommand } from '@salesforce/command';
import { fs, Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { promises as fsPromise } from 'fs';
import { dirname, isAbsolute, join, relative } from 'path';
import { resolveMetadata } from '../../metadataResolvers';
import { copyFileFromRef, spawnPromise } from '../../util';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-git-packager', 'package');

const TEMP = '.tmp-pkg-prj';

export default class Package extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    '$ sfdx git:package -s my-awesome-feature -t master -d deployments/my-awesome-feature',
    '$ sfdx git:package -t master -d deployments/my-working-copy'
  ];

  public static args = [
    { name: 'file' }
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    sourceref: flags.string({ char: 's', description: messages.getMessage('fromBranchDescription') }),
    targetref: flags.string({ char: 't', description: messages.getMessage('toBranchDescription') }),
    outputdir: flags.string({ char: 'd', description: messages.getMessage('outputdirDescription'), required: true }),
    force: flags.boolean({ char: 'f', description: messages.getMessage('force')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    const toBranch = this.flags.targetref || 'master';
    const fromBranch = this.flags.sourceref;
    const diffArgs = ['--no-pager', 'diff', '--name-status', toBranch];
    const dir = __dirname;
    if (fromBranch) {
      diffArgs.push(fromBranch);
    }

    try {
      const diffRefs = `${toBranch}...` + (fromBranch ? fromBranch : '');
      const aheadBehind = await spawnPromise('git', ['rev-list', '--left-right', '--count', diffRefs]);
      const behind = Number(aheadBehind.split(/(\s+)/)[0]);
      if (behind > 0) {
        const behindMessage = `${fromBranch ? fromBranch : '"working tree"'} is ${behind} commit(s) behind ${toBranch}!  You probably want to rebase ${toBranch} into ${fromBranch} before deploying!`;
        if (!this.flags.force) {
          this.ux.warn(behindMessage);
          this.ux.error('Use -f to generate package anyways.');
          return;
        } else {
          this.ux.warn(behindMessage);
        }
      }

      const diff = await spawnPromise('git', diffArgs);

      // create a temp project so we can leverage force:source:convert
      const projectPath = this.project.getPath();
      await this.setupTmpProject(diff, projectPath, fromBranch);
      process.chdir(join(projectPath, TEMP));
      await spawnPromise('sfdx', ['force:source:convert', '-d', join('..', this.flags.outputdir)]);
      await spawnPromise('rm', ['-rf', join(projectPath, TEMP)]);
    } catch (e) {
      this.ux.error(e);
    } finally {
      process.chdir(dir);
    }

    // Organization will always return one result, but this is an example of throwing an error
    // The output and --json will automatically be handled for you.
    // if (!result.records || result.records.length <= 0) {
    // throw new SfdxError(messages.getMessage('errorNoOrgResults', [this.org.getOrgId()]));
    // }

    return { outputString: '' };
  }

  private async setupTmpProject(diffOutput: string, projectPath: string, targetRef: string) {
    const outDir = join(projectPath, TEMP);
    await fs.mkdirp(outDir);
    await fsPromise.copyFile(join(projectPath, 'sfdx-project.json'), join(outDir, 'sfdx-project.json'));
    const lines = diffOutput.split(require('os').EOL);
    for (const line of lines) {
      const status = line.split('\t')[0];

      // [TODO] build a "distructivechanges.xml"
      if (status === 'D') {
        continue;
      }

      const path = line.split('\t')[1];
      if (!path || path.startsWith('.')) { // should instead check that path is part of one of the sfdx projects folders
        continue;
      }

      const metadataPaths = await resolveMetadata(path);

      if (!metadataPaths) {
        this.ux.warn(`Could not resolve metadata for ${path}`);
        continue;
      }

      for (let mdPath of metadataPaths) {
        if (isAbsolute(mdPath)) {
          mdPath = relative(projectPath, mdPath);
        }

        const newPath = join(outDir, mdPath);
        await fs.mkdirp(dirname(newPath));
        if (targetRef) {
          await copyFileFromRef(path, targetRef, newPath);
        } else {
          await fsPromise.copyFile(path, newPath);
        }
      }
    }
  }

}
