import { type FastifyPluginAsync } from 'fastify'
import { listLatestByInstrument } from '../services/cot.service'
import { buildRobotsTxt, buildSitemapXml, resolveSiteUrl } from '../services/seo.service'

const seoRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/robots.txt', async (request, reply) => {
    return reply
      .header('Cache-Control', 'public, max-age=3600')
      .type('text/plain; charset=utf-8')
      .send(buildRobotsTxt(resolveSiteUrl(request)))
  })

  fastify.get('/sitemap.xml', async (request, reply) => {
    try {
      const instruments = await listLatestByInstrument()
      return reply
        .header('Cache-Control', 'public, max-age=3600')
        .type('application/xml; charset=utf-8')
        .send(buildSitemapXml(instruments, resolveSiteUrl(request)))
    } catch (err) {
      request.log.error(err, 'Failed to build sitemap')
      return reply.header('Retry-After', '300').serviceUnavailable('Sitemap temporarily unavailable')
    }
  })
}

export default seoRoutes
