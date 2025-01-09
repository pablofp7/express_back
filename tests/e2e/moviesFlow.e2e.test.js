import sinon from 'sinon'
import { createApp } from '../../src/app.js'
import { MovieModel } from '../../src/models/movie/mysql/movieModelSQL.js'
import { UserModel } from '../../src/models/user/mysql/userModelSQL.js'
import { CustomError, ERROR_TYPES } from '../../src/errors/customError.js'
import supertest from 'supertest'
import { expect } from 'chai'
import { config } from '../../src/config/config.js'

let request, dbConn

before(async () => {
  const { appInstance, dbConn: connections } = await generateAppInstance()
  dbConn = connections
  request = supertest(appInstance)
})

after(async () => {
  console.log('Finish After sentece...')
  if (dbConn) {
    for (const conn of Object.values(dbConn)) {
      if (conn) {
        await conn.close()
      }
    }
  }
})

afterEach(() => {
  sinon.restore()
})

console.log(`
  IMPORTANT NOTES!!!:
  - Ensure the MySQL server is running with the configuration specified in the testsEnv file.
  - Initialize the required tables using the SQL scripts in the sqlScripts directory.
  - The first admin account must be upgraded directly via the database, as there is no way to upgrade a user to Admin without an existing admin account.
  - Set the NODE_ENV variable to "test" during execution to use the testsEnv configuration.
    - If using npx mocha /path/to/file, set NODE_ENV manually (NODE_ENV=test npx...).
    - If using package.json, it is already configured.
`)

