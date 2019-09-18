# sfdx-git-packager

Generates a metadata package (package.xml & files) for differences between two branches/commits.    

**Currently supports:**

- ApexClass
- ApexTrigger
- VisualForce
- Aura
- CustomObject
- CustomField
- all other simple *-meta.xml files

**Not yet supported:**

- Static resources
- LWC
- ??? (please submit an issue if you run into anything else)

## Installation

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

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

EXAMPLES
  $ sfdx git:package -s my-awesome-feature -t master -d 
  deployments/my-awesome-feature
  $ sfdx git:package -t master -d deployments/my-working-copy
```
