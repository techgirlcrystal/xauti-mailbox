import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignIn,
  UserButton,
  useUser,
  useAuth,
} from '@clerk/clerk-react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

function App() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen bg-[#071A52] text-[#FAF5EE]">
          <TopNav />
          <div className="max-w-4xl mx-auto px-6 py-10">
            <Routes>
              <Route path="/" element={<Domains />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </div>
        </div>
      </SignedIn>
    </>
  )
}

function TopNav() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL || ''
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const token = await getToken()
      const res = await fetch(`${API}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setIsAdmin(res.ok)
    }
    checkAdmin()
  }, [])

  return (
    <nav className="border-b border-white/10">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold">
            Xauti <span className="text-[#F26A21]">Mailbox</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="opacity-80 hover:opacity-100 transition">
              Domains
            </Link>
            {isAdmin && (
              <Link to="/admin" className="opacity-80 hover:opacity-100 transition">
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-70">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <UserButton />
        </div>
      </div>
    </nav>
  )
}

function SignInScreen() {
  return (
    <div className="min-h-screen flex bg-[#071A52] text-[#FAF5EE]">
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 py-12">
        <div className="text-2xl font-bold mb-12">
          Xauti <span className="text-[#F26A21]">Mailbox</span>
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-3">
          Welcome to<br />Xauti <span className="text-[#F26A21]">Mailbox</span>
        </h1>
        <p className="text-white/60 mb-10">Email hosting on your own domain</p>
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none p-0 border-0",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-white border border-white/20 text-[#071A52] hover:bg-white/90",
              socialButtonsBlockButtonText: "text-[#071A52] font-medium",
              dividerLine: "bg-white/15",
              dividerText: "text-white/40",
              formFieldLabel: "text-[#FAF5EE]/80",
              formFieldInput: "bg-[#0D2568] border border-white/20 text-[#FAF5EE] focus:border-[#F26A21]",
              formButtonPrimary: "bg-[#F26A21] hover:bg-[#F26A21]/90 text-white font-semibold normal-case",
              footerActionText: "text-white/50",
              footerActionLink: "text-[#F26A21] hover:text-[#F26A21]/80",
              identityPreviewText: "text-[#FAF5EE]",
              identityPreviewEditButton: "text-[#F26A21]",
              formFieldInputShowPasswordButton: "text-white/50",
              footer: "bg-transparent",
              cardBox: "bg-transparent shadow-none border-0",
              footerAction: "bg-transparent",
              socialButtonsProviderIcon: "",
              badge: "hidden",
            },
            variables: {
              colorBackground: "transparent",
              colorText: "#FAF5EE",
              colorInputBackground: "#0D2568",
              colorInputText: "#FAF5EE",
              colorPrimary: "#F26A21",
            },
          }}
        />
        <p className="text-xs text-white/40 mt-12">© 2026 Xauti Mailbox. All rights reserved.</p>
      </div>

      <div className="hidden lg:flex w-1/2 items-center justify-center p-12">
        <svg viewBox="0 0 480 480" className="w-full max-w-lg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="#FAF5EE" opacity="0.06"/>
              <circle cx="3" cy="3" r="0.4" fill="#000000" opacity="0.08"/>
            </pattern>
            <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="0.9" fill="#071A52" opacity="0.2"/>
            </pattern>
          </defs>

          <circle cx="240" cy="240" r="210" fill="#0D2568"/>
          <circle cx="240" cy="240" r="210" fill="url(#grain)"/>

          <g transform="rotate(-8 240 200)">
            <path d="M110 130 l264 -6 l6 178 l-262 6 z" fill="#000000" opacity="0.3" transform="translate(8,10)"/>
            <path d="M110 130 l264 -6 l6 178 l-262 6 z" fill="#FAF5EE"/>
            <path d="M111 131 L243 236 L373 124" fill="none" stroke="#071A52" strokeWidth="4"/>
            <rect x="140" y="250" width="120" height="7" rx="3" fill="#B89BE8"/>
            <rect x="140" y="266" width="80" height="7" rx="3" fill="#B89BE8"/>
          </g>

          <g transform="rotate(12 130 340)">
            <path d="M60 300 l150 -4 l4 100 l-152 4 z" fill="#000000" opacity="0.3" transform="translate(6,8)"/>
            <path d="M60 300 l150 -4 l4 100 l-152 4 z" fill="#F26A21"/>
            <path d="M60 300 l150 -4 l4 100 l-152 4 z" fill="url(#grain)"/>
            <path d="M61 301 L135 356 L209 297" fill="none" stroke="#071A52" strokeWidth="4"/>
          </g>

          <g transform="rotate(-14 370 350)">
            <circle cx="376" cy="358" r="56" fill="#000000" opacity="0.3"/>
            <circle cx="370" cy="350" r="56" fill="#F5B71E"/>
            <circle cx="370" cy="350" r="56" fill="url(#grain)"/>
            <circle cx="370" cy="350" r="21" fill="none" stroke="#071A52" strokeWidth="8"/>
            <path d="M391 350 a21 21 0 1 0 -6 15" fill="none" stroke="#071A52" strokeWidth="8" strokeLinecap="round"/>
            <path d="M391 329 v27 a12 12 0 0 0 23 -6" fill="none" stroke="#071A52" strokeWidth="8" strokeLinecap="round"/>
          </g>

          <g transform="rotate(-22 380 100)">
            <path d="M348 70 l64 -3 l3 56 l-65 2 z" fill="#000000" opacity="0.3" transform="translate(5,7)"/>
            <path d="M348 70 l64 -3 l3 56 l-65 2 z" fill="#6E2BB8"/>
            <path d="M348 70 l64 -3 l3 56 l-65 2 z" fill="url(#dots)"/>
            <circle cx="380" cy="98" r="15" fill="#FAF5EE"/>
          </g>

          <g transform="rotate(20 95 130)">
            <path d="M65 106 l60 -2 l2 50 l-61 2 z" fill="#000000" opacity="0.3" transform="translate(5,7)"/>
            <path d="M65 106 l60 -2 l2 50 l-61 2 z" fill="#E96C9A"/>
            <path d="M65 106 l60 -2 l2 50 l-61 2 z" fill="url(#grain)"/>
            <path d="M80 131 h30" stroke="#071A52" strokeWidth="6" strokeLinecap="round"/>
          </g>

          <g transform="rotate(-4 250 430)">
            <rect x="160" y="420" width="180" height="12" rx="6" fill="#F26A21"/>
          </g>
        </svg>
      </div>
    </div>
  )
}

function Domains() {
  const { getToken } = useAuth()
  const [domains, setDomains] = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [domainsVersion, setDomainsVersion] = useState(0)
  const API = import.meta.env.VITE_API_URL || ''

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
    setDomainsVersion((v) => v + 1)
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">My Domains</h2>
      <PlanBanner version={domainsVersion} />

      {error && <p className="text-[#F26A21] text-sm mb-4">{error}</p>}

      {loading && <p className="opacity-70 text-sm mb-4">Loading...</p>}

      <ul className="space-y-6 list-none p-0">
        {domains.map((d) => (
          <li
            key={d.id}
            className="bg-[#0D2568] border border-white/10 rounded-xl p-6"
          >
            <div>
              <span className="text-xl font-semibold">{d.domainName}</span>
              <span
                className={`inline-block ml-3 px-2 py-0.5 rounded-full text-xs font-medium ${
                  d.status === 'verified'
                    ? 'bg-[#F5B71E]/20 text-[#F5B71E]'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {d.status}
              </span>
            </div>
            <DnsSetup domain={d.domainName} />
            <Mailboxes domain={d.domainName} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-2">
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
        />
        <button
          onClick={addDomain}
          className="bg-[#F26A21] px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
        >
          Add Domain
        </button>
      </div>
    </div>
  )
}

