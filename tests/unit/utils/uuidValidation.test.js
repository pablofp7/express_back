import * as chai from 'chai'
import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import esmock from 'esmock'

chai.use(chaiAsPromised)
const { expect } = chai

describe('UUID Validation', () => {
  let checkUUID

  beforeEach(async () => {
    const MockedValidation = await esmock('../../../src/utils/uuidValidation.js', {})
    checkUUID = MockedValidation.checkUUID
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('checkUUID', () => {
    it('should validate a correct UUID', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'

      const result = await checkUUID(validUUID)

      expect(result).to.be.true
    })

    it('should invalidate an incorrect UUID', async () => {
      const invalidUUID = 'not-a-valid-uuid'

      const result = await checkUUID(invalidUUID)

      expect(result).to.be.false
    })

    it('should invalidate an empty string', async () => {
      const emptyString = ''

      const result = await checkUUID(emptyString)

      expect(result).to.be.false
    })

    it('should trim and validate a correct UUID', async () => {
      const validUUIDWithSpaces = '   123e4567-e89b-12d3-a456-426614174000   '

      const result = await checkUUID(validUUIDWithSpaces)

      expect(result).to.be.true
    })

    it('should invalidate a malformed UUID', async () => {
      const malformedUUID = '123e4567-e89b-12d3-a456-42661417400'

      const result = await checkUUID(malformedUUID)

      expect(result).to.be.false
    })
  })
})
