import * as chai from 'chai'
import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import esmock from 'esmock'

chai.use(chaiAsPromised)
const { expect } = chai

describe('IP Validation', () => {
  let checkIP

  beforeEach(async () => {
    const MockedValidation = await esmock('../../../src/utils/ipValidator.js', {})
    checkIP = MockedValidation.checkIP
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('checkIP', () => {
    it('should validate a correct IPv4 address', async () => {
      const validIPv4 = '192.168.0.1'

      const result = await checkIP(validIPv4)

      expect(result).to.be.true
    })

    it('should validate a correct IPv6 address', async () => {
      const validIPv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'

      const result = await checkIP(validIPv6)

      expect(result).to.be.true
    })

    it('should invalidate an incorrect IP address', async () => {
      const invalidIP = '999.999.999.999'

      const result = await checkIP(invalidIP)

      expect(result).to.be.false
    })

    it('should invalidate an empty string', async () => {
      const emptyString = ''

      const result = await checkIP(emptyString)

      expect(result).to.be.false
    })

    it('should validate an IPv4 address with leading/trailing spaces', async () => {
      const validIPv4WithSpaces = '   192.168.0.1   '

      const result = await checkIP(validIPv4WithSpaces)

      expect(result).to.be.true
    })

    it('should invalidate a malformed IPv4 address', async () => {
      const malformedIPv4 = '192.168.0'

      const result = await checkIP(malformedIPv4)

      expect(result).to.be.false
    })

    it('should validate a compressed valid IPv6 address', async () => {
      const validIPv6 = '2001:0db8:85a3::8a2e:0370'

      const result = await checkIP(validIPv6)

      expect(result).to.be.true
    })

    it('should invalidate a malformed IPv6 address', async () => {
      const malformedIPv6 = '2001:0db8:85a3:xyz::1234'

      const result = await checkIP(malformedIPv6)

      expect(result).to.be.false
    })
  })
})
