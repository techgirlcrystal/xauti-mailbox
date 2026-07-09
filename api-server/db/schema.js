const { pgTable, serial, text, integer, timestamp } = require('drizzle-orm/pg-core');

const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull().references(() => clients.id),
  domainName: text('domain_name').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull().references(() => clients.id),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').default('base'),
  maxDomains: integer('max_domains').default(5),
  maxMailboxesPerDomain: integer('max_mailboxes_per_domain').default(5),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

module.exports = { clients, domains, subscriptions };
