import fp from 'fastify-plugin'
import { pool } from '../db/client'

/**
 * Decorates the Fastify instance with the shared pg Pool so routes/services
 * can query via `fastify.pg`, and closes it when the app shuts down.
 */
export default fp(async (fastify) => {
  fastify.decorate('pg', pool)

  fastify.addHook('onClose', async () => {
    await pool.end()
  })
})

declare module 'fastify' {
  export interface FastifyInstance {
    pg: typeof pool
  }
}
