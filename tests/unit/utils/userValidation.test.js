import * as chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const { expect } = chai

describe('UserValidation', () => {
  let validateUser
  let validatePartialUser
  let validatorEscapeStub

  beforeEach(async () => {
    validatorEscapeStub = sinon.stub().callsFake((input) => input)

    const MockedValidation = await esmock('../../../src/utils/userValidation.js', {
      validator: {
        escape: validatorEscapeStub,
      },
    })

    validateUser = MockedValidation.validateUser
    validatePartialUser = MockedValidation.validatePartialUser
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('validateUser', () => {
    it('should validate a correct user input', async () => {
      const input = {
        username: 'TestUser',
        email: 'testuser@example.com',
        password: 'securePassword',
        age: 25,
      }

      const result = await validateUser(input)

      expect(result).to.be.true
      expect(validatorEscapeStub.calledOnceWith('TestUser')).to.be.true
    })

    it('should return false for missing required fields', async () => {
      const input = {
        email: 'testuser@example.com',
      }

      const result = await validateUser(input)

      expect(result).to.be.false
    })

    it('should validate optional fields correctly', async () => {
      const input = {
        username: 'TestUser',
        password: 'securePassword',
      }

      const result = await validateUser(input)

      expect(result).to.be.true
    })

    it('should return false for invalid email', async () => {
      const input = {
        username: 'TestUser',
        email: 'invalid-email',
        password: 'securePassword',
      }

      const result = await validateUser(input)

      expect(result).to.be.false
    })

    it('should return false for short username', async () => {
      const input = {
        username: 'ab',
        email: 'testuser@example.com',
        password: 'securePassword',
      }

      const result = await validateUser(input)

      expect(result).to.be.false
    })

    it('should return false for short password', async () => {
      const input = {
        username: 'TestUser',
        email: 'testuser@example.com',
        password: '12345',
      }

      const result = await validateUser(input)

      expect(result).to.be.false
    })
  })

  describe('validatePartialUser', () => {
    it('should validate partial input with some fields missing', async () => {
      const input = {
        username: 'PartialUser',
      }

      const result = await validatePartialUser(input)

      expect(result).to.be.true
      expect(validatorEscapeStub.calledOnceWith('PartialUser')).to.be.true
    })

    it('should allow empty input', async () => {
      const input = {}

      const result = await validatePartialUser(input)

      expect(result).to.be.true
    })

    it('should return false for invalid fields in partial input', async () => {
      const input = {
        username: 'ab',
        email: 'invalid-email',
      }

      const result = await validatePartialUser(input)

      expect(result).to.be.false
    })
  })
})
