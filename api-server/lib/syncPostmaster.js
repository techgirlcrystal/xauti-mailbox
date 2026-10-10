const axios = require('axios');

// Migadu's default postmaster alias forwards to admin@domain, which usually
// doesn't exist. Aliases can only forward within the same domain, so point
// postmaster at the oldest real mailbox whenever its target is missing.

// activated_at comes back as DD/MM/YY
function activatedKey(mb) {
  const [d, m, y] = (mb.activated_at || '').split('/');
  return d && m && y ? `${y}${m}${d}` : '99999999';
}

async function syncPostmaster(domain, auth, { dryRun = false } = {}) {
  const base = `https://api.migadu.com/v1/domains/${domain}`;
  const mbRes = await axios.get(`${base}/mailboxes`, { auth });
  const mailboxes = mbRes.data.mailboxes || [];
  if (mailboxes.length === 0) return { domain, action: 'skip', reason: 'no mailboxes' };

  const addresses = new Set(mailboxes.map(mb => `${mb.local_part}@${domain}`.toLowerCase()));
  const alRes = await axios.get(`${base}/aliases`, { auth });
  const postmaster = (alRes.data.address_aliases || []).find(a => a.local_part === 'postmaster');
  const current = postmaster?.destinations || [];

  if (current.some(addr => addresses.has(addr.toLowerCase()))) {
    return { domain, action: 'ok', destinations: current };
  }

  // Stable sort keeps Migadu's list order for same-day mailboxes
  const oldest = [...mailboxes].sort((a, b) => activatedKey(a).localeCompare(activatedKey(b)))[0];
  const target = `${oldest.local_part}@${domain}`;

  if (!dryRun) {
    if (postmaster) {
      await axios.put(`${base}/aliases/postmaster`, { destinations: target }, { auth });
    } else {
      await axios.post(`${base}/aliases`, { local_part: 'postmaster', destinations: target }, { auth });
    }
  }
  return { domain, action: postmaster ? 'repoint' : 'create', from: current, to: target };
}

module.exports = { syncPostmaster };
