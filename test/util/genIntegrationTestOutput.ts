import { ExecException, exec } from "child_process";

async function myExec(cmd:string):Promise<{err: ExecException | null, stdout: string, stderr: string}> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(), 10000);
    exec(cmd, (err, stdout, stderr) => {
      resolve({err, stdout, stderr});
    });
  });
}

(async () => {
    process.chdir("test/project");
    process.env.GIT_DIR = ".git";
    process.env.GIT_WORK_TREE = ".";
    const res = await myExec("git branch --list");
    const branches = res.stdout.split(/\s+/).filter((branch) => {
        return !['master', '*', ''].includes(branch);
    });
    console.log(branches);
    for (const branch of branches) {
        myExec(`sfdx git:package -s ${branch} -t ${branch}^ -d "../output/${branch}" --purge`);
    }
})();