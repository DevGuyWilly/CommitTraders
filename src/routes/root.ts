import { type FastifyPluginAsync } from 'fastify'

const rootRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async (request, reply) => {
    return reply.sendFile('index.html')
  })
}

export default rootRoute
