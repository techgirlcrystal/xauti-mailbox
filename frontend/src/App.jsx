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

export default App
