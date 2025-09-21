import core from "@actions/core";
import { exec } from "@actions/exec";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BINARIES = [
    "linux-386",
    "linux-arm",
    "linux-arm64",
    "linux-amd64",
    "darwin-arm64",
    "darwin-amd64",
    "windows-arm64",
    "windows-amd64",
];

async function execAndExtractOutput(cmd: string) {
    let result: string = "";

    await exec(cmd, [], {
        listeners: {
            stdout(data) {
                result += data.toString().trim();
            },
        },
    });

    return result;
}

const DEFAULT_VERSION = "v0.0.0";

async function getLatestTagOrCommit() {
    let result: string = DEFAULT_VERSION;
    try {
        // get latest tag
        result = await execAndExtractOutput(
            `git describe --tags --always --abbrev=0`,
        );
        return result;
    } catch {
        // fallback on latest commit hash
        try {
            result = await execAndExtractOutput(`git rev-parse --short HEAD`);
            return result;
        } finally {
            return result;
        }
    }
}

async function build() {
    try {
        // read inputs from the action metadata
        let projectName = core.getInput("name");
        let projectPath = core.getInput("path");
        let outputDir = core.getInput("dest");
        const ldFlags = core.getInput("ldflags");
        const flags = core.getInput("flags");
        const checksumFile = core.getInput("checksum");
        const includeVersion = core.getInput("includeVersion") === 'true';

        // validate the paths
        projectPath = path.resolve(projectPath);
        outputDir = path.relative(projectPath, outputDir);

        process.chdir(projectPath);

        // build the go project
        core.info(`build: ${projectName} started...`);

        // create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            core.info(`creating output directory: ${outputDir}`);
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // get project version
        const projectVersion = includeVersion ? await getLatestTagOrCommit() : '';

        // start building binaries
        const builtBinaries: string[][] = []
        for (const bin of BINARIES) {
            const [goos, goarch] = bin.split("-");
            const isWindows = goos === "windows";

            const archName = goarch === "amd64" ? "x86_64" : goarch === "386" ? "i386" : goarch;
            const binName = `${projectName}${includeVersion ? '_' + projectVersion : ''}_${goos}_${archName}`;
            const outputName = binName + (isWindows ? ".exe" : "");
            const archiveName = binName + (isWindows ? ".zip" : ".tar.gz");

            // build
            await exec(
                `env CGO_ENABLED=0 GOOS=${goos} GOARCH=${goarch} go build ${flags} -ldflags "${ldFlags}" -o "${outputDir}/${outputName}"`,
            );

            builtBinaries.push([outputName, archiveName])
        }

        core.info(`building complete.`);

        // archive binaries
        process.chdir(outputDir)

        for (const bin of builtBinaries) {
            const [outputName, archiveName] = bin

            // archive
            if (archiveName.endsWith(".zip")) {
                await exec(`zip -j ${archiveName} ${outputName}`);
            } else {
                await exec(`tar -czf ${archiveName} ${outputName}`);
            }

            // append sha256 checksum to file
            const checksum = await execAndExtractOutput(`sha256sum ${archiveName}`)
            await fsp.appendFile(`${projectName}${includeVersion ? '_' + projectVersion : ''}_${checksumFile}`, checksum)

            // cleanup
            await fsp.rm(outputName);
        }

        process.chdir(projectPath);

        core.info(`Artifacts in ${outputDir}/`);

        // display binaries
        await exec(`ls -lh ${outputDir}`);
    } catch (error) {
        core.setFailed(`Action failed with error: ${error}`);
    }
}

await build();
