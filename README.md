# hubup [![NPM Package](https://img.shields.io/npm/v/hubup.svg)](https://www.npmjs.com/package/hubup)

Automate the full release process for npm packages.

When publishing npm packages, there is more to do than just running `npm package`.  Usually, you end up doing the following steps:
- Versioning
- Creating a release on GitHub with release notes
- Publishing to npm

hubup automates these steps in a simple way.  Simply run `npm run release`, specify the release type (major, minor, patch), provide release notes and you are done.  After hubup finishes, you will have a new version of your package available on npm as well as a corresponding release on GitHub with release notes.

## Usage

1. Install hubup
```
yarn add --dev hubup
#or
npm i --save-dev hubup
```

2. Add a new `release` script to your `package.json` file

```
"scripts": {
  "release": "hubup"
}
```

3. Run `npm run release`.

## Settings

### GitHub Personal Access Token
A [GitHub Personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) will be needed to create the release on GitHub.  Adding this token to an environment variable named `GITHUB_API_TOKEN` is recommended as this will allow hubup to skip prompting for it.

### Uploading assets with a release
A filepath relative to the directory from which `hubup` is called can be provided as argument, so that it'll be uploaded with the release:
```
hubup package.json
```

If you want to provide your own options (`name` or `contentType`), provide them as the argument after (as JSON):
```
hubup package.json '{"contentType":"application/json","name":"whatever"}'
```