import { type FastifyPluginAsync } from 'fastify'
import { listLatestByInstrument } from '../services/cot.service'
import {
  buildOverviewPage,
  buildUnavailablePage,
  resolveSiteUrl,
  sendPage
} from '../services/seo.service'

const rootRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async (request, reply) => {
    const siteUrl = resolveSiteUrl(request)

    try {
      const instruments = await listLatestByInstrument()
      return sendPage(reply, 200, buildOverviewPage(instruments, siteUrl), siteUrl)
    } catch (err) {
      request.log.error(err, 'Failed to load instruments for the overview page')
      void reply.header('Retry-After', '300')
      return sendPage(reply, 503, buildUnavailablePage(), siteUrl)
    }
  })

  // The raw shell would otherwise be served as a second, empty copy of "/".
  fastify.get('/index.html', async (request, reply) => reply.redirect('/', 301))
}

export default rootRoute
