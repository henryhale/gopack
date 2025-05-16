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
    **default**: -s -w

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
        uses: henryhale/gopack@v1.0.1
        with:
          path: "./my-go-project"
          dest: "./dist"
          ldflags: "-s -w -X 'main.version=$(git describe --tags)'"

```

## notes

This action does not setup Go for you, use [actions/setup-go](https://github.com/actions/setup-go) yourself.

## development

- clone repository: `git clone https://github.com/henryhale/gopack.git && cd gopack`
- install dependencies: `pnpm install`
- implement change/bug fix/new feature in a new branch: `git checkout -b feat/xyz`
- commit changes: `git commit ...`
- build & update with: `pnpm release`
- creating a new release: `git tag v0.0.0 && git push --tags origin v0.0.0`

## license

Released under [MIT License](./LICENSE.txt).

&copy; 2025 - present [Henry Hale](https://henryhale.github.io)
