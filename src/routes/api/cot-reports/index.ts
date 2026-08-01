import { type FastifyPluginAsync } from 'fastify'
import { getHistoryByContractCode, listLatestByInstrument } from '../../../services/cot.service'

const cotReports: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async () => {
    return listLatestByInstrument()
  })

  fastify.get<{
    Params: { contractCode: string }
    Querystring: { limit?: string, before?: string }
  }>('/:contractCode', async (request, reply) => {
    const { limit, before } = request.query

    if (before !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
      return reply.badRequest('before must be a date in YYYY-MM-DD format')
    }

    const parsedLimit = limit !== undefined ? Number(limit) : undefined

    if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit < 1)) {
      return reply.badRequest('limit must be a positive integer')
    }

    const { rows, nextCursor } = await getHistoryByContractCode(request.params.contractCode, {
      limit: parsedLimit,
      before
    })

    // An empty first page means the instrument doesn't exist; an empty
    // subsequent page just means we've paged past the end of its history.
    if (rows.length === 0 && before === undefined) {
      return reply.notFound(`No COT data found for contract code ${request.params.contractCode}`)
    }

    return { data: rows, nextCursor }
  })
}

export default cotReports
