import { spawnPromise } from "./util";

export const convertToMetadata = async (outDir: string, projectDir: string) => {
    return await spawnPromise("sfdx", ["force:source:convert", "-d", `"${outDir}"`], { shell: true, cwd: projectDir });
};
