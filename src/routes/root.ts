import { type FastifyPluginAsync } from 'fastify'

const rootRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async () => {
    return { status: 'ok', name: 'commit-traders-api' }
  })
}

export default rootRoute
