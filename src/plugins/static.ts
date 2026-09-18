import path from 'node:path'
import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'

export default fp(async (fastify) => {
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', '..', 'frontend', 'dist')
  })

  // SPA fallback: client-side routes (e.g. /instruments/:contractCode) have
  // no matching file on disk, so a direct load or refresh would otherwise
  // 404. Genuine unmatched API routes still 404 with the usual shape.
  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`
      })
      return
    }

    reply.sendFile('index.html')
  })
})
