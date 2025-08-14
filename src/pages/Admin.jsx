import { useEffect, useMemo, useState } from 'react'
import { supabase, centsFromInput, slugify } from '../lib/supabaseClient'
import ImageUploader from '../components/ImageUploader.jsx'

export default function Admin() {
  const [statusMessage, setStatusMessage] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'createCategory' | 'createProduct'

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const [categoryName, setCategoryName] = useState('')
  const categorySlug = useMemo(() => slugify(categoryName), [categoryName])

  const [productForm, setProductForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    price: '',
    old_price: '',
    is_sale: false,
    is_bestseller: false,
    is_new: false,
    category_id: '',
    product_type: 'individual',
    stock_quantity: 0,
    tags: '',
    images: []
  })

  useEffect(() => {
    refreshCategories()
    refreshProductStats()
  }, [])

  async function refreshCategories() {
    setLoadingCategories(true)
    setStatusMessage('')
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('created_at', { ascending: false })
    setLoadingCategories(false)
    if (error) {
      setStatusMessage(`Failed to load categories: ${error.message}`)
      return
    }
    setCategories(data || [])
  }

  const [productStats, setProductStats] = useState({ total: 0, sale: 0, bestseller: 0, isNew: 0 })
  const [recentProducts, setRecentProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  async function refreshProductStats() {
    setLoadingProducts(true)
    setStatusMessage('')
    // Counts
    const [{ count: totalCount, error: totalErr }, { count: saleCount, error: saleErr }, { count: bestCount, error: bestErr }, { count: newCount, error: newErr }] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_sale', true),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_bestseller', true),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_new', true),
    ])

    if (totalErr || saleErr || bestErr || newErr) {
      setStatusMessage(`Failed to load product stats: ${(totalErr||saleErr||bestErr||newErr)?.message}`)
    } else {
      setProductStats({ total: totalCount || 0, sale: saleCount || 0, bestseller: bestCount || 0, isNew: newCount || 0 })
    }

    // Recent products
    const { data: recent, error: recentErr } = await supabase
      .from('products')
      .select('id,name,price,old_price,is_sale,is_bestseller,is_new,created_at')
      .order('created_at', { ascending: false })
      .limit(8)

    setLoadingProducts(false)
    if (recentErr) {
      setStatusMessage(`Failed to load recent products: ${recentErr.message}`)
    } else {
      setRecentProducts(recent || [])
    }
  }

  function formatCents(cents) {
    if (cents === null || cents === undefined) return ''
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
  }

  async function testConnection() {
    setStatusMessage('Testing connection...')
    const { error } = await supabase.from('product_categories').select('id').limit(1)
    if (error) {
      setStatusMessage(`Connection failed: ${error.message}`)
    } else {
      setStatusMessage('Connection OK')
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault()
    setStatusMessage('Creating category...')
    const payload = { id: (crypto?.randomUUID ? crypto.randomUUID() : undefined), name: categoryName.trim(), slug: categorySlug }
    const { error } = await supabase.from('product_categories').insert(payload)
    if (error) {
      setStatusMessage(`Create category failed: ${error.message}`)
      return
    }
    setStatusMessage('Category created')
    setCategoryName('')
    refreshCategories()
  }

  function updateProductField(field, value) {
    setProductForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreateProduct(e) {
    e.preventDefault()
    setStatusMessage('Creating product...')

    const priceCents = centsFromInput(productForm.price)
    const oldPriceCents = centsFromInput(productForm.old_price)

    const tagsList = (productForm.tags || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const imagesArray = Array.isArray(productForm.images)
      ? productForm.images
      : String(productForm.images || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(url => ({ url }))

    const payload = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
      name: productForm.name.trim(),
      slug: slugify(productForm.name),
      subtitle: productForm.subtitle || null,
      description: productForm.description || null,
      price: priceCents,
      old_price: oldPriceCents,
      is_sale: !!productForm.is_sale,
      is_bestseller: !!productForm.is_bestseller,
      is_new: !!productForm.is_new,
      category_id: productForm.category_id || null,
      product_type: productForm.product_type || null,
      stock_quantity: Number.isFinite(Number(productForm.stock_quantity)) ? Number(productForm.stock_quantity) : 0,
      tags: tagsList.length ? tagsList : null,
      images: imagesArray.length ? imagesArray : null
    }

    if (!payload.name) {
      setStatusMessage('Product name is required')
      return
    }
    if (!Number.isFinite(priceCents)) {
      setStatusMessage('Valid price is required')
      return
    }

    async function insertWithPrunedColumns(table, body) {
      const removed = []
      let attempt = { ...body }
      for (let i = 0; i < 8; i++) {
        const { error } = await supabase.from(table).insert(attempt)
        if (!error) return { removed }
        // eslint-disable-next-line no-console
        console.error('Create product error', error)
        if (error.code === 'PGRST204' && typeof error.message === 'string') {
          const match = error.message.match(/'([^']+)'/)
          const missing = match?.[1]
          if (missing && Object.prototype.hasOwnProperty.call(attempt, missing)) {
            delete attempt[missing]
            removed.push(missing)
            continue
          }
        }
        return { error }
      }
      return { error: { message: 'Insert failed after pruning attempts' } }
    }

    const result = await insertWithPrunedColumns('products', payload)
    if (result.error) {
      const { error } = result
      const details = [error.message, error.details, error.hint].filter(Boolean).join(' — ')
      setStatusMessage(`Create product failed: ${details}`)
      return
    }
    if (result.removed && result.removed.length) {
      setStatusMessage(`Product created (ignored fields: ${result.removed.join(', ')})`)
    } else {
      setStatusMessage('Product created')
    }
    refreshProductStats()
    setProductForm({
      name: '', subtitle: '', description: '', price: '', old_price: '', is_sale: false,
      is_bestseller: false, is_new: false, category_id: '', product_type: 'individual', stock_quantity: 0,
      tags: '', images: []
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Manage products and categories</p>
          </div>
          <div className="flex items-center gap-3">
            <a className="text-sm underline" href="#/">Back to Storefront</a>
            <button className="text-sm px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black" onClick={testConnection}>Test Connection</button>
          </div>
        </div>

        {statusMessage ? (
          <div className="mb-6 text-sm text-gray-700">{statusMessage}</div>
        ) : null}

        <div className="mb-6 border-b">
          <nav className="flex gap-4 -mb-px">
            <button
              className={`px-3 py-2 text-sm border-b-2 transition-colors duration-200 ${activeTab === 'overview' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
              onClick={() => setActiveTab('overview')}
            >Overview</button>
            <button
              className={`px-3 py-2 text-sm border-b-2 transition-colors duration-200 ${activeTab === 'createCategory' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
              onClick={() => setActiveTab('createCategory')}
            >Create Category</button>
            <button
              className={`px-3 py-2 text-sm border-b-2 transition-colors duration-200 ${activeTab === 'createProduct' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
              onClick={() => setActiveTab('createProduct')}
            >Create Product</button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="bg-white border rounded p-4">
                <div className="text-xs uppercase text-gray-500 tracking-wide">Total categories</div>
                <div className="text-2xl font-semibold mt-1">{categories.length}</div>
              </div>
              <div className="bg-white border rounded p-4">
                <div className="text-xs uppercase text-gray-500 tracking-wide">Total products</div>
                <div className="text-2xl font-semibold mt-1">{productStats.total}</div>
              </div>
              <div className="bg-white border rounded p-4">
                <div className="text-xs uppercase text-gray-500 tracking-wide">On sale</div>
                <div className="text-2xl font-semibold mt-1">{productStats.sale}</div>
              </div>
              <div className="bg-white border rounded p-4">
                <div className="text-xs uppercase text-gray-500 tracking-wide">Bestsellers</div>
                <div className="text-2xl font-semibold mt-1">{productStats.bestseller}</div>
              </div>
              <div className="bg-white border rounded p-4">
                <div className="text-xs uppercase text-gray-500 tracking-wide">New</div>
                <div className="text-2xl font-semibold mt-1">{productStats.isNew}</div>
              </div>
            </div>

            <div className="bg-white border rounded">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-base font-medium">Recent Products</h2>
                <div className="flex items-center gap-2">
                  <button className="text-sm px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black disabled:opacity-50" onClick={refreshProductStats} disabled={loadingProducts}>
                    {loadingProducts ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </div>
              <div className="divide-y">
                {recentProducts.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No products yet</div>
                ) : recentProducts.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span>{formatCents(p.price)}</span>
                        {p.is_sale && p.old_price ? (
                          <span className="line-through text-gray-400">{formatCents(p.old_price)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {p.is_bestseller ? <span className="px-2 py-0.5 rounded-full bg-gray-100">Bestseller</span> : null}
                      {p.is_new ? <span className="px-2 py-0.5 rounded-full bg-gray-100">New</span> : null}
                      {p.is_sale ? <span className="px-2 py-0.5 rounded-full bg-gray-100">Sale</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'createCategory' && (
          <form className="bg-white rounded border p-4 max-w-[720px]" onSubmit={handleCreateCategory}>
            <h2 className="text-lg font-medium mb-4">Create Category</h2>
            <div className="mb-3">
              <label className="block text-sm mb-1">Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Gifts & Souvenirs"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-1">Slug</label>
              <input className="w-full border rounded px-3 py-2 bg-gray-50" value={categorySlug} readOnly />
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-black text-white px-4 py-2 rounded hover:bg-white hover:text-black hover:outline-1 hover:outline-black" type="submit">Create Category</button>
              <div className="text-xs text-gray-500">
                {loadingCategories ? 'Loading categories…' : `Categories: ${categories.length}`}
              </div>
            </div>
          </form>
        )}

        {activeTab === 'createProduct' && (
          <form className="bg-white rounded border p-4" onSubmit={handleCreateProduct}>
            <h2 className="text-lg font-medium mb-4">Create Product</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.name} onChange={(e) => updateProductField('name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Product type</label>
                <select className="w-full border rounded px-3 py-2" value={productForm.product_type} onChange={(e) => updateProductField('product_type', e.target.value)}>
                  <option value="individual">Individual</option>
                  <option value="bundle">Bundle</option>
                  <option value="kit">Kit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Subtitle</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.subtitle} onChange={(e) => updateProductField('subtitle', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="w-full border rounded px-3 py-2" value={productForm.category_id} onChange={(e) => updateProductField('category_id', e.target.value)}>
                  <option value="">None</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Price (e.g., 29.99)</label>
                <input className="w-full border rounded px-3 py-2" inputMode="decimal" value={productForm.price} onChange={(e) => updateProductField('price', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Old price (former price)</label>
                <input className="w-full border rounded px-3 py-2" inputMode="decimal" value={productForm.old_price} onChange={(e) => updateProductField('old_price', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm mb-1">Stock quantity</label>
                <input className="w-full border rounded px-3 py-2" type="number" value={productForm.stock_quantity} onChange={(e) => updateProductField('stock_quantity', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Tags (comma separated)</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.tags} onChange={(e) => updateProductField('tags', e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Images</label>
                <ImageUploader
                  value={Array.isArray(productForm.images) ? productForm.images : []}
                  onChange={(imgs) => updateProductField('images', imgs)}
                  signerUrl={import.meta.env.VITE_CLOUDINARY_SIGNER_URL || '/.netlify/functions/sign-cloudinary'}
                  cloudName={import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Description</label>
                <textarea className="w-full border rounded px-3 py-2" rows="4" value={productForm.description} onChange={(e) => updateProductField('description', e.target.value)} />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={productForm.is_sale} onChange={(e) => updateProductField('is_sale', e.target.checked)} />
                  <span>On sale</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={productForm.is_bestseller} onChange={(e) => updateProductField('is_bestseller', e.target.checked)} />
                  <span>Bestseller</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={productForm.is_new} onChange={(e) => updateProductField('is_new', e.target.checked)} />
                  <span>New</span>
                </label>
              </div>

              {/** Meta fields removed per request */}
              {false && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Meta title</label>
                    <input className="w-full border rounded px-3 py-2" value={productForm.meta_title} onChange={(e) => updateProductField('meta_title', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Meta description</label>
                    <input className="w-full border rounded px-3 py-2" value={productForm.meta_description} onChange={(e) => updateProductField('meta_description', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <button className="bg-black text-white px-4 py-2 rounded hover:bg-white hover:text-black hover:outline-1 hover:outline-black" type="submit">Create Product</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