describe('E2E Tests for Movies Routes', () => {
  let accessTokenUser, refreshTokenUser
  let accessTokenAdmin, refreshTokenAdmin
  let createdMovieId
  describe('GetAll Route', () => {
    before(async () => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')

      const testUser = {
        username: 'testUser',
        password: 'password123',
      }
      const testAdmin = {
        username: 'testUserAdmin',
        password: 'password123',
      }

      const loginResUser = await request.post('/user/login').send(testUser)
      accessTokenUser = loginResUser.headers.authorization.split(' ')[1]
      refreshTokenUser = loginResUser.headers['set-cookie']
        .find((cookie) => cookie.startsWith('refreshToken='))
        .split(';')[0]
        .split('=')[1]

      const loginResAdmin = await request.post('/user/login').send(testAdmin)
      accessTokenAdmin = loginResAdmin.headers.authorization.split(' ')[1]
      refreshTokenAdmin = loginResAdmin.headers['set-cookie']

      sinon.restore()
    })

    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })

    it('should return 200 and all the movies for an authenticated user', async () => {
      const movieRes = await request
        .get('/movie/')
        .set('Authorization', `Bearer ${accessTokenUser}`)
        .set('Cookie', [`refreshToken=${refreshTokenUser}`])

      expect(movieRes.status).to.equal(200)
      expect(movieRes.body).to.be.an('array')

      const titles = movieRes.body.map((movie) => movie.title)
      expect(titles).to.include.members([
        'Inception',
        'The Shawshank Redemption',
        'The Dark Knight',
      ])
    })

    it('should filter by genre (auth user)', async () => {
      const movieRes = await request
        .get('/movie/?genre=Action')
        .set('Authorization', `Bearer ${accessTokenUser}`)
        .set('Cookie', [`refreshToken=${refreshTokenUser}`])

      expect(movieRes.status).to.equal(200)
      expect(movieRes.body).to.be.an('array')

      const titles = movieRes.body.map((movie) => movie.title)
      expect(titles).to.include.members(['Inception', 'The Dark Knight'])
      expect(titles).to.not.include.members(['The Shawshank Redemption'])
    })

    it('should return and access denied for unauthenticated users', async () => {
      const movieRes = await request
        .get('/movie/')

      expect(movieRes.status).to.equal(401)
      expect(movieRes.body).to.have.property('error', 'No token provided.')
    })
  })

  describe('Create Route', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 201 and create a new movie for an admin user', async () => {
      const newMovie = {
        title: 'Test Movie',
        year: 2014,
        genre: ['Action', 'Adventure'],
        director: 'DirectorTest',
        poster: 'https://www.mubis.es/media/users/10697/139077/cine-invisible-original.jpg',
        rate: 10,
        duration: 123,
      }

      const movieRes = await request
        .post('/movie/')
        .set('Authorization', `Bearer ${accessTokenAdmin}`)
        .set('Cookie', [`refreshToken=${refreshTokenAdmin}`])
        .send(newMovie)

      expect(movieRes.status).to.equal(201)
      expect(movieRes.body).to.have.property('id')
      expect(movieRes.body.title).to.deep.equal(newMovie.title)
      expect(movieRes.body.genre).to.deep.equal(newMovie.genre)

      createdMovieId = movieRes.body.id
    })

    it('should return 403 for a non-admin user', async () => {
      const newMovie = {
        title: 'Test Movie',
        year: 2014,
        genre: ['Action', 'Adventure'],
        director: 'DirectorTest',
        poster: 'https://www.mubis.es/media/users/10697/139077/cine-invisible-original.jpg',
        rate: 10,
        duration: 123,
      }

      const movieRes = await request
        .post('/movie/')
        .set('Authorization', `Bearer ${accessTokenUser}`)
        .set('Cookie', [`refreshToken=${refreshTokenUser}`])
        .send(newMovie)

      expect(movieRes.status).to.equal(403)
      expect(movieRes.body).to.have.property('error', 'Access denied.')
    })

    it('should return 401 for unauthenticated users', async () => {
      const newMovie = {
        title: 'Test Movie',
        year: 2014,
        genre: ['Action', 'Adventure'],
        director: 'DirectorTest',
        poster: 'https://www.mubis.es/media/users/10697/139077/cine-invisible-original.jpg',
        rate: 10,
        duration: 123,
      }

      const movieRes = await request
        .post('/movie/')
        .send(newMovie)

      expect(movieRes.status).to.equal(401)
      expect(movieRes.body).to.have.property('error', 'No token provided.')
    })
  })

  describe('GetById Route', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 200 and the movie details for an authenticated user', async () => {
      const movieRes = await request
        .get(`/movie/${createdMovieId}`)
        .set('Authorization', `Bearer ${accessTokenUser}`)
        .set('Cookie', [`refreshToken=${refreshTokenUser}`])

      expect(movieRes.status).to.equal(200)
      expect(movieRes.body).to.have.property('id', createdMovieId)
      expect(movieRes.body).to.have.property('title')
      expect(movieRes.body).to.have.property('genre')
    })

    it('should return 404 for a non-existent movie', async () => {
      const fakeID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
      const movieRes = await request
        .get(`/movie/${fakeID}`)
        .set('Authorization', `Bearer ${accessTokenUser}`)
        .set('Cookie', [`refreshToken=${refreshTokenUser}`])

      expect(movieRes.status).to.equal(404)
      expect(movieRes.body).to.have.property('error', 'Movie not found.')
    })

    it('should return 401 for unauthenticated users', async () => {
      const movieRes = await request
        .get(`/movie/${createdMovieId}`)

      expect(movieRes.status).to.equal(401)
      expect(movieRes.body).to.have.property('error', 'No token provided.')
    })
  })

  describe('Update Route', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 200 and update the movie for an admin user', async () => {
      const updatedMovie = {
        title: 'Interstellar Updated',
        genre: ['Sci-Fi'],
        year: 2014,
      }

      const movieRes = await request
        .patch(`/movie/${createdMovieId}`)
        .set('Authorization', `Bearer ${accessTokenAdmin}`)
        .set('Cookie', [`refreshToken=${refreshTokenAdmin}`])
        .send(updatedMovie)

      expect(movieRes.status).to.equal(200)
      expect(movieRes.body.movie).to.have.property('id', createdMovieId)
      expect(movieRes.body.movie.title).to.deep.equal(updatedMovie.title)
    })

    it('should return 403 for a non-admin user', async () => {
      const updatedMovie = {
        title: 'Interstellar Updated',
        genre: ['Sci-Fi'],
        year: 2014,
      }

      const movieRes = await request
        .patch(`/movie/${createdMovieId}`)
        .set('Authorization', `Bearer ${accessTokenUser}`)
        .set('Cookie', [`refreshToken=${refreshTokenUser}`])
        .send(updatedMovie)

      expect(movieRes.status).to.equal(403)
      expect(movieRes.body).to.have.property('error', 'Access denied.')
    })

    it('should return 401 for unauthenticated users', async () => {
      const updatedMovie = {
        title: 'Interstellar Updated',
        genre: ['Sci-Fi'],
        year: 2014,
      }

      const movieRes = await request
        .patch(`/movie/${createdMovieId}`)
        .send(updatedMovie)

      expect(movieRes.status).to.equal(401)
      expect(movieRes.body).to.have.property('error', 'No token provided.')
    })
  })

  describe('Delete Route', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 204 and delete the movie for an admin user', async () => {
      const movieRes = await request
        .delete(`/movie/${createdMovieId}`)
        .set('Authorization', `Bearer ${accessTokenAdmin}`)
        .set('Cookie', [`refreshToken=${refreshTokenAdmin}`])

      expect(movieRes.status).to.equal(200)
      expect(movieRes.body).to.have.property('message', 'Movie deleted')
    })

    it('should return 403 for a non-admin user', async () => {
      const movieRes = await request
        .delete(`/movie/${createdMovieId}`)
        .set('Authorization', `Bearer ${accessTokenUser}`)
        .set('Cookie', [`refreshToken=${refreshTokenUser}`])

      console.log(movieRes.body)

      expect(movieRes.status).to.equal(403)
      expect(movieRes.body).to.have.property('error', 'Access denied.')
    })

    it('should return 401 for unauthenticated users', async () => {
      const movieRes = await request
        .delete(`/movie/${createdMovieId}`)

      expect(movieRes.status).to.equal(401)
      expect(movieRes.body).to.have.property('error', 'No token provided.')
    })
  })
})

async function generateAppInstance() {
  try {
    const movieModel = new MovieModel({ movieDbType: 'local' })
    const userModel = new UserModel({ userDbType: 'local' })

    await Promise.all([movieModel.init(), userModel.init()])

    const appInstance = createApp({ movieModel, userModel })
    return { appInstance, dbConn: { movieConn: movieModel.databaseConnection, userConn: userModel.databaseConnection } }
  }
  catch (error) {
    if (error instanceof CustomError) {
      throw error
    }
    else {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.general.SERVER_ERROR,
      })
    }
  }
}
