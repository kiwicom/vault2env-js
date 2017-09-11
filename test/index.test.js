const sinon = require('sinon')
const fs = require('fs-extra')
const vault2Env = require('../index')

describe('vault2env', function () {
  describe('getParams', function () {
    beforeEach(function () {
      delete process.env.VAULT_TOKEN
      delete process.env.VAULT_ADDR
    })

    it('fails when required Vault param is missing', function () {
      expect.assertions(2)

      try {
        vault2Env.getParams({
          token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
          path: 'secret/sample/env'
        })
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('You must provide Vault addr by "VAULT_ADDR" or --addr.')
      }
    })

    it('fails when required param is missing', function () {
      expect.assertions(1)

      try {
        vault2Env.getParams({
          addr: 'http:/localhost',
          token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5'
        })
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })

    it('accepts standard Vault env variables as well', function () {
      process.env.VAULT_ADDR = 'https://example.com'
      const params = {
        token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
        path: 'secret/sample/envs'
      }
      expect(vault2Env.getParams(params)).toEqual({
        addr: 'https://example.com',
        token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
        path: 'secret/sample/envs'
      })
    })

    it('just returns cli arguments if all required are present', function () {
      const params = {
        addr: 'http:/localhost',
        token: 'a86d995b-6afa-4076-a3ed-90f11c56d5e5',
        path: 'secret/sample/envs'
      }
      expect(vault2Env.getParams(params)).toEqual(params)
    })
  })

  describe('writeEnvFile', function () {
    beforeEach(function () {
      sinon.stub(fs, 'exists').returns(Promise.resolve(true))
      sinon.stub(fs, 'writeFile').returns(2)
    })

    afterEach(function () {
      if (fs.exists.restore) fs.exists.restore()
      if (fs.writeFile.restore) fs.writeFile.restore()
    })

    it('fails when file already exists', function () {
      expect.assertions(1)

      return vault2Env.writeEnvFile({
        EXAMPLE_ENV: 'example-value'
      }).catch((e) => expect(e.message).toBe(
        '.env file already exists, use --force to overwrite.'
      ))
    })

    it('can overwrite file if specified', function () {
      expect.assertions(1)

      return vault2Env.writeEnvFile({
        EXAMPLE_ENV: 'example-value'
      }, true).then(() => {
        const output = fs.writeFile.getCall(0).args[1]
        expect(output).toBe('EXAMPLE_ENV=example-value')
      })
    })
  })
})
