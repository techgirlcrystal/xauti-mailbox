const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { clients } = require('../db/schema');

async function getOrCreateClient(userId) {
  const existing = await db
    .select()
    .from(clients)
    .where(eq(clients.clerkUserId, userId));

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(clients)
    .values({ clerkUserId: userId, email: '', name: null })
    .returning();

  return inserted[0];
}

module.exports = { getOrCreateClient };