function PlanBanner({ version }) {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL || ''
  const [plan, setPlan] = useState(null)

  async function fetchPlan() {
    const token = await getToken()
    const res = await fetch(`${API}/api/my/plan`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    setPlan(await res.json())
  }

  useEffect(() => {
    fetchPlan()
  }, [version])

  if (!plan) return null

  return (
    <div className="bg-[#0D2568] border border-white/10 rounded-xl px-5 py-4 mb-8">
      <p className="uppercase text-xs tracking-wide text-[#F5B71E] font-semibold">
        {plan.plan} plan
      </p>
      <p className="text-sm opacity-80">
        {plan.domainsUsed} of {plan.maxDomains} domains used, up to{' '}
        {plan.maxMailboxesPerDomain} mailboxes per domain
      </p>
      {plan.domainsUsed >= plan.maxDomains && (
        <p className="text-sm text-[#F26A21] mt-1">
          You've reached your domain limit. Contact support to upgrade.
        </p>
      )}
    </div>
  )
}

function AdminPanel() {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL || ''
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
    <div className="mt-12">
      <hr className="border-white/10 mb-8" />
      <h2 className="text-2xl font-semibold mb-4">Admin Panel</h2>

      {error && <p className="text-[#F26A21] text-sm mb-4">{error}</p>}
      {loading && <p className="opacity-70 text-sm mb-4">Loading...</p>}

      <div className="space-y-6">
        {clients.map((c) => (
          <div
            key={c.id}
            className="bg-[#0D2568] border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold">
              {c.name || 'No name'} — {c.email}
            </h3>
            <p className="text-sm opacity-80 mt-1">
              Plan: {c.subscription?.plan || 'none'} | Max domains:{' '}
              {c.subscription?.maxDomains ?? '-'} | Max mailboxes/domain:{' '}
              {c.subscription?.maxMailboxesPerDomain ?? '-'} | Status:{' '}
              {c.subscription?.status || '-'}
            </p>
            <button
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition mt-3"
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
              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  value={subPlan}
                  onChange={(e) => setSubPlan(e.target.value)}
                  placeholder="plan"
                  className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
                />
                <input
                  type="number"
                  value={subMaxDomains}
                  onChange={(e) => setSubMaxDomains(e.target.value)}
                  placeholder="max domains"
                  className="w-32 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
                />
                <input
                  type="number"
                  value={subMaxMailboxes}
                  onChange={(e) => setSubMaxMailboxes(e.target.value)}
                  placeholder="max mailboxes"
                  className="w-32 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
                />
                <input
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  placeholder="status"
                  className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
                />
                <button
                  className="bg-[#F26A21] px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                  onClick={() => saveSubscription(c.id)}
                >
                  Save
                </button>
                <button
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
                  onClick={() => setEditingSubFor(null)}
                >
                  Cancel
                </button>
              </div>
            )}

            <h4 className="font-semibold mt-4 mb-2">Domains</h4>
            <ul className="space-y-2 list-none p-0">
              {c.domains.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between bg-white/5 rounded-md px-3 py-2 text-sm"
                >
                  <span>
                    {d.domainName} — {d.status}
                  </span>{' '}
                  <button
                    className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
                    onClick={() => deleteDomain(d.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {c.domains.length === 0 && (
              <p className="text-sm opacity-60">No domains.</p>
            )}

            <button
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition mt-3"
              onClick={() => setNewDomainFor(c.id)}
            >
              Add Domain
            </button>
            {newDomainFor === c.id && (
              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
                />
                <button
                  className="bg-[#F26A21] px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                  onClick={() => addDomainForClient(c.id)}
                >
                  Save
                </button>
                <button
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
                  onClick={() => setNewDomainFor(null)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DnsSetup({ domain }) {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL || ''
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

  function downloadZoneFile() {
    const blob = new Blob([data.zoneFile], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${domain}.zone.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-4">
      <button
        className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
        onClick={() => {
          if (!open) fetchDns()
          setOpen(!open)
        }}
      >
        {open ? 'Hide DNS Setup' : 'Show DNS Setup'}
      </button>

      {loading && <p className="opacity-70 text-sm mt-2">Loading...</p>}

      {open && data && (
        <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4">
          <h4 className="font-semibold mb-2">DNS Records for {domain}</h4>

          <p className="text-sm mb-3">
            {data.diagnostics?.status === 'ok'
              ? '✅ Verified and working'
              : '⏳ Not verified yet — add the records below, then click Recheck'}
          </p>

          <button
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
            onClick={fetchDns}
          >
            Recheck
          </button>

          <div className="mt-4">
            <button
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
              onClick={downloadZoneFile}
            >
              Download DNS Zone File
            </button>
            <p className="text-sm text-[#F5B71E] mt-2">
              <strong>Important:</strong> After importing into Cloudflare, set every
              record to "DNS only" (grey cloud). Proxied records will break email
              delivery.
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Value</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-4">{r.type}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs break-all">
                      {r.value}
                    </td>
                    <td className="py-2 pr-4">{r.priority ?? '-'}</td>
                    <td className="py-2 pr-4 opacity-70">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm opacity-70 mt-3">
            Add these to your domain registrar's DNS settings. Changes can take up
            to 24 hours.
          </p>
        </div>
      )}

      {error && <p className="text-[#F26A21] text-sm mt-2">{error}</p>}
    </div>
  )
}

function Mailboxes({ domain }) {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL || ''
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
    <div className="mt-6 border-t border-white/10 pt-4">
      <h3 className="font-semibold mb-3">Mailboxes for {domain}</h3>

      {error && <p className="text-[#F26A21] text-sm mb-3">{error}</p>}
      {loading && <p className="opacity-70 text-sm mb-3">Loading...</p>}

      <ul className="space-y-3 list-none p-0">
        {mailboxes.map((m) => (
          <li
            key={m.address}
            className="bg-white/5 border border-white/10 rounded-lg p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium mr-auto">{m.address}</span>
              <button
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
                onClick={() => deleteMailbox(m.local_part)}
              >
                Delete
              </button>
              <button
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
                onClick={() => setChangingFor(m.local_part)}
              >
                Change Password
              </button>
            </div>
            <MailboxSettings address={m.address} />
            <Forwardings domain={domain} localPart={m.local_part} />
            {changingFor === m.local_part && (
              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="new password"
                  className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
                />
                <input
                  type="password"
                  value={newPassConfirm}
                  onChange={(e) => setNewPassConfirm(e.target.value)}
                  placeholder="confirm new password"
                  className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
                />
                <button
                  className="bg-[#F26A21] px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                  onClick={() => changePassword(m.local_part)}
                >
                  Save
                </button>
                <button
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
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
      {mailboxes.length === 0 && (
        <p className="text-sm opacity-60">No mailboxes yet.</p>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <input
          value={localPart}
          onChange={(e) => setLocalPart(e.target.value)}
          placeholder="hello"
          className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="confirm password"
          className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-[#F26A21]"
        />
        <button
          className="bg-[#F26A21] px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
          onClick={createMailbox}
        >
          Create Mailbox
        </button>
      </div>
    </div>
  )
}

function MailboxSettings({ address }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3">
      <button
        className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide Settings' : 'Email Settings'}
      </button>

      {open && (
        <div className="mt-3 bg-white/5 border border-white/10 rounded-lg p-4 text-sm">
          <h5 className="font-semibold mb-2">Settings for {address}</h5>
          <p>
            <strong>Username:</strong> {address}
          </p>
          <p>
            <strong>Password:</strong> the password you set for this mailbox
          </p>

          <h6 className="font-semibold mt-3 text-[#F5B71E]">Incoming (IMAP)</h6>
          <p className="opacity-80">Server: imap.migadu.com</p>
          <p className="opacity-80">Port: 993</p>
          <p className="opacity-80">Security: SSL/TLS</p>

          <h6 className="font-semibold mt-3 text-[#F5B71E]">Outgoing (SMTP)</h6>
          <p className="opacity-80">Server: smtp.migadu.com</p>
          <p className="opacity-80">Port: 465</p>
          <p className="opacity-80">Security: SSL/TLS</p>

          <p className="opacity-70 mt-3">
            Use these settings in Gmail, Outlook, or Apple Mail to send and receive
            from this address.
          </p>
        </div>
      )}
    </div>
  )
}

function Forwardings({ domain, localPart }) {
  const { getToken } = useAuth()
  const API = import.meta.env.VITE_API_URL || ''
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const [newAddress, setNewAddress] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function fetchForwardings() {
    setLoading(true)
    setError(null)
    const token = await getToken()
    const res = await fetch(
      `${API}/api/domains/${domain}/mailboxes/${localPart}/forwardings`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      setLoading(false)
      return
    }
    const data = await res.json()
    setList(data.forwardings || [])
    setLoading(false)
  }

  async function addForwarding() {
    if (!newAddress) return
    const token = await getToken()
    const res = await fetch(
      `${API}/api/domains/${domain}/mailboxes/${localPart}/forwardings`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: newAddress }),
      }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    setNewAddress('')
    fetchForwardings()
  }

  async function removeForwarding(address) {
    const token = await getToken()
    const res = await fetch(
      `${API}/api/domains/${domain}/mailboxes/${localPart}/forwardings/${encodeURIComponent(address)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || `Error ${res.status}`)
      return
    }
    fetchForwardings()
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => {
          if (!open) fetchForwardings()
          setOpen(!open)
        }}
        className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
      >
        {open ? 'Hide Forwarding' : 'Forwarding'}
      </button>

      {open && (
        <div className="mt-3 bg-[#071A52] border border-white/10 rounded-lg p-4">
          <p className="text-sm text-white/60 mb-3">
            Forward a copy of every message to another inbox. The destination must confirm
            by clicking a confirmation link we email them.
          </p>
          {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
          {loading && <p className="text-sm text-white/50">Loading...</p>}

          <ul className="space-y-2 mb-4 list-none p-0">
            {list.map((f) => (
              <li key={f.address} className="flex items-center justify-between text-sm">
                <span>
                  {f.address}
                  {f.confirmed_at ? (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#F5B71E]/20 text-[#F5B71E]">confirmed</span>
                  ) : (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">pending confirmation</span>
                  )}
                </span>
                <button
                  onClick={() => removeForwarding(f.address)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-md text-sm transition"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {list.length === 0 && !loading && (
            <p className="text-sm text-white/50 mb-4">No forwarding set up.</p>
          )}

          <div className="flex gap-2">
            <input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="you@gmail.com"
              className="flex-1 bg-[#0D2568] border border-white/20 rounded-md px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#F26A21]"
            />
            <button
              onClick={addForwarding}
              className="bg-[#F26A21] hover:opacity-90 px-4 py-2 rounded-md text-sm font-semibold transition"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
