import { flags, SfdxCommand } from '@salesforce/command';
import { fs, Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { promises as fsPromise } from 'fs';
import { dirname, isAbsolute, join, relative } from 'path';
import * as rimraf from 'rimraf';
import * as tmp from 'tmp';
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

export default class Package extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    '$ sfdx git:package -s my-awesome-feature -t master -d deployments/my-awesome-feature',
    '$ sfdx git:package -d deployments/my-working-copy',
    '$ sfdx git:package -s head -d deployments/my-working-copy'
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

  private projectPath: string;

  private sourcePaths: string[];

  public async run(): Promise<AnyJson> {
    this.projectPath = this.project.getPath();

    this.sourcePaths = ((await this.project.resolveProjectConfig())['packageDirectories'] as any[]).map(d => d.path);

    const toBranch = this.flags.targetref || 'master';
    const fromBranch = this.flags.sourceref;
    const diffArgs = ['--no-pager', 'diff', '--name-status', toBranch];
    const dir = __dirname;
    if (fromBranch) {
      diffArgs.push(fromBranch);
    }

    try {
      const diffRefs = `${toBranch}...` + (fromBranch ? fromBranch : '');
      const aheadBehind = await spawnPromise('git', ['rev-list', '--left-right', '--count', diffRefs], {shell: true});
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

      const diff = await spawnPromise('git', diffArgs, {shell: true});
      const changes = await this.getChanged(diff);
      if (!changes.changed.length) {
        this.ux.warn('No changes!');
        return; // nothing to do;
      }

      // create a temp project so we can leverage force:source:convert

      const tmpProject = await this.setupTmpProject(changes, fromBranch);
      const outDir = isAbsolute(this.flags.outputdir) ? this.flags.outputdir : join(this.projectPath, this.flags.outputdir);
      await spawnPromise('sfdx', ['force:source:convert', '-d', outDir], {shell: true, cwd: tmpProject});

    } catch (e) {
      this.ux.error(e);
    }

    return { outputString: '' };
  }

  private async setupTmpProject(diff: DiffResults, targetRef: string) {

    const tempDir = await new Promise<string>((resolve, reject) => {
      tmp.dir((err, path, cleanupCallback) => {
        if (err) {
          reject(err);
        }
        resolve(path);
      });
    });
    // const tempDir = join(this.projectPath, TEMP);
    await fs.mkdirp(tempDir);

    for (const sourcePath of this.sourcePaths) {
      await fs.mkdirp(join(tempDir, sourcePath));
    }
    await fsPromise.copyFile(join(this.projectPath, 'sfdx-project.json'), join(tempDir, 'sfdx-project.json'));

    for (const path of diff.changed) {
      const metadataPaths = await resolveMetadata(path);

      if (!metadataPaths) {
        this.ux.warn(`Could not resolve metadata for ${path}`);
        continue;
      }

      for (let mdPath of metadataPaths) {

        if (isAbsolute(mdPath)) {
          mdPath = relative(this.projectPath, mdPath);
        }

        const newPath = join(tempDir, mdPath);
        await fs.mkdirp(dirname(newPath));
        if (targetRef) {
          await copyFileFromRef(mdPath, targetRef, newPath);
        } else {
          await fsPromise.copyFile(mdPath, newPath);
        }
      }
    }
    return tempDir;
  }

  private async getChanged(diffOutput: string): Promise<DiffResults> {
    const ignore = await getIgnore(this.projectPath);
    const lines = diffOutput.split(/\r?\n/);
    // tuple of additions, deletions
    const changed = [];
    const removed = [];
    for (const line of lines) {
      const parts  = line.split('\t');
      const status = parts[0];
      const path = parts[1];

      if (!path || path.startsWith('.') || ignore.ignores(path) ) {
        continue;
      }

      // check that path is part of the sfdx projectDirectories...
      //   There's most certainty a better way to do this
      const inProjectSource = this.sourcePaths.reduce((inSource, sPath) => {
        return inSource || path.startsWith(sPath);
      }, false);
      if (!inProjectSource) {
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
