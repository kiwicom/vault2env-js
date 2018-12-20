// @flow

const fs = require('fs');

const vault2Env = require('../index');

describe('getParams', () => {
  beforeEach(() => {
    delete process.env.VAULT_TOKEN;
    delete process.env.VAULT_ADDR;
  });

  it('fails when required Vault param is missing', () => {
    expect(() =>
      vault2Env._getParams({
        token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
        path: 'secret/sample/env',
      }),
    ).toThrow(
      new Error('You must provide Vault addr by "VAULT_ADDR" or --addr.'),
    );
  });

  it('fails when required param is missing', () => {
    expect(() =>
      vault2Env._getParams({
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
    expect(vault2Env._getParams(params)).toEqual({
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
    expect(vault2Env._getParams(params)).toEqual(params);
  });
});

describe('writeEnvFile', () => {
  let fsWriteFile;
  beforeEach(() => {
    fsWriteFile = jest.spyOn(fs, 'writeFile').mockImplementation(jest.fn());
    jest.spyOn(fs, 'access').mockImplementation((x, y, cb) => cb(null));
  });

  afterEach(() => {
    fsWriteFile.mockRestore();
  });

  it('fails when file already exists', () => {
    expect(() => {
      vault2Env._writeEnvFile(
        {
          EXAMPLE_ENV: 'example-value',
        },
        false,
      );
    }).toThrow(
      new Error('.env file already exists, use --force to overwrite.'),
    );
  });

  it('can overwrite file if specified', async () => {
    await vault2Env._writeEnvFile(
      {
        EXAMPLE_ENV: 'example-value',
      },
      true,
    );

    const output = fsWriteFile.mock.calls[0][1];
    expect(output).toBe('EXAMPLE_ENV=example-value');
  });
});
