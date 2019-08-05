// @flow

import fs from 'fs';

import { _getParams, _writeEnvFile } from '../index';

jest.mock('fs');

function createEnvFile(content: string) {
  // $FlowExpectedError: this method exists only in our custom mock
  fs.__setMockFiles({ '.env': content });
}

describe('getParams', () => {
  beforeEach(() => {
    delete process.env.VAULT_TOKEN;
    delete process.env.VAULT_ADDR;
  });

  it('fails when required Vault param is missing', () => {
    expect(() =>
      _getParams({
        token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
        path: 'secret/sample/env',
      }),
    ).toThrow(new Error('You must provide Vault addr by "VAULT_ADDR" or --addr.'));
  });

  it('fails when required param is missing', () => {
    expect(() =>
      _getParams({
        addr: 'http:/localhost',
        token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
      }),
    ).toThrow(new Error('You must provide --path.'));
  });

  it('accepts standard Vault env variables as well', () => {
    process.env.VAULT_ADDR = 'https://example.com';
    const params = {
      token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
      path: 'secret/sample/envs',
    };
    expect(_getParams(params)).toEqual({
      addr: 'https://example.com',
      token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
      path: 'secret/sample/envs',
    });
  });

  it('just returns cli arguments if all required are present', () => {
    const params = {
      addr: 'http:/localhost',
      token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
      path: 'secret/sample/envs',
    };
    expect(_getParams(params)).toEqual(params);
  });
});

describe('writeEnvFile', () => {
  it("creates a new file if doesn't exist", async () => {
    await _writeEnvFile({ EXAMPLE_ENV: 'example-value' }, false);
    const output = fs.readFileSync('.env');
    expect(output).toBe('EXAMPLE_ENV=example-value');
  });

  it('fails when file already exists', () => {
    createEnvFile('mocked content');
    expect(() => {
      _writeEnvFile({ EXAMPLE_ENV: 'example-value' }, false);
    }).toThrow(new Error('.env file already exists, use --force to overwrite.'));
  });

  it('can overwrite file if specified', async () => {
    createEnvFile('mocked content');
    await _writeEnvFile({ EXAMPLE_ENV: 'example-value' }, true);
    const output = fs.readFileSync('.env');
    expect(output).toBe('EXAMPLE_ENV=example-value');
  });

  it('fails when trying to overwrite already existing keys', () => {
    createEnvFile('EXAMPLE_ENV="custom local content"');
    expect(() => {
      _writeEnvFile({ EXAMPLE_ENV: 'example-value' }, false);
    }).toThrow(
      new Error(
        'Cannot overwrite already existing key: EXAMPLE_ENV (use --force to overwrite anyway)',
      ),
    );
  });

  it('overwrites already existing keys if forced', () => {
    createEnvFile('EXAMPLE_ENV="custom local content"');
    _writeEnvFile({ EXAMPLE_ENV: 'example-value' }, true);
    const output = fs.readFileSync('.env');
    expect(output).toBe('EXAMPLE_ENV=example-value');
  });
});
