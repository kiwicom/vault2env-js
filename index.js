#!/usr/bin/env node

const co = require('co');
const fs = require('fs-extra');
const request = require('request-promise-native');
const argv = require('minimist')(process.argv.slice(2));

const getSecrets = co.wrap(function* (vaultToken) {
  const url = argv.addr || process.env.VAULT_ADDR;
  const apiVersion = 'v1';
  const path = argv.path;
  const response = yield request([url, apiVersion, path].join('/'), {
    method: 'GET',
    headers: {
      'X-Vault-Token': vaultToken,
    },
  });
  try {
    const json = JSON.parse(response);

    return json.data;
  } catch (err) {
    throw new Error(`Error while parsing JSON response from vault: ${err.message}`);
  }
});

const writeEnvFile = (secrets) => {
  const output = Object.keys(secrets)
    .map(key => `${key}=${secrets[key]}`)
    .join('\n');

  if (!output) {
    throw new Error('No secrets to write!');
  }

  return fs.writeFile('.env', output, {encoding: 'utf-8'});
};

co(function* () {
  const vaultToken = argv.token || process.env.VAULT_TOKEN;

  if (!vaultToken) {
    throw new Error('You must pass Vault token either by VAULT_TOKEN env or --token');
  }

  const secrets = yield getSecrets(vaultToken);
  yield writeEnvFile(secrets);

  return secrets;
}).then(
  (secrets) => {
    console.log('Retrieved secrets:');
    console.log(Object.keys(secrets).join('\n'));
    console.log('\n.env file created.\n');
  },
  (err) => {
    console.error(`Error while retrieving secrets: ${err.message}`);
    process.exit(1);
  }
);
