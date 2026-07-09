require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { clerkMiddleware, getAuth } = require('@clerk/express');
const { db } = require('./db');
const { clients } = require('./db/schema');

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

app.get('/api/domains/:domain/mailboxes', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { domain } = req.params;
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
