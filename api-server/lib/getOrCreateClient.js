const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { clients, subscriptions } = require('../db/schema');

async function getOrCreateClient(userId, clerkClient) {
  const existing = await db
    .select()
    .from(clients)
    .where(eq(clients.clerkUserId, userId));

  if (existing.length > 0) {
    const client = existing[0];
    if (client.email === '') {
      const user = await clerkClient.users.getUser(userId);
      const email = user.primaryEmailAddress?.emailAddress || '';
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
      const updated = await db
        .update(clients)
        .set({ email, name })
        .where(eq(clients.id, client.id))
        .returning();
      return updated[0];
    }
    return client;
  }

  const user = await clerkClient.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress || '';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  let inserted;
  try {
    inserted = await db
      .insert(clients)
      .values({ clerkUserId: userId, email, name })
      .returning();
  } catch (e) {
    const retry = await db.select().from(clients).where(eq(clients.clerkUserId, userId));
    if (retry.length > 0) return retry[0];
    throw e;
  }

  try {
    await db.insert(subscriptions).values({
      clientId: inserted[0].id,
      plan: 'free',
      maxDomains: 1,
      maxMailboxesPerDomain: 2,
      status: 'active',
    });
  } catch (e) {
    console.error('Failed to create default subscription:', e.message);
  }

  return inserted[0];
}

module.exports = { getOrCreateClient };
