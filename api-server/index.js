require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { clerkMiddleware, getAuth, clerkClient } = require('@clerk/express');
const { eq, and } = require('drizzle-orm');
const { db } = require('./db');
const { clients, domains, subscriptions } = require('./db/schema');
const { getOrCreateClient } = require('./lib/getOrCreateClient');
const { syncPostmaster } = require('./lib/syncPostmaster');

const { MIGADU_EMAIL, MIGADU_API_KEY } = process.env;
const PORT = process.env.PORT || 3001;
const migaduAuth = { username: MIGADU_EMAIL, password: MIGADU_API_KEY };

const app = express();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Best-effort: never fail the user's request over the postmaster alias
function syncPostmasterQuietly(domain) {
  syncPostmaster(domain, migaduAuth).catch(e =>
    console.error('Postmaster sync failed:', domain, e.response?.status, e.response?.data || e.message)
  );
}

async function requireDomainOwnership(req, res) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const client = await getOrCreateClient(userId, clerkClient);
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

async function requireAdmin(req, res) {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const user = await clerkClient.users.getUser(userId);
  if (user.publicMetadata?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return userId;
}

function validateDomainName(name) {
  if (!name) return null;
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
  const cleaned = name.trim().toLowerCase();
  return domainRegex.test(cleaned) ? cleaned : null;
}

async function getMigaduRecords(domain) {
  const { data: r } = await axios.get(`https://api.migadu.com/v1/domains/${domain}/records`, { auth: migaduAuth });
  return [
    { type: 'TXT', name: r.dns_verification.name, value: r.dns_verification.value, note: 'Domain ownership verification (required)' },
    ...r.mx_records.map(m => ({ type: 'MX', name: m.name, value: m.value, priority: m.priority, note: 'Mail server' })),
    { type: 'TXT', name: r.spf.name, value: r.spf.value, note: 'SPF - authorizes sending' },
    ...r.dkim.map((d, i) => ({ type: 'CNAME', name: d.name, value: d.value, note: `DKIM key ${i + 1}` })),
    { type: 'TXT', name: r.dmarc.name, value: r.dmarc.value, note: 'DMARC policy' },
  ];
}

async function getLimits(clientId) {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.clientId, clientId));
  const sub = rows[0];
  return {
    maxDomains: sub?.maxDomains ?? 1,
    maxMailboxesPerDomain: sub?.maxMailboxesPerDomain ?? 2,
  };
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

