import { z } from 'zod'

const envFile = process.env.NODE_ENV === 'test' ? 'tests/e2e/testsEnv' : '.env'
process.loadEnvFile(envFile, 'utf-8')

const dbConfigSchema = z.object({
  freesql: z.object({
    host: z.string().min(1, 'DB_HOST_FREESQL is required'),
    user: z.string().min(1, 'DB_USER_FREESQL is required'),
    password: z.string().min(1, 'DB_PASSWORD_FREESQL is required'),
    name: z.string().min(1, 'DB_NAME_FREESQL is required'),
    port: z.string().regex(/^\d+$/, 'DB_PORT_FREESQL must be a number'),
    url: z.string().url('DB_URL_FREESQL must be a valid URL'),
  }),
  local: z.object({
    name: z.string().min(1, 'DB_NAME_SQL_LOCAL is required'),
    host: z.string().min(1, 'DB_HOST_SQL_LOCAL is required'),
    user: z.string().min(1, 'DB_USER_SQL_LOCAL is required'),
    password: z.string().default(''),
    port: z.string().regex(/^\d+$/, 'DB_PORT_SQL_LOCAL must be a number'),
    url: z.literal(null),
  }),
  turso: z.object({
    url: z.string().url('DB_URL_SQL_TURSO must be a valid URL'),
    token: z.string().min(1, 'DB_TOKEN_SQL_TURSO is required'),
  }),
})

const obtainedEnv = {
  freesql: {
    host: process.env.DB_HOST_FREESQL,
    user: process.env.DB_USER_FREESQL,
    password: process.env.DB_PASSWORD_FREESQL,
    name: process.env.DB_NAME_FREESQL,
    port: process.env.DB_PORT_FREESQL,
    url: process.env.DB_URL_FREESQL,
  },
  local: {
    name: process.env.DB_NAME_SQL_LOCAL,
    host: process.env.DB_HOST_SQL_LOCAL,
    user: process.env.DB_USER_SQL_LOCAL,
    password: process.env.DB_PASSWORD_SQL_LOCAL,
    port: process.env.DB_PORT_SQL_LOCAL,
    url: null,
  },
  turso: {
    url: process.env.DB_URL_SQL_TURSO,
    token: process.env.DB_TOKEN_SQL_TURSO,
  },
}

const parsedDbConfig = dbConfigSchema.safeParse(obtainedEnv)

if (!parsedDbConfig.success) {
  console.error('❌ Invalid database configuration:')
  console.error(JSON.stringify(parsedDbConfig.error.format(), null, 2))
  process.exit(1)
}

export const dbConfig = parsedDbConfig.data

export const getDatabaseConfigs = async ({ userDbType, movieDbType }) => {
  return {
    userDbConfig: dbConfig[userDbType] || undefined,
    movieDbConfig: dbConfig[movieDbType] || undefined,
  }
}
