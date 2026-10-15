// Data retention: journal text older than RETENTION_DAYS (default 180) is purged.
// Only the free text is removed; the mood score is kept so that trend charts remain valid.
const MoodEntry = require('../models/MoodEntry');

const RETENTION_DAYS = () => parseInt(process.env.JOURNAL_RETENTION_DAYS, 10) || 180;

async function purgeOldJournals(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS() * 24 * 60 * 60 * 1000);
  const r = await MoodEntry.updateMany(
    { date: { $lt: cutoff }, journal: { $exists: true, $nin: [null, ''] } },
    { $unset: { journal: 1 } }
  );
  return r.modifiedCount;
}

function scheduleRetention() {
  const run = () => purgeOldJournals().catch((e) => console.error('retention purge failed:', e.message));
  run();
  return setInterval(run, 24 * 60 * 60 * 1000).unref();
}

module.exports = { purgeOldJournals, scheduleRetention, RETENTION_DAYS };
