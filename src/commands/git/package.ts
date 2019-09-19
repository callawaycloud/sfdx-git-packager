import { flags, SfdxCommand } from '@salesforce/command';
import { fs, Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { promises as fsPromise } from 'fs';
import { dirname, isAbsolute, join, relative } from 'path';
import { resolveMetadata } from '../../metadataResolvers';
import { copyFileFromRef, getIgnore, spawnPromise } from '../../util';

interface DiffResults {
  changed: string[];
  removed: string[];
}

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
      const changes = await this.getChanged(diff);
      if (!changes.changed.length) {
        this.ux.warn('No changes!');
        return; // nothing to do;
      }

      // create a temp project so we can leverage force:source:convert
      const projectPath = this.project.getPath();
      await this.setupTmpProject(changes, projectPath, fromBranch);
      process.chdir(join(projectPath, TEMP));
      await spawnPromise('sfdx', ['force:source:convert', '-d', join('..', this.flags.outputdir)]);
      await spawnPromise('rm', ['-rf', join(projectPath, TEMP)]);
    } catch (e) {
      this.ux.error(e);
    } finally {
      process.chdir(dir);
    }

    return { outputString: '' };
  }

  private async setupTmpProject(diff: DiffResults, projectPath: string, targetRef: string) {

    const outDir = join(projectPath, TEMP);
    await fs.mkdirp(outDir);
    await fsPromise.copyFile(join(projectPath, 'sfdx-project.json'), join(outDir, 'sfdx-project.json'));

    for (const path of diff.changed) {
      const metadataPaths = await resolveMetadata(path);

      if (!metadataPaths) {
        this.ux.warn(`Could not resolve metadata for ${path}`);
        continue;
      }

      for (let mdPath of metadataPaths) {
        console.log(mdPath);

        if (isAbsolute(mdPath)) {
          mdPath = relative(projectPath, mdPath);
        }

        const newPath = join(outDir, mdPath);
        await fs.mkdirp(dirname(newPath));
        if (targetRef) {
          await copyFileFromRef(mdPath, targetRef, newPath);
        } else {
          await fsPromise.copyFile(mdPath, newPath);
        }
      }
    }
  }

  private async getChanged(diffOutput: string): Promise<DiffResults> {
    const ignore = await getIgnore(this.project.getPath());
    const lines = diffOutput.split(require('os').EOL);

    // tuple of additions, deletions
    const changed = [];
    const removed = [];
    for (const line of lines) {
      const parts  = line.split('\t');
      const status = parts[0];
      const path = parts[1];

      // [TODO] should also check that path is part of one of the sfdx projects folders
      if (!path || path.startsWith('.') || ignore.ignores(path)) {
        continue;
      }

      // [TODO] build a "distructivechanges.xml"
      if (status === 'D') {
        removed.push(path);
      } else {
        changed.push(path);
      }

    }
    return {
      changed,
      removed
    };
  }
}

