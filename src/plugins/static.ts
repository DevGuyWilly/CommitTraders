import path from 'node:path'
import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'
import { buildNotFoundPage, resolveSiteUrl, sendPage } from '../services/seo.service'

export default fp(async (fastify) => {
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', '..', 'frontend', 'dist')
  })

  // The SPA's real pages ("/" and "/instruments/:contractCode") have their own
  // routes, so anything landing here matches neither a file nor a page. It
  // still gets the app shell (the client redirects unknown paths to "/"), but
  // with a genuine 404 status and noindex so search engines drop the URL
  // instead of treating every path on the site as valid content.
  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`
      })
      return
    }

    return sendPage(reply, 404, buildNotFoundPage(), resolveSiteUrl(request))
  })
})
