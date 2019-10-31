# sfdx-git-packager

![npm](https://img.shields.io/npm/v/sfdx-git-packager) [![Build Status](https://travis-ci.org/ChuckJonas/sfdx-git-packager.svg?branch=master)](https://travis-ci.org/ChuckJonas/sfdx-git-packager)

Generates a metadata package (`package.xml` & source files) for differences between two branches/commits.

![Generating vs working tree](https://user-images.githubusercontent.com/5217568/65200914-e587ed80-da45-11e9-917d-a63a3c91b29f.gif)
_Example Generating vs "working tree" & master_

## Install

Run `sfdx plugins:install sfdx-git-packager`

## Features

**Currently supports:**

- ApexClass
- ApexTrigger
- VisualForce
- Aura
- LWC
- CustomObject
- CustomField
- StaticResources
- all other simple \*-meta.xml files
- Destructive Changes!

**Not yet supported:**

- ??? (please submit an issue if you run into anything else)
- Windows (needs testing)

## Usage

Must be run from inside an sfdx project with an initialized git repo.

<!-- commands -->

- [`sfdx git:package -d <string> [-s <string>] [-t <string>] [-w] [--purge] [--nodelete] [-f] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-gitpackage--d-string--s-string--t-string--w---purge---nodelete--f---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx git:package -d <string> [-s <string>] [-t <string>] [-w] [--purge] [--nodelete] [-f] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Generates a Metadata Package using the differences between two git refs (branch or commit)

```
USAGE
  $ sfdx git:package -d <string> [-s <string>] [-t <string>] [-w] [--purge] [--nodelete] [-f] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         (required) The directory to output
                                                                                    the generated package and metadata
                                                                                    to

  -f, --force                                                                       Continue even if source is behind
                                                                                    target

  -s, --sourceref=sourceref                                                         The git ref (branch or commit) which
                                                                                    we are deploying from. If left
                                                                                    blank, will use working copy

  -t, --targetref=targetref                                                         [default: master] The git ref
                                                                                    (branch or commit) which we are
                                                                                    deploying into. Defaults to master

  -w, --ignorewhitespace                                                            Don't package changes that are
                                                                                    whitespace only

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --nodelete                                                                        Don't generate
                                                                                    destructiveChanges.xml for deletions

  --purge                                                                           Delete output dir if it already
                                                                                    exists (without prompt)

EXAMPLES
  $ sfdx git:package -s my-awesome-feature -t master -d deployments/my-awesome-feature
  $ sfdx git:package -d deployments/my-working-copy
  $ sfdx git:package -s head -d deployments/my-working-copy
```

_See code: [lib/commands/git/package.js](https://github.com/ChuckJonas/sfdx-git-diff-to-pkg/blob/v0.0.3/lib/commands/git/package.js)_

<!-- commandsstop -->

### Ignore Files

If you wish to prevent certain files from being included in a package, you can create a `.packageIgnore` in the root of your project. This works similar to [`.gitIgnore`](https://git-scm.com/docs/gitignore). You can add globs to prevent source path from being picked up.

## Developing

(`NPM` based install coming soon)

1. git clone
1. cd
1. `yarn/npm` install
1. `sfdx plugins:link`

### Testings

`npm test` just runs the basic test suite, not much here yet

#### Integration Testing

`npm run integrationTest` runs integration test suite

#### Setting Up Integration Tests

We've got a git repo in `test/integration/project` that represents a project. In order to avoid conflicts with the parent repo folders we change the .git folder to .notgit so we can commit those to the repo. You'll need to "unpack" that repo if you want to easily work in the test git repo when expanding the integration suite.

To add tests

1. unpack the test repo `npm run tgu`
1. go to the test project `cd test/integration/project`
1. run `git reset --hard` to bring everything back
1. create a branch off of `master`, make the mods you want to test, and commit
1. generate the expected output `npm run gen`
1. check the contents of `test/integration/output` matches what you'd expect for your change (make sure to check there are no other unexpected changes!)
1. pack the test repo back up `npm run tgp`

## Disclaimer

THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
