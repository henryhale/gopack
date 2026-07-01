# gopack

A personal github action to build and package Go projects.

## inputs

1. `name`:
  - **description**: The name of the project or binary to be produced
  - **required**: true
2. `path`:
  - **description**: Path to the golang project (relative to the repository root).
  - **required**: true
  - **default**: current working directory
3. `dest`:
  - **description**: Directory where the built files will be placed.
  - **required**: false
  - **default**: ./dist/
4. `ldflags`:
  - **description**: Value to -ldflags build option.
  - **required**: false
  - **default**: -s -w
5. `flags`:
  - **description**: Flags to pass to 'go build' command
  - **required**: false
  - **default**: ""
6. `includeVersion`:
  - **description**: Whether or not to add the current tag or commit in release name.
  - **required**: false
  - **default**: false

## outputs

1. `directory`:
  - **description**: Absolute path to the directory containing the packaged archives.
2. `artifacts`:
  - **description**: Newline-separated list of the packaged archive file names.

The packaged archives (`.tar.gz` / `.zip`) are written to the `dest` directory.
Checksums are no longer generated — GitHub produces them automatically when the
archives are uploaded as release assets.

## usage

```yaml
on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # checkout repository
      - uses: actions/checkout@v4

      # setup go
      - uses: actions/setup-go@v5
        with:
          go-version: ">=1.24.0" # the go version to install and use
      # ...

      # build with go
      - name: Build and package binaries
        uses: henryhale/gopack@v1.0.3
        with:
          path: "./my-go-project"
          dest: "./dist"
          ldflags: "-s -w"
          flags: "-trimpath"
          includeVersion: "true"

```

## license

Released under [MIT License](./LICENSE.txt).

&copy; 2025 - present [Henry Hale](https://henryhale.github.io)
