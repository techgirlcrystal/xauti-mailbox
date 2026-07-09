require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { clerkMiddleware, getAuth } = require('@clerk/express');
const { eq, and } = require('drizzle-orm');
const { db } = require('./db');
const { clients, domains } = require('./db/schema');
const { getOrCreateClient } = require('./lib/getOrCreateClient');

const { MIGADU_EMAIL, MIGADU_API_KEY } = process.env;
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/db-test', async (req, res) => {
  try {
    const rows = await db.select().from(clients);
    res.json({ connected: true, clientCount: rows.length });
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

app.get('/api/my/domains', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await getOrCreateClient(userId);
    const rows = await db
      .select()
      .from(domains)
      .where(eq(domains.clientId, client.id));
    res.json({ domains: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/my/domains', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { domainName } = req.body;
    if (!domainName) {
      return res.status(400).json({ error: 'domainName is required' });
    }
    const client = await getOrCreateClient(userId);
    const inserted = await db
      .insert(domains)
      .values({ clientId: client.id, domainName, status: 'pending' })
      .returning();
    res.json({ domain: inserted[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/domains/:domain/mailboxes', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { domain } = req.params;
    const client = await getOrCreateClient(userId);
    const owned = await db
      .select()
      .from(domains)
      .where(and(eq(domains.clientId, client.id), eq(domains.domainName, domain)));
    if (owned.length === 0) {
      return res.status(403).json({ error: 'You do not own this domain' });
    }
    const response = await axios.get(
      `https://api.migadu.com/v1/domains/${domain}/mailboxes`,
      {
        auth: {
          username: MIGADU_EMAIL,
          password: MIGADU_API_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message || 'Failed to fetch mailboxes';
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
