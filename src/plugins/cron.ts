import fp from 'fastify-plugin'
import cron from 'node-cron'
import { runWeeklyCftcIngestion } from '../jobs/weekly-cftc.job'

// CFTC report schedule is tied to US time regardless of server locale.
// Normally releases Friday 3:30pm ET, but federal holidays can delay it by
// 1-2 days (e.g. Thanksgiving/Christmas weeks) — running again Saturday and
// Monday evenings catches a delayed report within a day or two. Ingestion
// is idempotent, so the extra runs are harmless on a normal week.
const CFTC_INGESTION_SCHEDULE = '0 20 * * 5,6,1' // Fri/Sat/Mon 8:00pm America/New_York
const CFTC_INGESTION_TIMEZONE = 'America/New_York'

export default fp(async (fastify) => {
  const task = cron.schedule(
    CFTC_INGESTION_SCHEDULE,
    async () => {
      fastify.log.info('Starting weekly CFTC ingestion')

      try {
        const summaries = await runWeeklyCftcIngestion()

        for (const summary of summaries) {
          fastify.log.info(
            { report: summary.reportName, instrumentsIngested: summary.instrumentsIngested },
            'Ingested CFTC report'
          )
        }
      } catch (err) {
        fastify.log.error(err, 'Weekly CFTC ingestion failed')
      }
    },
    { timezone: CFTC_INGESTION_TIMEZONE }
  )

  fastify.addHook('onClose', () => {
    task.stop()
  })
})
