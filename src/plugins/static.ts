import path from 'node:path'
import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'

export default fp(async (fastify) => {
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', '..', 'public')
  })
})
