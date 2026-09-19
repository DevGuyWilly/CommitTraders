import fp from 'fastify-plugin'

// Googlebot has to be able to fetch /api/ to render the SPA, so it isn't
// blocked in robots.txt — but the raw JSON shouldn't show up in search
// results either. noindex on the response keeps it crawlable and unindexed.
export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      void reply.header('X-Robots-Tag', 'noindex')
    }
  })
})
