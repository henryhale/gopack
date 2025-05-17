# gopack

A github action to build and package Go projects

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
6. `checksum`:
  - **description**: A file to contain checksums for all binaries.
  - **required**: false
  - **default**: checksums.txt

## outputs

The built binaries are located under the `output` directory.

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

      # Setup Go
      # use actions/setup-go
      # ...

      # build with go
      - name: Build and package binaries 
        uses: henryhale/gopack@v1.0.2
        with:
          path: "./my-go-project"
          dest: "./dist"
          ldflags: "-s -w -X 'main.version=$(git describe --tags)'"
          flags: "-trimpath"
          checksum: "checksums.txt"

```

## notes

This action does not setup Go for you, use [actions/setup-go](https://github.com/actions/setup-go) yourself.

## license 

Released under [MIT License](./LICENSE.txt).

&copy; 2025 - present [Henry Hale](https://henryhale.github.io)
