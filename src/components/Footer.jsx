import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Footer() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    async function fetchCategories() {
      try {
        setLoading(true)
        const { data } = await supabase
          .from('product_categories')
          .select('id,name,slug')
          .order('name', { ascending: true })
        if (!mounted) return
        setCategories(Array.isArray(data) ? data.slice(0, 6) : [])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCategories()
    return () => { mounted = false }
  }, [])

  return (
    <footer className="mt-20 bg-black text-white">
      <div className="container max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="font-bold tracking-[.18em] text-lg">BOUNTY</div>
            <p className="mt-3 text-gray-300 text-sm max-w-xs">Curated objects for daily living and meaningful gifting.</p>
          </div>

          {/* Shop */}
          <div>
            <div className="text-xs tracking-[.14em] uppercase text-gray-400">Shop</div>
            <ul className="mt-3 space-y-2">
              <li><a className="hover:underline underline-offset-4" href="#best-sellers">Best Sellers</a></li>
              <li><a className="hover:underline underline-offset-4" href="#summer">Summer selection</a></li>
              <li><a className="hover:underline underline-offset-4" href="#gifts">Gifts & souvenirs</a></li>
              <li><a className="hover:underline underline-offset-4" href="#bundles">Bundles & kits</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <div className="text-xs tracking-[.14em] uppercase text-gray-400">Categories</div>
            <ul className="mt-3 space-y-2">
              {loading ? (
                <li className="text-gray-400 text-sm">Loading…</li>
              ) : categories.length === 0 ? (
                <li className="text-gray-400 text-sm">No categories yet</li>
              ) : (
                categories.map((c) => (
                  <li key={c.id}><span className="text-sm text-gray-200">{c.name}</span></li>
                ))
              )}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <div className="text-xs tracking-[.14em] uppercase text-gray-400">Newsletter</div>
            <p className="mt-3 text-gray-300 text-sm">Get product drops and seasonal picks.</p>
            <form className="mt-3 flex items-center gap-2" onSubmit={(e) => e.preventDefault()}>
              <input className="flex-1 min-w-0 bg-white/10 text-white placeholder:text-gray-400 px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-white/40" type="email" placeholder="you@example.com" aria-label="Email address" />
              <button className="btn bg-white text-black px-4 py-2 rounded-md hover:bg-transparent hover:text-white hover:outline hover:outline-white" type="submit">Subscribe</button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-gray-400">
          <div>© {new Date().getFullYear()} Bounty</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-white" href="#/">Privacy</a>
            <a className="hover:text-white" href="#/">Terms</a>
            <a className="hover:text-white" href="#/">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}


