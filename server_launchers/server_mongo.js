import { createApp } from '../src/app.js'
import { MovieModel } from '../src/models/movie/mongodb/movieModelMongo.js'

createApp({ movieModel: MovieModel })
