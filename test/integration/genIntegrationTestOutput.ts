import { getIntegBranches, myExec, projectPath } from './util';

(async () => {
  try {
    for (const branch of await getIntegBranches()) {
      console.log(`generating ${branch}`);
      await myExec(
        `sfdx git:package -s ${branch} -t master -d "../output/${branch}" --purge`,
        projectPath);
    }
  } catch (e) {
    console.log(e);
  }
})()
  .then(() => console.log('done'))
  .catch(e => console.log(e));
