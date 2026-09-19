import { type FastifyPluginAsync } from 'fastify'
import { getHistoryByContractCode, getLatestSummary } from '../services/cot.service'
import {
  buildInstrumentPage,
  buildNotFoundPage,
  buildUnavailablePage,
  resolveSiteUrl,
  sendPage
} from '../services/seo.service'

const SNAPSHOT_WEEKS = 12

// Serves the SPA's instrument route with server-rendered head tags and a
// crawlable snapshot. Unknown contract codes get a real 404 — the SPA shell
// alone would answer 200 for any code and leave "soft 404" URLs in the index.
const instrumentRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Params: { contractCode: string } }>('/instruments/:contractCode', async (request, reply) => {
    const siteUrl = resolveSiteUrl(request)

    try {
      const summary = await getLatestSummary(request.params.contractCode)

      if (summary === null) {
        return sendPage(reply, 404, buildNotFoundPage(), siteUrl)
      }

      const { rows } = await getHistoryByContractCode(request.params.contractCode, { limit: SNAPSHOT_WEEKS })
      return sendPage(reply, 200, buildInstrumentPage(summary, rows, siteUrl), siteUrl)
    } catch (err) {
      request.log.error(err, 'Failed to load instrument for page render')
      void reply.header('Retry-After', '300')
      return sendPage(reply, 503, buildUnavailablePage(), siteUrl)
    }
  })
}

export default instrumentRoutes
