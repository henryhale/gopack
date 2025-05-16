import core from "@actions/core";
import { exec } from "@actions/exec";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
const binaries = [
    "linux-arm",
    "linux-arm64",
    "linux-amd64",
    "darwin-arm64",
    "darwin-amd64",
    "windows-arm64",
    "windows-amd64",
];
async function build() {
    try {
        let projectName = core.getInput('name');
        let projectPath = core.getInput('path');
        let outputDir = core.getInput('dest');
        const ldFlags = core.getInput('ldflags');
        projectPath = path.resolve(projectPath);
        outputDir = path.resolve(outputDir);
        core.info(`build: ${projectName} started...`);
        if (!fs.existsSync(outputDir)) {
            core.info(`creating output directory: ${outputDir}`);
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const projectVersion = await exec("git describe --tags --always");
        for await (const bin of binaries) {
            const [goos, goarch] = bin.split("-");
            const isWindows = goos === 'windows';
            const binName = `${projectName}-${projectVersion}-${goos}-${goarch}`;
            const outputName = outputDir + '/' + binName + (isWindows ? '.exe' : '');
            const archiveName = outputDir + '/' + binName + (isWindows ? '.zip' : '');
            await exec(`env GOOS=${goos} GOARCH=${goarch} ${goarch === 'arm' ? ' GOARM=7' : ''} go build -ldflags "${ldFlags}" -o "${outputName}"`);
            if (goos === 'windows') {
                await exec(`zip -j ${archiveName} ${outputName}`);
            }
            else {
                await exec(`tar -czf ${archiveName} ${outputName}`);
            }
            await fsp.rm(outputName);
        }
        core.info(`build and packaging complete.`);
        core.info(`artifacts in ${outputDir}/`);
    }
    catch (error) {
        core.setFailed(`action failed with error: ${error}`);
    }
}
build();
