import { flags, SfdxCommand } from "@salesforce/command";
import { fs, Messages } from "@salesforce/core";
import { AnyJson } from "@salesforce/ts-types";
import * as jsdiff from "diff";
import { promises as fsPromise } from "fs";
import { dirname, isAbsolute, join, relative } from "path";
import * as tmp from "tmp";
import { getResolver, resolveMetadata } from "../../metadataResolvers";
import { convertToMetadata } from "../../sfdx";
import {
  copyFileFromRef,
  getIgnore,
  purgeFolder,
  spawnPromise,
} from "../../util";

interface DiffResults {
  changed: string[];
  removed: string[];
}

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("sfdx-git-packager", "package");

export default class Package extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [
    "$ sfdx git:package -s my-awesome-feature -t master -d deploy/my-feature",
    "$ sfdx git:package -d deploy/my-feature",
    "$ sfdx git:package -s feature-b -d deploy/feature-b",
  ];

  // not sure what this does...
  public static args = [{ name: "file" }];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    sourceref: flags.string({
      char: "s",
      description: messages.getMessage("fromBranchDescription"),
      default: "HEAD",
    }),
    targetref: flags.string({
      char: "t",
      description: messages.getMessage("toBranchDescription"),
      default: "master",
    }),
    outputdir: flags.string({
      char: "d",
      description: messages.getMessage("outputdirDescription"),
      required: true,
    }),
    workingdir: flags.string({
      char: "D",
      description: messages.getMessage("workingdirDescription"),
    }),
    ignorewhitespace: flags.boolean({
      char: "w",
      description: messages.getMessage("ignoreWhitespace"),
    }),
    purge: flags.boolean({
      description: messages.getMessage("purgeDescription"),
    }),
    nodelete: flags.boolean({ description: messages.getMessage("nodelete") }),
    force: flags.boolean({
      char: "f",
      description: messages.getMessage("force"),
    }),
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

    this.sourcePaths = ((await this.project.resolveProjectConfig())[
      "packageDirectories"
    ] as Array<{ path: string }>).map((d) =>
      d.path.replace(this.flags.workingdir, "")
    );

    const toBranch = this.flags.targetref;
    const fromBranch = this.flags.sourceref;
    const diffArgs = [
      "--no-pager",
      "diff",
      "--name-status",
      "--no-renames",
      toBranch,
      fromBranch,
    ];

    try {
      const diffRefs = `${toBranch}...${fromBranch}`;
      const aheadBehind = await spawnPromise(
        "git",
        ["rev-list", "--left-right", "--count", diffRefs],
        { shell: true }
      );
      const behind = Number(aheadBehind.split(/(\s+)/)[0]);
      if (behind > 0) {
        const behindMessage = `${fromBranch} is ${behind} commit(s) behind ${toBranch}!  You probably want to merge ${toBranch} into ${fromBranch} before building a package!`;
        if (!this.flags.force) {
          this.ux.warn(behindMessage + "\nUse -f to generate package anyways.");
          this.ux.error();
          this.exit(1);
          return;
        } else {
          this.ux.warn(behindMessage);
        }
      }

      const diff = await spawnPromise("git", diffArgs, { shell: true });
      const diffResults = await this.getChanged(diff, fromBranch);

      const hasChanges = diffResults.changed.length > 0;
      const hasDeletions =
        diffResults.removed.length > 0 && !this.flags.nodelete;
      if (!hasChanges && !hasDeletions) {
        this.ux.warn("No changes found!");
        this.exit(1);
        return;
      }

      // create a temp project so we can leverage force:source:convert for destructiveChanges

      let tmpDeleteProj: string;
      let tempDeleteProjConverted: string;
      if (hasDeletions) {
        tmpDeleteProj = await this.setupTmpProject(
          diffResults.removed,
          toBranch
        );
        tempDeleteProjConverted = await this.mkTempDir();
        await convertToMetadata(tempDeleteProjConverted, tmpDeleteProj);
      }

      // create a temp project so we can leverage force:source:convert for primary deploy
      const tmpProject = await this.setupTmpProject(
        diffResults.changed,
        fromBranch
      );
      const outDir = isAbsolute(this.flags.outputdir)
        ? this.flags.outputdir
        : join(this.projectPath, this.flags.outputdir);
      try {
        const stat = await fs.stat(outDir);
        if (stat.isDirectory()) {
          let purge = false;
          if (this.flags.purge) {
            purge = true;
          } else {
            const resp = await this.ux.prompt(
              `The output path ${outDir} already exists.  How would you like to continue? (purge | merge | exit)`
            );
            if (resp.toLocaleLowerCase() === "purge") {
              purge = true;
            } else if (resp.toLocaleLowerCase() !== "merge") {
              this.exit(1);
              return;
            }
          }
          if (purge) {
            this.ux.log(`Removing all files inside of ${outDir}`);
            try {
              await purgeFolder(outDir);
            } catch (e) {
              this.ux.error(e);
              this.exit(1);
              return;
            }
          }
        }
      } catch (e) {}

      await fs.mkdirp(outDir);

      if (hasChanges) {
        await convertToMetadata(outDir, tmpProject);
      }
      if (hasDeletions) {
        await fsPromise.copyFile(
          `${tempDeleteProjConverted}/package.xml`,
          `${outDir}/destructiveChangesPost.xml`
        );
        if (!hasChanges) {
          await fsPromise.writeFile(
            `${outDir}/package.xml`,
            '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata"><version>45.0</version></Package>'
          );
        }
      }
    } catch (e) {
      this.ux.error(e);
      this.exit(1);
    }

    return {};
  }

  private async mkTempDir() {
    const tempDir = await new Promise<string>((resolve, reject) => {
      tmp.dir((err, path) => {
        if (err) {
          reject(err);
        }
        resolve(path);
      });
    });
    await fs.mkdirp(tempDir);
    return tempDir;
  }

  private async setupTmpProject(
    changed: string[],
    sourceRef: string | undefined
  ) {
    const tempDir = await this.mkTempDir();

    for (const sourcePath of this.sourcePaths) {
      await fs.mkdirp(join(tempDir, sourcePath));
    }

    await copyFileFromRef(
      "sfdx-project.json",
      sourceRef,
      join(tempDir, "sfdx-project.json")
    );

    for (const path of changed) {
      const resolvedMetadata = await resolveMetadata(
        path,
        sourceRef,
        this.flags.targetref
      );

      if (!resolvedMetadata) {
        this.ux.warn(`Could not resolve metadata for ${path}`);
        continue;
      }

      for (const resolved of resolvedMetadata) {
        let mdPath = resolved.path;
        if (isAbsolute(mdPath)) {
          mdPath = relative(this.projectPath, mdPath);
        }
        const newPath = join(tempDir, mdPath);
        await fs.mkdirp(dirname(newPath));
        if (typeof resolved.source === "string") {
          await fs.writeFile(newPath, resolved.source);
        } else {
          await resolved.source(newPath);
        }
      }
    }

    return tempDir;
  }

  private async getChanged(
    diffOutput: string,
    targetRef: string
  ): Promise<DiffResults> {
    const ignore = await getIgnore(this.projectPath);
    const lines = diffOutput.split(/\r?\n/);
    // tuple of additions, deletions
    const changed = [];
    let removed = [];
    for (const line of lines) {
      const parts = line.split("\t");
      const status = parts[0];
      const path = parts[1];

      if (!path || path.startsWith(".") || ignore.ignores(path)) {
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

      if (status === "D") {
        removed.push(path);
      } else {
        if (status === "M") {
          if (this.flags.ignorewhitespace) {
            const a = await spawnPromise("git", [
              "show",
              `${this.flags.targetref}:${path}`,
            ]);
            const b = await spawnPromise("git", [
              "show",
              `${this.flags.sourceref}:${path}`,
            ]);

            if (!hasNonWhitespaceChanges(a, b)) {
              continue;
            }
          }
        }

        changed.push(path);
      }
    }

    // check for directory style resources that are full deletions (and are actually changes)
    const notFullyRemoved = [];
    for (const path of removed) {
      const resolver = getResolver(path);
      if (!resolver) {
        continue;
      }
      if (resolver.getIsDirectory()) {
        const metadataPaths = await resolver.getMetadataPaths(path, targetRef);
        // current implementation will return meta file regardless of whether it exists in org or not
        if (metadataPaths.length > 1) {
          notFullyRemoved.push(path);
          for (const mdPath of metadataPaths) {
            if (!changed.includes(mdPath)) {
              changed.push(mdPath);
            }
          }
        }
      }
    }

    removed = removed.filter((path) => !notFullyRemoved.includes(path));
    return {
      changed,
      removed,
    };
  }
}

// checks two strings and returns true if they have "non-whitespace" changes (spaces or newlines)
function hasNonWhitespaceChanges(a: string, b: string) {
  const diffResults = jsdiff.diffLines(a, b, {
    ignoreWhitespace: true,
    newlineIsToken: true,
  });
  for (const result of diffResults) {
    if (result.added || result.removed) {
      return true;
    }
  }
  return false;
}
