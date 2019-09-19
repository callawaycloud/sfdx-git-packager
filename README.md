# sfdx-git-packager

Generates a metadata package (`package.xml` & source files) for differences between two branches/commits.  

![Generating vs working tree](https://user-images.githubusercontent.com/5217568/65200914-e587ed80-da45-11e9-917d-a63a3c91b29f.gif)
*Example Generating vs "working tree" & master*

**Currently supports:**

- ApexClass
- ApexTrigger
- VisualForce
- Aura
- CustomObject
- CustomField
- StaticResources
- all other simple *-meta.xml files

**Not yet supported:**

- LWC
- ??? (please submit an issue if you run into anything else)
- Windows :/ (help wanted)

## Installation

(`NPM` based install coming soon)

1. git clone
1. cd
1. `yarn/npm` install
1. `sfdx plugins:link`

## Usage 

Must be run from inside an sfdx project with an initialized git repo.

```
Generates a Metadata Package using the differences between two git refs (branch or commit)

USAGE
  $ sfdx git:package -d <string> [-f <string>] [-t <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir
      (required) The directory to output the generated package and metadata to

  -s, --sourceref=sourceref
      The git ref (branch or commit) which we are deploying from. If left blank, will 
      use working copy

  -t, --targetref=targetref
      The git ref (branch or commit) which we are deploying into. Defaults to master

  -f, --force
      Continue even if source is behind target

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

EXAMPLES
  $ sfdx git:package -s my-awesome-feature -t master -d 
  deployments/my-awesome-feature
  $ sfdx git:package -t master -d deployments/my-working-copy
```

### Ignore Files

If you wish to prevent certain files from being included in a package, you can create a `.packageIgnore` in the root of your project.  This works similar to [`.gitIgnore`](https://git-scm.com/docs/gitignore).  You can add globs to prevent source path from being picked up.
