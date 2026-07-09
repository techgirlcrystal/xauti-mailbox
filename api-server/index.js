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
const migaduAuth = { username: MIGADU_EMAIL, password: MIGADU_API_KEY };

const app = express();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

async function requireDomainOwnership(req, res) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const client = await getOrCreateClient(userId);
  const owned = await db
    .select()
    .from(domains)
    .where(and(eq(domains.clientId, client.id), eq(domains.domainName, req.params.domain)));
  if (owned.length === 0) {
    res.status(403).json({ error: 'You do not own this domain' });
    return null;
  }
  return client;
}

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
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { domain } = req.params;
    const response = await axios.get(
      `https://api.migadu.com/v1/domains/${domain}/mailboxes`,
      { auth: migaduAuth }
    );
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message || 'Failed to fetch mailboxes';
    res.status(status).json({ error: message });
  }
});

app.post('/api/domains/:domain/mailboxes', async (req, res) => {
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { localPart, name, password } = req.body;
    if (!localPart || !password) {
      return res.status(400).json({ error: 'localPart and password are required' });
    }
    const { domain } = req.params;
    const response = await axios.post(
      `https://api.migadu.com/v1/domains/${domain}/mailboxes`,
      { local_part: localPart, name: name || localPart, password },
      { auth: migaduAuth }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/domains/:domain/mailboxes/:localPart', async (req, res) => {
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { domain, localPart } = req.params;
    try {
      await axios.delete(
        `https://api.migadu.com/v1/domains/${domain}/mailboxes/${localPart}`,
        { auth: migaduAuth }
      );
    } catch (migaduError) {
      if (migaduError.response?.status === 500) {
        return res.json({ deleted: true });
      }
      throw migaduError;
    }
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/domains/:domain/mailboxes/:localPart/password', async (req, res) => {
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }
    const { domain, localPart } = req.params;
    await axios.put(
      `https://api.migadu.com/v1/domains/${domain}/mailboxes/${localPart}`,
      { password },
      { auth: migaduAuth }
    );
    res.json({ updated: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
