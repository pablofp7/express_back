import { z } from 'zod'

const envFile = process.env.NODE_ENV === 'test' ? 'tests/e2e/testsEnv' : '.env'
process.loadEnvFile(envFile, 'utf-8')

const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').default('3000'),
  SALT_ROUNDS: z.string().regex(/^\d+$/, 'SALT_ROUNDS must be a number').default('8'),
  NODE_ENV: z.string().default('development'),
  ACC_TOKEN_LIFE: z.string().optional(),
  REF_TOKEN_LIFE: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REFRESH_SECRET: z.string().min(1, 'REFRESH_SECRET is required'),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('❌ Environment validation failed:', parsedEnv.error.format())
  process.exit(1)
}

const env = parsedEnv.data

function evaluateTimeExpression(envValue) {
  if (!envValue) return null
  try {
    return eval(envValue)
  }
  catch (error) {
    throw new Error(
      `Invalid expression in environment variable: ${envValue}. Error: ${error.message}`,
    )
  }
}

const config = {
  port: parseInt(env.PORT, 10),
  saltRounds: parseInt(env.SALT_ROUNDS, 10),
  nodeEnv: env.NODE_ENV,
  accessTokenLifetime: evaluateTimeExpression(env.ACC_TOKEN_LIFE),
  refreshTokenLifetime: evaluateTimeExpression(env.REF_TOKEN_LIFE),
  jwtSecret: env.JWT_SECRET,
  refreshTokenSecret: env.REFRESH_SECRET,
}

export { config }
