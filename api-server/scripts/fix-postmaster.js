// One-time cleanup: point every domain's postmaster alias at a real mailbox.
// Dry run by default. Pass --apply to make changes.
//   node scripts/fix-postmaster.js
//   node scripts/fix-postmaster.js --apply
require('dotenv').config();
const axios = require('axios');
const { syncPostmaster } = require('../lib/syncPostmaster');

const auth = { username: process.env.MIGADU_EMAIL, password: process.env.MIGADU_API_KEY };
const dryRun = !process.argv.includes('--apply');

(async () => {
  console.log(dryRun ? 'DRY RUN (no changes)\n' : 'APPLYING CHANGES\n');
  const res = await axios.get('https://api.migadu.com/v1/domains', { auth });
  for (const { name } of res.data.domains || []) {
    try {
      const r = await syncPostmaster(name, auth, { dryRun });
      if (r.action === 'ok') console.log(`ok       ${name} -> ${r.destinations.join(', ')}`);
      else if (r.action === 'skip') console.log(`skip     ${name} (${r.reason})`);
      else console.log(`${r.action.padEnd(8)} ${name}: ${r.from.join(', ') || '(none)'} -> ${r.to}`);
    } catch (e) {
      console.log(`ERROR    ${name}: ${e.response?.status} ${JSON.stringify(e.response?.data) || e.message}`);
    }
  }
})();
