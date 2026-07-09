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
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
    const cleaned = domainName.trim().toLowerCase();
    if (!domainRegex.test(cleaned)) {
      return res.status(400).json({ error: 'Invalid domain name. Use format: example.com' });
    }
    const client = await getOrCreateClient(userId);

    const existing = await db
      .select()
      .from(domains)
      .where(and(eq(domains.clientId, client.id), eq(domains.domainName, cleaned)));
    if (existing.length > 0) {
      return res.status(409).json({ error: 'You already added this domain' });
    }

    const inserted = await db
      .insert(domains)
      .values({ clientId: client.id, domainName: cleaned, status: 'pending' })
      .returning();

    let existsInMigadu = false;
    try {
      await axios.get(`https://api.migadu.com/v1/domains/${cleaned}`, { auth: migaduAuth });
      existsInMigadu = true;
    } catch (e) {
      existsInMigadu = false;
    }

    if (!existsInMigadu) {
      try {
        await axios.post('https://api.migadu.com/v1/domains', { domain_name: cleaned }, { auth: migaduAuth });
      } catch (migaduError) {
        console.error('Migadu domain create failed:', {
          status: migaduError.response?.status,
          data: migaduError.response?.data,
          message: migaduError.message,
        });
        await db.delete(domains).where(eq(domains.id, inserted[0].id));
        return res.status(500).json({ error: 'Failed to create domain in Migadu' });
      }
    }

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

app.get('/api/domains/:domain/dns', async (req, res) => {
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { domain } = req.params;
    const domainResponse = await axios.get(
      `https://api.migadu.com/v1/domains/${domain}`,
      { auth: migaduAuth }
    );
    let diagnostics = null;
    try {
      const diagnosticsResponse = await axios.get(
        `https://api.migadu.com/v1/domains/${domain}/diagnostics`,
        { auth: migaduAuth }
      );
      diagnostics = diagnosticsResponse.data;
    } catch (e) {
      diagnostics = null;
    }
    try {
      const newStatus = diagnostics?.status === 'ok' ? 'verified' : 'pending';
      console.log('Updating domain status:', { domain, clientId: client.id, newStatus, diagnosticsStatus: diagnostics?.status });
      await db
        .update(domains)
        .set({ status: newStatus })
        .where(and(eq(domains.clientId, client.id), eq(domains.domainName, domain)));
    } catch (e) {
      console.error('Failed to update domain status:', e.message);
    }

    const records = [
      { type: 'MX', name: '@', value: 'aspmx1.migadu.com', priority: 10, note: 'Primary mail server' },
      { type: 'MX', name: '@', value: 'aspmx2.migadu.com', priority: 20, note: 'Backup mail server' },
      { type: 'TXT', name: '@', value: 'v=spf1 include:spf.migadu.com -all', note: 'SPF - authorizes Migadu to send mail' },
      { type: 'CNAME', name: 'key1._domainkey', value: `key1.${domain}._domainkey.migadu.com`, note: 'DKIM key 1' },
      { type: 'CNAME', name: 'key2._domainkey', value: `key2.${domain}._domainkey.migadu.com`, note: 'DKIM key 2' },
      { type: 'CNAME', name: 'key3._domainkey', value: `key3.${domain}._domainkey.migadu.com`, note: 'DKIM key 3' },
      { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine;', note: 'DMARC policy' },
    ];
    res.json({ domain: domainResponse.data, diagnostics, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
