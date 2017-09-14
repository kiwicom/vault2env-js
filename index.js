#!/usr/bin/env node

const co = require('co');
const fs = require('fs-extra');
const request = require('request-promise-native');
const argv = require('minimist')(process.argv.slice(2));

const getParams = (exports.getParams = params => {
  const requiredVaultParams = ['addr', 'token'];
  const requiredParams = ['path'];
  const vaultParams = requiredVaultParams
    .map(param => {
      const envName = `VAULT_${param.toUpperCase()}`;
      const value = params[param] || process.env[envName];
      if (!value) {
        throw new Error(
          `You must provide Vault ${param} by "${envName}" or --${param}.`
        );
      }

      return { [param]: value };
    })
    .reduce((memo, item) => Object.assign({}, memo, item), {});
  requiredParams.forEach(param => {
    if (!params[param]) {
      throw new Error(`You must provide --${param}.`);
    }
  });

  return Object.assign({}, params, vaultParams);
});

const getSecrets = (exports.getSecrets = co.wrap(function*(addr, path, token) {
  const apiVersion = 'v1';

  const response = yield request([addr, apiVersion, path].join('/'), {
    method: 'GET',
    headers: {
      'X-Vault-Token': token,
    },
  });
  try {
    const json = JSON.parse(response);

    return json.data;
  } catch (err) {
    throw new Error(
      `Error while parsing JSON response from vault: ${err.message}`
    );
  }
}));

const writeEnvFile = (exports.writeEnvFile = co.wrap(function*(secrets, force) {
  const output = Object.keys(secrets)
    .map(key => `${key}=${secrets[key]}`)
    .join('\n');

  if (!output) {
    throw new Error('No secrets to write!');
  }

  if (!force) {
    if (yield fs.exists('.env')) {
      throw new Error('.env file already exists, use --force to overwrite.');
    }
  }

  return fs.writeFile('.env', output, { encoding: 'utf-8' });
}));

if (require.main === module) {
  co(function*() {
    const params = getParams(argv);
    const secrets = yield getSecrets(params.addr, params.path, params.token);
    yield writeEnvFile(secrets, params.force);

    return secrets;
  }).then(
    secrets => {
      console.log('Retrieved secrets:');
      console.log(Object.keys(secrets).join('\n'));
      console.log('\n.env file created.\n');
    },
    err => {
      console.error(`Error while retrieving secrets: ${err.message}`);
      process.exit(1);
    }
  );
}