app.get('/api/my/plan', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await getOrCreateClient(userId, clerkClient);
    const rows = await db.select().from(subscriptions).where(eq(subscriptions.clientId, client.id));
    const sub = rows[0];
    const clientDomains = await db.select().from(domains).where(eq(domains.clientId, client.id));
    res.json({
      plan: sub?.plan || 'free',
      maxDomains: sub?.maxDomains ?? 1,
      maxMailboxesPerDomain: sub?.maxMailboxesPerDomain ?? 2,
      domainsUsed: clientDomains.length,
      status: sub?.status || 'active',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my/domains', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await getOrCreateClient(userId, clerkClient);
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
    const cleaned = validateDomainName(domainName);
    if (!cleaned) {
      return res.status(400).json({ error: 'Invalid domain name. Use format: example.com' });
    }
    const client = await getOrCreateClient(userId, clerkClient);

    const existing = await db
      .select()
      .from(domains)
      .where(and(eq(domains.clientId, client.id), eq(domains.domainName, cleaned)));
    if (existing.length > 0) {
      return res.status(409).json({ error: 'You already added this domain' });
    }

    const limits = await getLimits(client.id);
    const currentDomains = await db.select().from(domains).where(eq(domains.clientId, client.id));
    if (currentDomains.length >= limits.maxDomains) {
      return res.status(403).json({ error: `Domain limit reached (${limits.maxDomains}). Upgrade your plan to add more.` });
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
        await axios.post('https://api.migadu.com/v1/domains', { name: cleaned, create_default_addresses: 'true', hosted_dns: 'false' }, { auth: migaduAuth });
      } catch (migaduError) {
        console.error('Migadu domain create failed:', {
          status: migaduError.response?.status,
          data: migaduError.response?.data,
          message: migaduError.message,
        });
        await db.delete(domains).where(eq(domains.id, inserted[0].id));
        return res.status(500).json({ error: 'We could not set up that domain right now. Please check the spelling and try again.' });
      }
    }

    res.json({ domain: inserted[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/my/domains/:domain', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await getOrCreateClient(userId, clerkClient);
    const { domain } = req.params;
    const rows = await db
      .select()
      .from(domains)
      .where(and(eq(domains.clientId, client.id), eq(domains.domainName, domain)));
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    const row = rows[0];

    // 1. List all mailboxes on the domain
    let mailboxList = [];
    try {
      const listRes = await axios.get(
        `https://api.migadu.com/v1/domains/${domain}/mailboxes`,
        { auth: migaduAuth }
      );
      mailboxList = listRes.data.mailboxes || [];
    } catch (e) {
      console.error('Failed to list mailboxes before delete:', e.response?.status, e.message);
      return res.status(500).json({ error: 'Could not delete the domain. Please try again.' });
    }

    // 2. Delete each mailbox (Migadu returns HTTP 500 on successful delete)
    for (const mb of mailboxList) {
      try {
        await axios.delete(
          `https://api.migadu.com/v1/domains/${domain}/mailboxes/${mb.local_part}`,
          { auth: migaduAuth }
        );
      } catch (e) {
        if (e.response?.status !== 500) {
          console.error('Failed to delete mailbox before domain delete:', mb.local_part, e.response?.status, e.message);
          return res.status(500).json({ error: 'Could not delete the domain. Please try again.' });
        }
      }
    }

    await db.delete(domains).where(eq(domains.id, row.id));
    res.json({ deleted: true });
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
    if (diagnostics?.status === 'ok') {
      try {
        await axios.get(`https://api.migadu.com/v1/domains/${domain}/activate`, { auth: migaduAuth });
      } catch (e) {
        console.error('Failed to activate domain in Migadu:', e.response?.status, e.message);
      }
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

    const records = await getMigaduRecords(domain);

    const zoneLines = records.map(rec => {
      const host = rec.name === '@' ? `${domain}.` : `${rec.name}.${domain}.`;
      const val = rec.type === 'TXT' ? `"${rec.value}"` : rec.value;
      const prio = rec.priority !== undefined ? `${rec.priority} ` : '';
      return `${host}\t3600\tIN\t${rec.type}\t${prio}${val}`;
    });

    const zoneFile = `; BIND zone file for ${domain}
; Generated by Xauti Mailbox
; IMPORTANT: If importing into Cloudflare, set all records to "DNS only" (grey cloud)
; after import. Proxied records will break email delivery.

${zoneLines.join('\n')}
`;
    res.json({ domain: domainResponse.data, diagnostics, records, zoneFile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Cloudflare auto-connect ---------------------------------------------
// The customer pastes a Cloudflare API token (DNS edit). We use it for this
// one request and never store it. Preview shows what will change; apply does it.

const CF_API = 'https://api.cloudflare.com/client/v4';

function cfFqdn(name, domain) {
  if (!name || name === '@') return domain;
  const n = name.replace(/\.$/, '').toLowerCase();
  return n === domain || n.endsWith(`.${domain}`) ? n : `${n}.${domain}`;
}

function cfNormalize(value) {
  return String(value || '').trim().replace(/^"|"$/g, '').replace(/\.$/, '').toLowerCase();
}

async function cfGetZone(token, domain) {
  const headers = { Authorization: `Bearer ${token}` };
  const zoneRes = await axios.get(`${CF_API}/zones`, { headers, params: { name: domain } });
  const zone = zoneRes.data.result?.[0];
  if (!zone) return null;
  const existing = [];
  for (let page = 1; page <= 20; page++) {
    const r = await axios.get(`${CF_API}/zones/${zone.id}/dns_records`, { headers, params: { per_page: 500, page } });
    existing.push(...r.data.result);
    if (page >= (r.data.result_info?.total_pages || 1)) break;
  }
  return { zone, existing };
}

function cfPlan(domain, desired, existing) {
  const want = desired.map(d => ({
    type: d.type,
    name: cfFqdn(d.name, domain),
    content: String(d.value).replace(/\.$/, ''),
    priority: d.priority,
    note: d.note,
  }));
  const same = (w, e) =>
    w.type === e.type &&
    w.name === e.name.toLowerCase() &&
    cfNormalize(w.content) === cfNormalize(e.content) &&
    (w.type !== 'MX' || Number(w.priority) === Number(e.priority));

  const toAdd = [];
  const toFix = [];   // already there but proxied (orange cloud), must be grey
  const alreadyOk = [];
  for (const w of want) {
    const match = existing.find(e => same(w, e));
    if (!match) toAdd.push(w);
    else if (match.proxied) toFix.push({ ...w, id: match.id });
    else alreadyOk.push(w);
  }

  const dmarcName = `_dmarc.${domain}`;
  const dkimNames = want.filter(w => w.type === 'CNAME').map(w => w.name);
  const toRemove = existing.filter(e => {
    if (want.some(w => same(w, e))) return false;
    const name = e.name.toLowerCase();
    const content = cfNormalize(e.content);
    if (e.type === 'MX' && name === domain) return true;                         // old mail servers
    if (e.type === 'TXT' && name === domain && content.startsWith('v=spf1')) return true; // old SPF
    if (e.type === 'TXT' && name === dmarcName) return true;                      // old DMARC
    if (dkimNames.includes(name)) return true;                                    // anything sitting on a DKIM name
    return false;
  }).map(e => ({ id: e.id, type: e.type, name: e.name, content: e.content, priority: e.priority }));

  return { toAdd, toFix, toRemove, alreadyOk };
}

function cfError(error) {
  const status = error.response?.status;
  if (status === 401 || status === 403) return 'Cloudflare did not accept that token. Make sure you copied the whole thing and it has DNS Edit permission.';
  return error.response?.data?.errors?.[0]?.message || error.message || 'Cloudflare request failed';
}

async function cfPrepare(req, res) {
  const client = await requireDomainOwnership(req, res);
  if (!client) return null;
  const token = String(req.body?.token || '').trim();
  if (!token) { res.status(400).json({ error: 'Paste your Cloudflare token first.' }); return null; }
  const { domain } = req.params;
  const found = await cfGetZone(token, domain);
  if (!found) {
    res.status(404).json({ error: `We could not find ${domain} in that Cloudflare account. Make sure the token covers this domain.` });
    return null;
  }
  const desired = await getMigaduRecords(domain);
  return { token, domain, zone: found.zone, plan: cfPlan(domain, desired, found.existing) };
}

app.post('/api/domains/:domain/cloudflare/preview', async (req, res) => {
  try {
    const ctx = await cfPrepare(req, res);
    if (!ctx) return;
    res.json({ zone: ctx.zone.name, ...ctx.plan });
  } catch (error) {
    res.status(500).json({ error: cfError(error) });
  }
});

app.post('/api/domains/:domain/cloudflare/apply', async (req, res) => {
  try {
    const ctx = await cfPrepare(req, res);
    if (!ctx) return;
    const { token, zone, plan } = ctx;
    const headers = { Authorization: `Bearer ${token}` };
    const base = `${CF_API}/zones/${zone.id}/dns_records`;
    const failed = [];

    for (const r of plan.toRemove) {
      try { await axios.delete(`${base}/${r.id}`, { headers }); }
      catch (e) { failed.push({ action: 'remove', record: r, error: cfError(e) }); }
    }
    for (const r of plan.toFix) {
      try { await axios.patch(`${base}/${r.id}`, { proxied: false }, { headers }); }
      catch (e) { failed.push({ action: 'fix', record: r, error: cfError(e) }); }
    }
    for (const r of plan.toAdd) {
      const body = { type: r.type, name: r.name, content: r.content, ttl: 1, proxied: false };
      if (r.type === 'MX') body.priority = Number(r.priority);
      try { await axios.post(base, body, { headers }); }
      catch (e) { failed.push({ action: 'add', record: r, error: cfError(e) }); }
    }

    console.log('Cloudflare connect:', { domain: ctx.domain, removed: plan.toRemove.length, fixed: plan.toFix.length, added: plan.toAdd.length, failed: failed.length });
    res.json({
      removed: plan.toRemove.length,
      fixed: plan.toFix.length,
      added: plan.toAdd.length,
      failed,
    });
  } catch (error) {
    res.status(500).json({ error: cfError(error) });
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
    const limits = await getLimits(client.id);
    const existingMailboxes = await axios.get(`https://api.migadu.com/v1/domains/${domain}/mailboxes`, { auth: migaduAuth });
    const count = existingMailboxes.data.mailboxes?.length || 0;
    if (count >= limits.maxMailboxesPerDomain) {
      return res.status(403).json({ error: `Mailbox limit reached for this domain (${limits.maxMailboxesPerDomain}). Upgrade your plan to add more.` });
    }
    const response = await axios.post(
      `https://api.migadu.com/v1/domains/${domain}/mailboxes`,
      { local_part: localPart, name: name || localPart, password },
      { auth: migaduAuth }
    );
    syncPostmasterQuietly(domain);
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
      // Migadu returns 500 on a successful delete
      if (migaduError.response?.status !== 500) throw migaduError;
    }
    syncPostmasterQuietly(domain);
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

app.get('/api/domains/:domain/mailboxes/:localPart/forwardings', async (req, res) => {
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { domain, localPart } = req.params;
    const response = await axios.get(
      `https://api.migadu.com/v1/domains/${domain}/mailboxes/${localPart}/forwardings`,
      { auth: migaduAuth }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/domains/:domain/mailboxes/:localPart/forwardings', async (req, res) => {
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Forwarding address is required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const { domain, localPart } = req.params;
    const response = await axios.post(
      `https://api.migadu.com/v1/domains/${domain}/mailboxes/${localPart}/forwardings`,
      { address },
      { auth: migaduAuth }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/domains/:domain/mailboxes/:localPart/forwardings/:address', async (req, res) => {
  try {
    const client = await requireDomainOwnership(req, res);
    if (!client) return;
    const { domain, localPart, address } = req.params;
    try {
      await axios.delete(
        `https://api.migadu.com/v1/domains/${domain}/mailboxes/${localPart}/forwardings/${address}`,
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

app.get('/api/admin/clients', async (req, res) => {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const allClients = await db.select().from(clients);
    const result = [];
    for (const client of allClients) {
      const clientDomains = await db
        .select()
        .from(domains)
        .where(eq(domains.clientId, client.id));
      const subRows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.clientId, client.id));
      result.push({ ...client, domains: clientDomains, subscription: subRows[0] || null });
    }
    res.json({ clients: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/me', async (req, res) => {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    res.json({ isAdmin: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/clients/:clientId/domains', async (req, res) => {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const clientId = Number(req.params.clientId);
    const cleaned = validateDomainName(req.body.domainName);
    if (!cleaned) {
      return res.status(400).json({ error: 'Invalid domain name. Use format: example.com' });
    }
    const clientRows = await db.select().from(clients).where(eq(clients.id, clientId));
    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const existing = await db
      .select()
      .from(domains)
      .where(and(eq(domains.clientId, clientId), eq(domains.domainName, cleaned)));
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Domain already exists for this client' });
    }
    const inserted = await db
      .insert(domains)
      .values({ clientId, domainName: cleaned, status: 'pending' })
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
        await axios.post('https://api.migadu.com/v1/domains', { name: cleaned, create_default_addresses: 'true', hosted_dns: 'false' }, { auth: migaduAuth });
      } catch (migaduError) {
        console.error('Migadu domain create failed:', {
          status: migaduError.response?.status,
          data: migaduError.response?.data,
          message: migaduError.message,
        });
        await db.delete(domains).where(eq(domains.id, inserted[0].id));
        return res.status(500).json({ error: 'We could not set up that domain right now. Please check the spelling and try again.' });
      }
    }
    res.json({ domain: inserted[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/clients/:clientId/subscription', async (req, res) => {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const clientId = Number(req.params.clientId);
    const { plan, maxDomains, maxMailboxesPerDomain, status } = req.body;
    const clientRows = await db.select().from(clients).where(eq(clients.id, clientId));
    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.clientId, clientId));
    let row;
    if (existing.length > 0) {
      const updated = await db
        .update(subscriptions)
        .set({ plan, maxDomains, maxMailboxesPerDomain, status })
        .where(eq(subscriptions.clientId, clientId))
        .returning();
      row = updated[0];
    } else {
      const inserted = await db
        .insert(subscriptions)
        .values({ clientId, plan, maxDomains, maxMailboxesPerDomain, status })
        .returning();
      row = inserted[0];
    }
    res.json({ subscription: row });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/domains/:domainId', async (req, res) => {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const domainId = Number(req.params.domainId);
    const rows = await db.select().from(domains).where(eq(domains.id, domainId));
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    await db.delete(domains).where(eq(domains.id, domainId));
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));

// SPA fallback: any non-API route serves index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
