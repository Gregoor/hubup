const childProcess = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const chalk = require('chalk');
const GitHubAPI = require('github');
const inquirer = require('inquirer');

const github = new GitHubAPI();

const packageInfo = require(process.env.PWD + '/package.json');

const Logger = {
  info(...args) {
    console.log(chalk.bold(...args));
  },
  success(...args) {
    console.log(chalk.green.bold(...args));
  },
  warn(...args) {
    console.log(chalk.yellow(...args));
  },
  error(...args) {
    console.log(chalk.red(...args));
  }
};

function execp(cmd) {
  return new Promise((resolve, reject) => childProcess.exec(cmd, {},
    (err, stdout, stderr) => err ? reject(err) : resolve({stdout, stderr})
  ));
}

function checkForPackageInfoRequirements() {
  if (!packageInfo.repository || !packageInfo.repository.url) {
    throw new Error(
      '{ "repository": { "url" } } is missing in package.json.\n[Reference: https://docs.npmjs.com/files/package.json#repository]'
    );
  }
}

async function promptVersionType() {
  return (await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What type of release is this?',
      choices: [
        'patch',
        'minor',
        'major',
      ]
    }
  ])).type;
}

async function promptGitHubToken() {
  if (process.env.GITHUB_API_TOKEN) {
    return process.env.GITHUB_API_TOKEN;
  }
  const questions = [{
    type: 'input',
    name: 'ghToken',
    validate: (value) => value.match(/^\w+$/) || 'Please enter a valid GitHub Personal access token',
    message: 'GitHub Personal access token:'
  }];

  Logger.warn(
    'GITHUB_API_TOKEN env variable not found (set GITHUB_API_TOKEN to skip this prompt)'
  );
  return (await inquirer.prompt(questions)).ghToken;
}

async function promptNotes() {
  return new Promise((resolve) => {
    const input = [];

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(chalk.green('Release notes (finish with Ctrl^D from newline):\n'), (answer) => {
      input.push(answer);
    });

    rl.on('line', function (cmd) {
      input.push(cmd);
    });

    rl.on('close', function (cmd) {
      resolve(input.join('\n'));
    });
  });
}

async function versionAndReturnTagName(versionType, releaseNotes) {
  Logger.info('Versioning package...');
  await execp(`npm version ${versionType} --force --message "Release %s\n\n${releaseNotes}"`);

  Logger.info('Pushing new release tag to GitHub...');
  await execp('git push --follow-tags');

  return (await execp('git describe --abbrev=0 --tags')).stdout.trim()
}

async function createGitHubRelease(tagName, notes) {
  const [owner, repo] = packageInfo.repository.url.match(/.com\/(\w+\/\w+)/)[1].split('/');

  Logger.info('Creating a new GitHub release...');
  const {data} = await github.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    name: tagName,
    body: notes || ''
  });

  const [command, workingDir, filePath, opts] = process.argv;
  if (filePath) {
    Logger.info('Uploading', filePath, 'to release...');
    await github.repos.uploadAsset(Object.assign({
      owner,
      repo,
      id: data.id,
      filePath,
      name: filePath
    }, opts ? JSON.parse(opts) : {}));
  }

  return data;
}

async function run() {
  checkForPackageInfoRequirements();

  github.authenticate({
    type: 'token',
    token: await promptGitHubToken()
  });

  const versionType = await promptVersionType();
  const notes = await promptNotes();
  const tagName = await versionAndReturnTagName(versionType, notes);

  const output = await createGitHubRelease(tagName, notes);
  Logger.success(`${tagName} released to GitHub - ${output.html_url}`);
  await execp('npm publish');

  const npmURL = `https://www.npmjs.com/package/${packageInfo.name}`;
  Logger.success(`${tagName} released to npm - ${npmURL}`);
}

run().catch((errorMessage) => {
  Logger.error('ERROR: ', errorMessage);
  process.exit(1);
});

