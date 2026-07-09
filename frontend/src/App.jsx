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
      setError(`Error ${res.status}`)
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
      setError(`Error ${res.status}`)
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
      setError(`Error ${res.status}`)
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
      setError(`Error ${res.status}`)
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
      setError(`Error ${res.status}`)
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
      setError(`Error ${res.status}`)
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
      setError(`Error ${res.status}`)
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

export default App
