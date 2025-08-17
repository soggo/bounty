import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Account() {
  const { user, isAuthenticated, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!user) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      setError('')
      
      try {
        const [{ data: prof }, { data: addr }] = await Promise.all([
          supabase.from('profiles').select('first_name,last_name,role,last_seen_at,created_at').eq('id', user.id).single(),
          supabase.from('user_addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ])
        if (!mounted) return
        setProfile(prof || null)
        setAddresses(Array.isArray(addr) ? addr : [])
      } catch (error) {
        if (mounted) {
          setError(error.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [user])

  const displayName = useMemo(() => {
    if (profile?.first_name) return profile.first_name
    const email = user?.email || ''
    return email.split('@')[0] || 'Account'
  }, [profile, user])

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
      setError('Failed to logout. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  async function handleSaveAddress(upd) {
    if (!user) return
    setError('')
    const payload = {
      user_id: user.id,
      recipient_name: upd.recipient_name,
      phone: upd.phone,
      line1: upd.line1,
      line2: upd.line2 || null,
      city: upd.city,
      state: upd.state,
      postal_code: upd.postal_code || null,
      country_code: upd.country_code || 'NG',
      is_default_shipping: !!upd.is_default_shipping,
      is_default_billing: !!upd.is_default_billing,
    }
    let error = null
    if (upd.id) {
      const { error: e } = await supabase.from('user_addresses').update(payload).eq('id', upd.id).eq('user_id', user.id)
      error = e
    } else {
      const { error: e } = await supabase.from('user_addresses').insert(payload)
      error = e
    }
    if (error) {
      setError(error.message)
    } else {
      // reload
      const { data: addr } = await supabase.from('user_addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setAddresses(Array.isArray(addr) ? addr : [])
    }
  }

  function AddressForm({ existing, onCancel }) {
    const [form, setForm] = useState(() => existing || { country_code: 'NG', is_default_shipping: false, is_default_billing: false })
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); handleSaveAddress(form) }}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Recipient name</label>
            <input className="w-full border rounded px-3 py-2" value={form.recipient_name || ''} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input className="w-full border rounded px-3 py-2" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Address line 1</label>
          <input className="w-full border rounded px-3 py-2" value={form.line1 || ''} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Address line 2 (optional)</label>
          <input className="w-full border rounded px-3 py-2" value={form.line2 || ''} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">City</label>
            <input className="w-full border rounded px-3 py-2" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">State</label>
            <input className="w-full border rounded px-3 py-2" value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Postal code (optional)</label>
            <input className="w-full border rounded px-3 py-2" value={form.postal_code || ''} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_default_shipping} onChange={(e) => setForm({ ...form, is_default_shipping: e.target.checked })} />
            Default shipping address
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_default_billing} onChange={(e) => setForm({ ...form, is_default_billing: e.target.checked })} />
            Default billing address
          </label>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" className="rounded bg-black text-white px-4 h-10">Save</button>
          {onCancel ? (<button type="button" className="rounded border px-4 h-10" onClick={onCancel}>Cancel</button>) : null}
        </div>
      </form>
    )
  }

  function AddressCard({ addr, onEdit }) {
    return (
      <div className="border rounded-xl p-4">
        <div className="text-sm text-gray-700">
          <div className="font-medium mb-1">{addr.recipient_name} • {addr.phone}</div>
          <div>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>
          <div>{addr.city}, {addr.state} {addr.postal_code || ''}</div>
          <div className="text-gray-500 text-xs mt-1">{addr.country_code}</div>
        </div>
        <div className="text-xs text-gray-600 mt-2 flex items-center gap-3">
          {addr.is_default_shipping ? <span className="px-2 py-1 bg-gray-100 rounded-full">Default shipping</span> : null}
          {addr.is_default_billing ? <span className="px-2 py-1 bg-gray-100 rounded-full">Default billing</span> : null}
        </div>
        <div className="mt-3">
          <button className="text-sm underline" onClick={() => onEdit(addr)}>Edit</button>
        </div>
      </div>
    )
  }

  const [editing, setEditing] = useState(null)

  // Redirect unauthenticated users to signin
  if (!isAuthenticated) {
    window.sessionStorage.setItem('bounty:returnTo', '#/account')
    window.location.hash = '#/signin'
    return null
  }

  return (
    <div className="page">
      <Header onOpenCart={() => {}} onOpenSearch={() => {}} cartCount={0} />
      <div className="container max-w-[1000px] mx-auto p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Hello, {displayName}</h1>
          {user && (
            <button 
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">Manage your info, addresses and wishlist</p>

        {error ? <div className="mt-4 text-red-700 text-sm">{error}</div> : null}

        {loading ? (
          <div className="mt-6 text-sm text-gray-600">Loading…</div>
        ) : !user ? (
          <div className="mt-6 text-sm text-gray-700">You are not signed in. <a className="underline" href="#/signin">Sign in</a></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 mt-6">
            <section className="bg-white/80 backdrop-blur rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Addresses</h2>
                {editing ? null : (
                  <button className="text-sm underline" onClick={() => setEditing({})}>Add new</button>
                )}
              </div>
              {editing ? (
                <AddressForm existing={editing.id ? editing : null} onCancel={() => setEditing(null)} />
              ) : addresses.length === 0 ? (
                <div className="text-sm text-gray-600">No saved addresses yet</div>
              ) : (
                <div className="grid gap-4">
                  {addresses.map((a) => (
                    <AddressCard key={a.id} addr={a} onEdit={(addr) => setEditing(addr)} />
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white/80 backdrop-blur rounded-xl border p-5">
              <h2 className="font-medium mb-3">Wishlist</h2>
              <Wishlist />
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function Wishlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadWishlist() {
      setLoading(true)
      setError('')
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) { setLoading(false); return }
      const { data, error } = await supabase
        .from('user_wishlist_items')
        .select('id, product_id, created_at, products!inner(id, name, slug, price, images)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setLoading(false)
      if (error) { setError(error.message); return }
      setItems(Array.isArray(data) ? data : [])
    }
    loadWishlist()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>
  if (error) return <div className="text-sm text-red-700">{error}</div>
  if (items.length === 0) return <div className="text-sm text-gray-600">Your wishlist is empty</div>

  return (
    <div className="grid gap-3">
      {items.map((it) => {
        const product = it.products
        const priceMajor = Number(product?.price || 0) / 100
        const image = Array.isArray(product?.images) && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url) : ''
        return (
          <a key={it.id} href={`#/p/${product.slug}`} className="flex items-center gap-3 border rounded-lg p-3 hover:bg-gray-50">
            {image ? <img src={image} alt={product.name} className="w-14 h-14 rounded object-cover" /> : <div className="w-14 h-14 rounded bg-gray-100" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-sm text-gray-600">₦{priceMajor.toLocaleString('en-NG')}</div>
            </div>
          </a>
        )
      })}
    </div>
  )
}


