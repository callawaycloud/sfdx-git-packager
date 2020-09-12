# sfdx-git-packager

![npm](https://img.shields.io/npm/v/sfdx-git-packager) [![Build Status](https://travis-ci.org/callawaycloud/sfdx-git-packager.svg?branch=master)](https://travis-ci.org/ChuckJonas/sfdx-git-packager)

Generates a metadata package (`package.xml` & source files) for differences between two git refs (branches or commits).

The goal of this project is to be able to generate incremental (delta), deployable packages to use in a CI or developer workflows (see our [Callaway Cloud CI](https://github.com/ChuckJonas/generator-ccc/blob/master/generators/app/templates/static/build/pipelines-setup.md) for an example). Unfortunately, there are still some scenario's which are not supported. We attempt to document these problems and workarounds in [this document](https://github.com/ChuckJonas/sfdx-git-packager/blob/master/common-issues.md).

***Is this tool right for me?***

- ✅  you use the "sfdx source format" (with or without manifest)
- ✅  you use gitflow or a similar branch strategy where your ORG's are tracked in source control (production, QA, etc).
- ✅  you want a CI or release process that ONLY deploys delta changes

## 📦 Install

Run `sfdx plugins:install sfdx-git-packager`


## ✨Features

**Currently supports:**

- ApexClass
- ApexTrigger
- VisualForce
- Aura
- LWC
- CustomObject
- CustomField
- StaticResources (both folders and single files)
- CustomLabels (partial changes)
- all other simple \*-meta.xml files
- Destructive Changes!

**Not yet supported:**

- Partial profile deployments
- ??? (please submit an issue if you run into anything else)

### Basic Example

1. Create a branch

2. Commit Changes
<img width="724" alt="is_stuff__c_field-meta_xml__Index__—_my-sandbox" src="https://user-images.githubusercontent.com/5217568/93001281-1f6dc180-f4eb-11ea-9add-dc7543124030.png">

3. run `sfdx git:package -d dist/my-feature` (defaults `--sourceref` to current ref and `--targetref` to master)

4. your changes will be packaged into the `dist` folder
<img width="936" alt="destructiveChangesPost_xml_—_my-sandbox" src="https://user-images.githubusercontent.com/5217568/93001351-9d31cd00-f4eb-11ea-9668-0ba8a449d7a6.png">

5. Deploy to your target org using `sfdx force:mdapi:deploy -d dist/my-feature`

## 🔨 Usage

Must be run from inside an sfdx project with an initialized git repo.

<!-- commands -->
* [`sfdx git:package -d <string> [-s <string>] [-t <string>] [-w] [--purge] [--nodelete] [-f] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-gitpackage--d-string--s-string--t-string--w---purge---nodelete--f---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

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

  -s, --sourceref=sourceref                                                         [default: HEAD] The git ref (branch
                                                                                    or commit) which we are deploying
                                                                                    from. If left blank, will use head

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
  $ sfdx git:package -s my-awesome-feature -t master -d deploy/my-feature
  $ sfdx git:package -d deploy/my-feature
  $ sfdx git:package -s feature-b -d deploy/feature-b
```

_See code: [lib/commands/git/package.js](https://github.com/callawaycloud/sfdx-git-packager/blob/v0.3.1/lib/commands/git/package.js)_
<!-- commandsstop -->

### Ignore Files

If you wish to prevent certain files from being included in a package, you can create a `.packageIgnore` in the root of your project. This works similar to [`.gitIgnore`](https://git-scm.com/docs/gitignore). You can add globs to prevent source path from being picked up.

## 🤝 Contributing

### Project setup

1. git clone
1. cd
1. `yarn/npm` install
1. `sfdx plugins:link`

### Testings

`npm test` just runs the basic test suite, not much here yet

#### Integration Testing

`npm run test:integration` runs integration test suite

_Note: To run a specific test or suite you can use `npm run test:integration -- --grep "your test name"`_

#### Setting Up Integration Tests

We've got a git repo in `test/integration/project` that represents a project. In order to avoid conflicts with the parent repo folders we change the .git folder to .notgit so we can commit those to the repo. You'll need to "unpack" that repo if you want to easily work in the test git repo when expanding the integration suite.

**To add new tests**

1. revert the `.git` file: `npm run tgu`
1. go to the test project `cd test/integration/project`
1. create a branch off of `master`, make the mods you want to test, and commit
1. generate the expected output `npm run gen`
1. check the contents of `test/integration/output` matches what you'd expect for your change (make sure to check there are no other unexpected changes. DO NOT blind commit changes to other outputs!)
1. add a new test to `test/integration/integration.test.ts`
1. pack the test repo back up `npm run tgp`
1. commit changes

**Updating the base state (master)**

You might find the base state (master branch) is not setup properly in order to perform some test (you add a support for metadata not part of master). If you need to modify the base state, follow these instructions:

1. Open the integration project. Run `npm run tgu` if you haven't already.
1. `git checkout master`
1. make your changes. Try to avoid making changes that will cause merge conflicts on any of the other branches
1. commit your changes to master
1. Sync master to all other branches by running `./syncMaster.sh`

## Disclaimer

THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
