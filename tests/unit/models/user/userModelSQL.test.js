import sinon from 'sinon'
import { UserModel } from '../../../../src/models/user/mysql/userModelSQL.js'
import { DbConn } from '../../../../src/database/dbConnection.js'
import bcrypt from 'bcrypt'
import { CustomError } from '../../../../src/errors/customError.js'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
const { expect } = chai

describe('UserModel', () => {
  let userModel
  let dbConnMock

  beforeEach(() => {
    dbConnMock = {
      query: sinon.stub(),
      executeTransaction: sinon.stub(),
      beginTransaction: sinon.stub(),
      commitTransaction: sinon.stub(),
      rollbackTransaction: sinon.stub(),
    }

    sinon.stub(DbConn.prototype, 'query').callsFake(dbConnMock.query)
    dbConnMock.executeTransaction.callsFake(async (queries) => {
      for (const query of queries) {
        await query()
      }
    })
    sinon.stub(DbConn.prototype, 'executeTransaction').callsFake(dbConnMock.executeTransaction)

    userModel = new UserModel({ userDbType: 'sql' })
    userModel.databaseConnection = new DbConn() // Usa el mock
  })

  afterEach(() => {
    sinon.restore() // Restaura todos los stubs
  })

  describe('createUser', () => {
    it('debería crear un usuario con datos válidos', async () => {
      const input = {
        username: 'testUser',
        password: 'password123',
        email: 'test@example.com',
        age: 30,
      }

      const salt = 10
      const hashedPassword = await bcrypt.hash(input.password, salt)

      // Stub de bcrypt.hash
      sinon.stub(bcrypt, 'hash').resolves(hashedPassword)

      // Configuración del mock de DbConn
      dbConnMock.query
        .onFirstCall().resolves() // Simula la inserción del usuario
        .onSecondCall().resolves([{ id: '1' }]) // Simula el SELECT del rol
        .onThirdCall().resolves() // Simula la inserción en user_roles

      const result = await userModel.createUser({ input })

      // Verifica que el resultado contiene los datos correctos
      expect(result).to.include({
        username: input.username,
        email: input.email,
        age: input.age,
        role: 'User',
      })
      expect(result.id).to.be.a('string') // Verifica que el id es una cadena

      // Verifica que las consultas fueron llamadas en el orden correcto
      expect(dbConnMock.query.calledThrice).to.be.true
      expect(dbConnMock.query.getCall(0).args[0].query).to.include('INSERT INTO user')
      expect(dbConnMock.query.getCall(1).args[0].query).to.include('SELECT id FROM role')
      expect(dbConnMock.query.getCall(2).args[0].query).to.include('INSERT INTO user_roles')

      // Verifica que executeTransaction fue llamado
      expect(dbConnMock.executeTransaction.calledOnce).to.be.true
    })
  })

  /* Faltan:
    authenticateUser
    deleteUser
    updateUser
    getUserByUsername
    getUserByEmail
    saveToken
    revokeToken
    checkToken
  */
})
