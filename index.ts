import * as core from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";
import fs from "node:fs";
import path from "node:path";

// Target platforms as "<GOOS>-<GOARCH>" pairs.
const PLATFORMS = [
  "linux-386",
  "linux-arm",
  "linux-arm64",
  "linux-amd64",
  "darwin-arm64",
  "darwin-amd64",
  "windows-arm64",
  "windows-amd64",
];

// Friendlier architecture names used in release file names.
const ARCH_ALIASES: Record<string, string> = {
  amd64: "x86_64",
  "386": "i386",
};

const DEFAULT_VERSION = "v0.0.0";

/** Split a space-separated flag string into individual arguments. */
function toArgs(value: string): string[] {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/) : [];
}

/** Resolve a release version from the latest git tag, falling back to the short commit hash. */
async function resolveVersion(): Promise<string> {
  const candidates: string[][] = [
    ["describe", "--tags", "--always", "--abbrev=0"],
    ["rev-parse", "--short", "HEAD"],
  ];

  for (const args of candidates) {
    const { exitCode, stdout } = await getExecOutput("git", args, {
      silent: true,
      ignoreReturnCode: true,
    });
    const version = stdout.trim();
    if (exitCode === 0 && version) return version;
  }

  return DEFAULT_VERSION;
}

interface BuildOptions {
  projectName: string;
  projectPath: string;
  outputDir: string;
  version: string;
  ldflags: string;
  flags: string;
}

/** Build a single platform binary and package it into an archive, returning the archive name. */
async function buildAndPackage(
  platform: string,
  opts: BuildOptions,
): Promise<string> {
  const [goos, goarch] = platform.split("-");
  const isWindows = goos === "windows";
  const archName = ARCH_ALIASES[goarch] ?? goarch;

  const baseName = [opts.projectName, opts.version, goos, archName]
    .filter(Boolean)
    .join("_");
  const binaryName = baseName + (isWindows ? ".exe" : "");
  const archiveName = baseName + (isWindows ? ".zip" : ".tar.gz");
  const binaryPath = path.join(opts.outputDir, binaryName);

  // compile
  await exec(
    "go",
    [
      "build",
      ...toArgs(opts.flags),
      "-ldflags",
      opts.ldflags,
      "-o",
      binaryPath,
      ".",
    ],
    {
      cwd: opts.projectPath,
      env: {
        ...process.env,
        CGO_ENABLED: "0",
        GOOS: goos,
        GOARCH: goarch,
      } as Record<string, string>,
    },
  );

  // package (archive the bare binary, without any directory prefix)
  if (isWindows) {
    await exec("zip", ["-j", archiveName, binaryName], { cwd: opts.outputDir });
  } else {
    await exec("tar", ["-czf", archiveName, binaryName], {
      cwd: opts.outputDir,
    });
  }

  // keep only the archive
  await fs.promises.rm(binaryPath);

  core.info(`packaged ${archiveName}`);
  return archiveName;
}

async function run(): Promise<void> {
  try {
    // read inputs from the action metadata
    const projectName = core.getInput("name", { required: true });
    const projectPath = path.resolve(core.getInput("path"));
    const outputDir = path.resolve(core.getInput("dest"));
    const ldflags = core.getInput("ldflags");
    const flags = core.getInput("flags");
    const includeVersion = core.getBooleanInput("includeVersion");

    const version = includeVersion ? await resolveVersion() : "";

    core.info(
      `build: ${[projectName, version].filter(Boolean).join(" ")} started...`,
    );

    // ensure the output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    const opts: BuildOptions = {
      projectName,
      projectPath,
      outputDir,
      version,
      ldflags,
      flags,
    };

    // build every platform concurrently
    const artifacts = await Promise.all(
      PLATFORMS.map((platform) => buildAndPackage(platform, opts)),
    );

    core.info("building complete.");

    // expose results to downstream steps
    core.setOutput("directory", outputDir);
    core.setOutput("artifacts", artifacts.join("\n"));

    // display the packaged artifacts
    await core.group(`artifacts in ${outputDir}`, () =>
      exec("ls", ["-lh", outputDir]),
    );
  } catch (error) {
    core.setFailed(
      `Action failed with error: ${error instanceof Error ? error.message : error}`,
    );
  }
}

await run();
