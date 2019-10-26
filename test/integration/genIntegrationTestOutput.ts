import { myExec, projectPath, getIntegBranches } from "./util";

(async () => {
    for (const branch of await getIntegBranches()) {
        myExec(
          `sfdx git:package -s ${branch} -t ${branch}^ -d "../output/${branch}" --purge`,
          projectPath);
    }
})();