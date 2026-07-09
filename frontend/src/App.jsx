import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
  useAuth,
} from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

function App() {
  const { user } = useUser()

  return (
    <div>
      <h1>Xauti Mailbox</h1>

      <SignedOut>
        <SignInButton mode="modal">
          <button>Sign In</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton />
        <p>Signed in as {user?.primaryEmailAddress?.emailAddress}</p>
        <Domains />
        <AdminPanel />
      </SignedIn>
    </div>
  )
}

function Domains() {
  const { getToken } = useAuth()
  const [domains, setDomains] = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const API = import.meta.env.VITE_API_URL

  async function fetchDomains() {
    setLoading(true)
    setError(null)
    const token = await getToken()
    const res = await fetch(`${API}/api/my/domains`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      setLoading(false)
      return
    }
    const data = await res.json()
    setDomains(data.domains)
    setLoading(false)
  }

  useEffect(() => {
    fetchDomains()
  }, [])

  async function addDomain() {
    if (!newDomain) return
    setError(null)
    const token = await getToken()
    const res = await fetch(`${API}/api/my/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domainName: newDomain }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    setNewDomain('')
    fetchDomains()
  }

  return (
    <div>
      <h2>My Domains</h2>

      {error && <p>{error}</p>}

      {loading && <p>Loading...</p>}

      <ul>
        {domains.map((d) => (
          <li key={d.id}>
            {d.domainName} — {d.status}
            <DnsSetup domain={d.domainName} />
            <Mailboxes domain={d.domainName} />
          </li>
        ))}
      </ul>

      <input
        value={newDomain}
        onChange={(e) => setNewDomain(e.target.value)}
        placeholder="example.com"
      />
      <button onClick={addDomain}>Add Domain</button>
    </div>
  )
}

function AdminPanel() {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL
  const [isAdmin, setIsAdmin] = useState(null)
  const [clients, setClients] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [newDomainFor, setNewDomainFor] = useState(null)
  const [newDomainName, setNewDomainName] = useState('')

  const [editingSubFor, setEditingSubFor] = useState(null)
  const [subPlan, setSubPlan] = useState('base')
  const [subMaxDomains, setSubMaxDomains] = useState(5)
  const [subMaxMailboxes, setSubMaxMailboxes] = useState(5)
  const [subStatus, setSubStatus] = useState('active')

  async function checkAdmin() {
    const token = await getToken()
    const res = await fetch(`${API}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setIsAdmin(res.ok)
    if (res.ok) fetchClients()
  }

  async function fetchClients() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API}/api/admin/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      setLoading(false)
      return
    }
    const data = await res.json()
    setClients(data.clients)
    setLoading(false)
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  async function addDomainForClient(clientId) {
    if (!newDomainName) return
    const token = await getToken()
    const res = await fetch(`${API}/api/admin/clients/${clientId}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domainName: newDomainName }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    setNewDomainName('')
    setNewDomainFor(null)
    fetchClients()
  }

  async function saveSubscription(clientId) {
    const token = await getToken()
    const res = await fetch(`${API}/api/admin/clients/${clientId}/subscription`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: subPlan,
        maxDomains: Number(subMaxDomains),
        maxMailboxesPerDomain: Number(subMaxMailboxes),
        status: subStatus,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    setEditingSubFor(null)
    fetchClients()
  }

  async function deleteDomain(domainId) {
    const token = await getToken()
    const res = await fetch(`${API}/api/admin/domains/${domainId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    fetchClients()
  }

  if (isAdmin === null) return null
  if (isAdmin === false) return null

  return (
    <div>
      <hr />
      <h2>Admin Panel</h2>

      {error && <p>{error}</p>}
      {loading && <p>Loading...</p>}

      {clients.map((c) => (
        <div key={c.id}>
          <h3>{c.name || 'No name'} — {c.email}</h3>
          <p>
            Plan: {c.subscription?.plan || 'none'} | Max domains:{' '}
            {c.subscription?.maxDomains ?? '-'} | Max mailboxes/domain:{' '}
            {c.subscription?.maxMailboxesPerDomain ?? '-'} | Status:{' '}
            {c.subscription?.status || '-'}
          </p>
          <button
            onClick={() => {
              setSubPlan(c.subscription?.plan || 'base')
              setSubMaxDomains(c.subscription?.maxDomains ?? 5)
              setSubMaxMailboxes(c.subscription?.maxMailboxesPerDomain ?? 5)
              setSubStatus(c.subscription?.status || 'active')
              setEditingSubFor(c.id)
            }}
          >
            Edit Plan
          </button>

          {editingSubFor === c.id && (
            <div>
              <input
                value={subPlan}
                onChange={(e) => setSubPlan(e.target.value)}
                placeholder="plan"
              />
              <input
                type="number"
                value={subMaxDomains}
                onChange={(e) => setSubMaxDomains(e.target.value)}
                placeholder="max domains"
              />
              <input
                type="number"
                value={subMaxMailboxes}
                onChange={(e) => setSubMaxMailboxes(e.target.value)}
                placeholder="max mailboxes"
              />
              <input
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value)}
                placeholder="status"
              />
              <button onClick={() => saveSubscription(c.id)}>Save</button>
              <button onClick={() => setEditingSubFor(null)}>Cancel</button>
            </div>
          )}

          <h4>Domains</h4>
          <ul>
            {c.domains.map((d) => (
              <li key={d.id}>
                {d.domainName} — {d.status}{' '}
                <button onClick={() => deleteDomain(d.id)}>Remove</button>
              </li>
            ))}
          </ul>
          {c.domains.length === 0 && <p>No domains.</p>}

          <button onClick={() => setNewDomainFor(c.id)}>Add Domain</button>
          {newDomainFor === c.id && (
            <div>
              <input
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="example.com"
              />
              <button onClick={() => addDomainForClient(c.id)}>Save</button>
              <button onClick={() => setNewDomainFor(null)}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DnsSetup({ domain }) {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function fetchDns() {
    setLoading(true)
    setError(null)
    const token = await getToken()
    const res = await fetch(`${API}/api/domains/${domain}/dns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      setLoading(false)
      return
    }
    setData(await res.json())
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={() => {
          if (!open) fetchDns()
          setOpen(!open)
        }}
      >
        {open ? 'Hide DNS Setup' : 'Show DNS Setup'}
      </button>

      {loading && <p>Loading...</p>}

      {open && data && (
        <div>
          <h4>DNS Records for {domain}</h4>

          <p>
            {data.diagnostics?.status === 'ok'
              ? '✅ Verified and working'
              : '⏳ Not verified yet — add the records below, then click Recheck'}
          </p>

          <button onClick={fetchDns}>Recheck</button>

          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Value</th>
                <th>Priority</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((r, i) => (
                <tr key={i}>
                  <td>{r.type}</td>
                  <td>{r.name}</td>
                  <td>{r.value}</td>
                  <td>{r.priority ?? '-'}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p>
            Add these to your domain registrar's DNS settings. Changes can take up
            to 24 hours.
          </p>
        </div>
      )}

      {error && <p>{error}</p>}
    </div>
  )
}

function Mailboxes({ domain }) {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL
  const [mailboxes, setMailboxes] = useState([])
  const [localPart, setLocalPart] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [changingFor, setChangingFor] = useState(null)
  const [newPass, setNewPass] = useState('')
  const [newPassConfirm, setNewPassConfirm] = useState('')

  async function fetchMailboxes() {
    setLoading(true)
    setError(null)
    const token = await getToken()
    const res = await fetch(`${API}/api/domains/${domain}/mailboxes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      setLoading(false)
      return
    }
    const data = await res.json()
    setMailboxes(data.mailboxes || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMailboxes()
  }, [domain])

  async function createMailbox() {
    if (!localPart || !password) {
      setError('Local part and password required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError(null)
    const token = await getToken()
    const res = await fetch(`${API}/api/domains/${domain}/mailboxes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ localPart, name: localPart, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    setLocalPart('')
    setPassword('')
    setConfirmPassword('')
    fetchMailboxes()
  }

  async function deleteMailbox(lp) {
    setError(null)
    const token = await getToken()
    const res = await fetch(`${API}/api/domains/${domain}/mailboxes/${lp}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    fetchMailboxes()
  }

  async function changePassword(lp) {
    if (!newPass) {
      setError('Password required')
      return
    }
    if (newPass !== newPassConfirm) {
      setError('Passwords do not match')
      return
    }
    const token = await getToken()
    const res = await fetch(`${API}/api/domains/${domain}/mailboxes/${lp}/password`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPass }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    setChangingFor(null)
    setNewPass('')
    setNewPassConfirm('')
    setError(null)
  }

  return (
    <div>
      <h3>Mailboxes for {domain}</h3>

      {error && <p>{error}</p>}
      {loading && <p>Loading...</p>}

      <ul>
        {mailboxes.map((m) => (
          <li key={m.address}>
            {m.address}
            <button onClick={() => deleteMailbox(m.local_part)}>Delete</button>
            <button onClick={() => setChangingFor(m.local_part)}>Change Password</button>
            <MailboxSettings address={m.address} />
            {changingFor === m.local_part && (
              <div>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="new password"
                />
                <input
                  type="password"
                  value={newPassConfirm}
                  onChange={(e) => setNewPassConfirm(e.target.value)}
                  placeholder="confirm new password"
                />
                <button onClick={() => changePassword(m.local_part)}>Save</button>
                <button
                  onClick={() => {
                    setChangingFor(null)
                    setNewPass('')
                    setNewPassConfirm('')
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {mailboxes.length === 0 && <p>No mailboxes yet.</p>}

      <input
        value={localPart}
        onChange={(e) => setLocalPart(e.target.value)}
        placeholder="hello"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="confirm password"
      />
      <button onClick={createMailbox}>Create Mailbox</button>
    </div>
  )
}

function MailboxSettings({ address }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setOpen(!open)}>
        {open ? 'Hide Settings' : 'Email Settings'}
      </button>

      {open && (
        <div>
          <h5>Settings for {address}</h5>
          <p><strong>Username:</strong> {address}</p>
          <p><strong>Password:</strong> the password you set for this mailbox</p>

          <h6>Incoming (IMAP)</h6>
          <p>Server: imap.migadu.com</p>
          <p>Port: 993</p>
          <p>Security: SSL/TLS</p>

          <h6>Outgoing (SMTP)</h6>
          <p>Server: smtp.migadu.com</p>
          <p>Port: 465</p>
          <p>Security: SSL/TLS</p>

          <p>Use these settings in Gmail, Outlook, or Apple Mail to send and receive from this address.</p>
        </div>
      )}
    </div>
  )
}

export default App
