import { useEffect, useMemo, useState } from 'react'
import { supabase, centsFromInput, slugify } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import ImageUploader from '../components/ImageUploader.jsx'

export default function Admin() {
  const { isAuthenticated, userRole, isLoading } = useAuth()
  const [statusMessage, setStatusMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
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

  // Load admin data when component mounts and user is authenticated as admin
  useEffect(() => {
    if (isAuthenticated && userRole === 'admin' && !isLoading) {
      refreshCategories()
      refreshProductStats()
    }
  }, [isAuthenticated, userRole, isLoading])

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
    const categoriesData = data || []
    setCategories(categoriesData)
    setRecentCategories(categoriesData.slice(0, 8)) // Get recent 8 categories for overview
  }

  const [productStats, setProductStats] = useState({ total: 0, sale: 0, bestseller: 0, isNew: 0 })
  const [recentProducts, setRecentProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [deletingProductId, setDeletingProductId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Category management state
  const [recentCategories, setRecentCategories] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [filteredCategories, setFilteredCategories] = useState([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState(null)
  const [showCategoryDeleteConfirm, setShowCategoryDeleteConfirm] = useState(false)
  const [categorySearchQuery, setCategorySearchQuery] = useState('')

  // Enhanced product list state
  const [allProducts, setAllProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [productsPerPage] = useState(12)
  const [showAllProducts, setShowAllProducts] = useState(false)

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

    // Recent products for overview
    const { data: recent, error: recentErr } = await supabase
      .from('products')
      .select('id,name,price,old_price,is_sale,is_bestseller,is_new,created_at,stock_quantity')
      .order('created_at', { ascending: false })
      .limit(8)

    if (recentErr) {
      setStatusMessage(`Failed to load recent products: ${recentErr.message}`)
    } else {
      setRecentProducts(recent || [])
    }

    setLoadingProducts(false)
  }

  async function loadAllProducts() {
    setLoadingProducts(true)
    setStatusMessage('')
    
    // Fetch all products with enhanced data including images
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        old_price,
        is_sale,
        is_bestseller,
        is_new,
        created_at,
        stock_quantity,
        images,
        category_id,
        product_categories(name)
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    setLoadingProducts(false)
    
    if (error) {
      setStatusMessage(`Failed to load products: ${error.message}`)
      return
    }

    setAllProducts(products || [])
    applyFiltersAndSort(products || [], searchQuery)
  }

  function applyFiltersAndSort(products, query) {
    let filtered = [...products]

    // Apply search filter
    if (query.trim()) {
      const searchLower = query.toLowerCase().trim()
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.product_categories?.name?.toLowerCase().includes(searchLower) ||
        product.id?.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || ''
          bVal = b.name?.toLowerCase() || ''
          break
        case 'price':
          aVal = a.price || 0
          bVal = b.price || 0
          break
        case 'stock_quantity':
          aVal = a.stock_quantity || 0
          bVal = b.stock_quantity || 0
          break
        case 'created_at':
        default:
          aVal = new Date(a.created_at || 0)
          bVal = new Date(b.created_at || 0)
          break
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset to first page when filtering/sorting
  }

  function handleSearch(query) {
    setSearchQuery(query)
    applyFiltersAndSort(allProducts, query)
  }

  function handleSort(field) {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortBy(field)
    setSortOrder(newOrder)
    applyFiltersAndSort(allProducts, searchQuery)
  }

  function getPrimaryImageUrl(product) {
    const images = Array.isArray(product?.images) ? product.images : []
    const first = images.find(img => img && (img.url || typeof img === 'string'))
    if (!first) return null
    return typeof first === 'string' ? first : (first.url || null)
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const startIndex = (currentPage - 1) * productsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage)

  function formatCents(cents) {
    if (cents === null || cents === undefined) return ''
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
  }

  function centsToInputString(cents) {
    if (cents === null || cents === undefined) return ''
    try {
      return (Number(cents) / 100).toFixed(2)
    } catch {
      return ''
    }
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
    setSuccessMessage('') // Clear any existing success message

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
    // Show success message
    setSuccessMessage('Product created successfully! ')
    setStatusMessage('')
    
    // Clear form
    setProductForm({
      name: '', subtitle: '', description: '', price: '', old_price: '', is_sale: false,
      is_bestseller: false, is_new: false, category_id: '', product_type: 'individual', stock_quantity: 0,
      tags: '', images: []
    })
    
    refreshProductStats()
    
    // Refresh all products if we're showing them
    if (showAllProducts) {
      loadAllProducts()
    }
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 2000)
  }

  async function startEditProduct(id) {
    setStatusMessage('Loading product…')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      setStatusMessage(`Failed to load product: ${error.message}`)
      return
    }
    const p = data || {}
    setProductForm({
      name: p.name || '',
      subtitle: p.subtitle || '',
      description: p.description || '',
      price: centsToInputString(p.price),
      old_price: centsToInputString(p.old_price),
      is_sale: !!p.is_sale,
      is_bestseller: !!p.is_bestseller,
      is_new: !!p.is_new,
      category_id: p.category_id || '',
      product_type: p.product_type || 'individual',
      stock_quantity: Number.isFinite(Number(p.stock_quantity)) ? Number(p.stock_quantity) : 0,
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      images: Array.isArray(p.images) ? p.images : []
    })
    setEditingProductId(p.id)
    setActiveTab('editProduct')
    setStatusMessage('')
  }

  async function handleUpdateProduct(e) {
    e.preventDefault()
    if (!editingProductId) {
      setStatusMessage('Nothing to update')
      return
    }
    setStatusMessage('Updating product…')

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

    const { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', editingProductId)

    if (error) {
      setStatusMessage(`Update failed: ${error.message}`)
      return
    }

    setSuccessMessage('Product updated successfully!')
    setStatusMessage('')
    setEditingProductId(null)
    setActiveTab('overview')
    refreshProductStats()
    
    // Refresh all products if we're showing them
    if (showAllProducts) {
      loadAllProducts()
    }
    
    setProductForm({
      name: '', subtitle: '', description: '', price: '', old_price: '', is_sale: false,
      is_bestseller: false, is_new: false, category_id: '', product_type: 'individual', stock_quantity: 0,
      tags: '', images: []
    })
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  function confirmDeleteProduct(productId, productName) {
    setDeletingProductId(productId)
    setShowDeleteConfirm(true)
    setStatusMessage(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)
  }

  async function handleDeleteProduct() {
    if (!deletingProductId) {
      setStatusMessage('No product selected for deletion')
      return
    }

    setStatusMessage('Deleting product…')
    setShowDeleteConfirm(false)

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deletingProductId)

    if (error) {
      setStatusMessage(`Delete failed: ${error.message}`)
      setDeletingProductId(null)
      return
    }

    setSuccessMessage('Product deleted successfully!')
    setStatusMessage('')
    setDeletingProductId(null)
    refreshProductStats()
    
    // Refresh all products if we're showing them
    if (showAllProducts) {
      loadAllProducts()
    }
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  function cancelDeleteProduct() {
    setShowDeleteConfirm(false)
    setDeletingProductId(null)
    setStatusMessage('')
  }

  // Category management functions
  async function loadAllCategories() {
    setLoadingCategories(true)
    setStatusMessage('')
    
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('created_at', { ascending: false })

    setLoadingCategories(false)
    
    if (error) {
      setStatusMessage(`Failed to load categories: ${error.message}`)
      return
    }

    setAllCategories(categories || [])
    applyCategoryFilters(categories || [], categorySearchQuery)
  }

  function applyCategoryFilters(categories, query) {
    let filtered = [...categories]

    // Apply search filter
    if (query.trim()) {
      const searchLower = query.toLowerCase().trim()
      filtered = filtered.filter(category => 
        category.name?.toLowerCase().includes(searchLower) ||
        category.slug?.toLowerCase().includes(searchLower) ||
        category.id?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredCategories(filtered)
  }

  function handleCategorySearch(query) {
    setCategorySearchQuery(query)
    applyCategoryFilters(allCategories, query)
  }

  async function startEditCategory(id) {
    setStatusMessage('Loading category…')
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      setStatusMessage(`Failed to load category: ${error.message}`)
      return
    }
    const c = data || {}
    setCategoryName(c.name || '')
    setEditingCategoryId(c.id)
    setActiveTab('editCategory')
    setStatusMessage('')
  }

  async function handleUpdateCategory(e) {
    e.preventDefault()
    if (!editingCategoryId) {
      setStatusMessage('Nothing to update')
      return
    }
    setStatusMessage('Updating category…')

    const payload = {
      name: categoryName.trim(),
      slug: slugify(categoryName)
    }

    if (!payload.name) {
      setStatusMessage('Category name is required')
      return
    }

    const { error } = await supabase
      .from('product_categories')
      .update(payload)
      .eq('id', editingCategoryId)

    if (error) {
      setStatusMessage(`Update failed: ${error.message}`)
      return
    }

    setSuccessMessage('Category updated successfully!')
    setStatusMessage('')
    setEditingCategoryId(null)
    setActiveTab('overview')
    setCategoryName('')
    refreshCategories()
    
    // Refresh all categories if we're showing them
    if (showAllCategories) {
      loadAllCategories()
    }
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  function confirmDeleteCategory(categoryId, categoryName) {
    setDeletingCategoryId(categoryId)
    setShowCategoryDeleteConfirm(true)
    setStatusMessage(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)
  }

  async function handleDeleteCategory() {
    if (!deletingCategoryId) {
      setStatusMessage('No category selected for deletion')
      return
    }

    setStatusMessage('Deleting category…')
    setShowCategoryDeleteConfirm(false)

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', deletingCategoryId)

    if (error) {
      setStatusMessage(`Delete failed: ${error.message}`)
      setDeletingCategoryId(null)
      return
    }

    setSuccessMessage('Category deleted successfully!')
    setStatusMessage('')
    setDeletingCategoryId(null)
    refreshCategories()
    
    // Refresh all categories if we're showing them
    if (showAllCategories) {
      loadAllCategories()
    }
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  function cancelDeleteCategory() {
    setShowCategoryDeleteConfirm(false)
    setDeletingCategoryId(null)
    setStatusMessage('')
  }

  // Show loading state while verifying access
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }
  
  // Redirect if not authenticated or not admin (handled by App.jsx routing, but kept as fallback)
  if (!isAuthenticated || userRole !== 'admin') {
    window.location.hash = '#/'
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-[1200px] mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-wide">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Manage products and categories</p>
          </div>
          <div className="flex items-center gap-3">
            <a className="text-sm underline whitespace-nowrap" href="#/">Back to Storefront</a>
            {/* <button className="text-sm px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black" onClick={testConnection}>Test Connection</button> */}
          </div>
        </div>

        {statusMessage ? (
          <div className="mb-6 text-sm text-gray-700">{statusMessage}</div>
        ) : null}
        


        <div className="mb-6 border-b">
          <nav className="flex flex-wrap gap-2 sm:gap-4 -mb-px overflow-x-auto">
            <button
              className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${activeTab === 'overview' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
              onClick={() => { setActiveTab('overview'); setSuccessMessage(''); }}
            >Overview</button>
            <button
              className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${activeTab === 'createCategory' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
              onClick={() => { setActiveTab('createCategory'); setSuccessMessage(''); }}
            >Create Category</button>
            <button
              className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${activeTab === 'createProduct' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
              onClick={() => { setActiveTab('createProduct'); setSuccessMessage(''); }}
            >Create Product</button>
            {activeTab === 'editProduct' ? (
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${activeTab === 'editProduct' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
                onClick={() => { setActiveTab('editProduct'); setSuccessMessage(''); }}
              >Edit Product</button>
            ) : null}
            {activeTab === 'editCategory' ? (
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${activeTab === 'editCategory' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-black/50'}`}
                onClick={() => { setActiveTab('editCategory'); setSuccessMessage(''); }}
              >Edit Category</button>
            ) : null}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-3">
                <h2 className="text-base font-medium">
                  {showAllProducts ? 'All Products' : 'Recent Products'}
                  {showAllProducts && (
                    <span className="ml-2 text-sm text-gray-500 block sm:inline">
                      ({filteredProducts.length} of {allProducts.length})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {!showAllProducts ? (
                    <>
                      <button 
                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border hover:bg-gray-50 whitespace-nowrap"
                        onClick={() => {
                          setShowAllProducts(true)
                          loadAllProducts()
                        }}
                      >
                        View All Products
                      </button>
                      <button className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black disabled:opacity-50 whitespace-nowrap" onClick={refreshProductStats} disabled={loadingProducts}>
                        {loadingProducts ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border hover:bg-gray-50 whitespace-nowrap"
                        onClick={() => setShowAllProducts(false)}
                      >
                        Show Recent Only
                      </button>
                      <button className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black disabled:opacity-50 whitespace-nowrap" onClick={loadAllProducts} disabled={loadingProducts}>
                        {loadingProducts ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showAllProducts && (
                <div className="p-4 border-b bg-gray-50">
                  {/* Search and Sort Controls */}
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="Search products by name, category, or ID..."
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <select
                        className="flex-1 px-3 py-2 border rounded-md text-sm min-w-0"
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value)
                          applyFiltersAndSort(allProducts, searchQuery)
                        }}
                      >
                        <option value="created_at">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                        <option value="price">Sort by Price</option>
                        <option value="stock_quantity">Sort by Stock</option>
                      </select>
                      <button
                        className="px-3 py-2 border rounded-md text-sm hover:bg-gray-100 flex-shrink-0"
                        onClick={() => handleSort(sortBy)}
                        title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>

                  {/* Pagination Info */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
                      <span className="text-center sm:text-left">
                        Showing {startIndex + 1}-{Math.min(startIndex + productsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                      </span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="px-3 py-1 border rounded disabled:opacity-50 text-xs sm:text-sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(currentPage - 1)}
                        >
                          Previous
                        </button>
                        <span className="text-xs sm:text-sm whitespace-nowrap">Page {currentPage} of {totalPages}</span>
                        <button
                          className="px-3 py-1 border rounded disabled:opacity-50 text-xs sm:text-sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={showAllProducts ? 'grid grid-cols-1 gap-4 p-4' : 'divide-y'}>
                {!showAllProducts ? (
                  // Recent products view (original layout)
                  recentProducts.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No products yet</div>
                  ) : recentProducts.map(p => (
                    <div key={p.id} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2 mt-1">
                            <span>{formatCents(p.price)}</span>
                            {p.is_sale && p.old_price ? (
                              <span className="line-through text-gray-400">{formatCents(p.old_price)}</span>
                            ) : null}
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span title="Available quantity">Qty: {Number.isFinite(Number(p.stock_quantity)) ? Number(p.stock_quantity) : 0}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          {/* Status badges */}
                          <div className="flex items-center gap-1 text-xs flex-wrap">
                            {p.is_bestseller ? <span className="px-2 py-0.5 rounded-full bg-gray-100">Bestseller</span> : null}
                            {p.is_new ? <span className="px-2 py-0.5 rounded-full bg-gray-100">New</span> : null}
                            {p.is_sale ? <span className="px-2 py-0.5 rounded-full bg-gray-100">Sale</span> : null}
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              className="px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black text-xs sm:text-sm"
                              onClick={() => startEditProduct(p.id)}
                            >Edit</button>
                            <button
                              className="px-3 py-1 rounded border bg-red-600 text-white hover:bg-red-700 transition-colors text-xs sm:text-sm"
                              onClick={() => confirmDeleteProduct(p.id, p.name)}
                              disabled={deletingProductId === p.id}
                            >
                              {deletingProductId === p.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // All products view (enhanced layout with images)
                  paginatedProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No products match your search.' : 'No products found.'}
                    </div>
                  ) : paginatedProducts.map(p => {
                    const imageUrl = getPrimaryImageUrl(p)
                    return (
                      <div key={p.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                          {/* Product Image */}
                          <div className="w-16 h-16 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden self-center sm:self-start">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full flex items-center justify-center text-gray-400 text-xs ${imageUrl ? 'hidden' : 'flex'}`}
                            >
                              No Image
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col gap-3">
                              {/* Header with title and badges */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">{p.name}</h3>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="font-medium">{formatCents(p.price)}</span>
                                      {p.is_sale && p.old_price ? (
                                        <span className="line-through text-gray-400">{formatCents(p.old_price)}</span>
                                      ) : null}
                                      <span className="text-gray-400 hidden sm:inline">•</span>
                                      <span className="text-xs sm:text-sm">Stock: {Number.isFinite(Number(p.stock_quantity)) ? Number(p.stock_quantity) : 0}</span>
                                    </div>
                                    {p.product_categories?.name && (
                                      <div className="text-xs text-gray-500">
                                        Category: {p.product_categories.name}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      Created: {new Date(p.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                {/* Status badges */}
                                <div className="flex flex-wrap gap-1 justify-start sm:justify-end">
                                  {p.is_bestseller ? <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">Bestseller</span> : null}
                                  {p.is_new ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">New</span> : null}
                                  {p.is_sale ? <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">Sale</span> : null}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                <button
                                  className="flex-1 sm:flex-none text-xs sm:text-sm px-3 py-2 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black"
                                  onClick={() => startEditProduct(p.id)}
                                >
                                  Edit Product
                                </button>
                                <button
                                  className="flex-1 sm:flex-none text-xs sm:text-sm px-3 py-2 rounded border bg-red-600 text-white hover:bg-red-700 transition-colors"
                                  onClick={() => confirmDeleteProduct(p.id, p.name)}
                                  disabled={deletingProductId === p.id}
                                >
                                  {deletingProductId === p.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="bg-white border rounded">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-3">
                <h2 className="text-base font-medium">
                  {showAllCategories ? 'All Categories' : 'Recent Categories'}
                  {showAllCategories && (
                    <span className="ml-2 text-sm text-gray-500 block sm:inline">
                      ({filteredCategories.length} of {allCategories.length})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {!showAllCategories ? (
                    <>
                      <button 
                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border hover:bg-gray-50 whitespace-nowrap"
                        onClick={() => {
                          setShowAllCategories(true)
                          loadAllCategories()
                        }}
                      >
                        View All Categories
                      </button>
                      <button className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black disabled:opacity-50 whitespace-nowrap" onClick={refreshCategories} disabled={loadingCategories}>
                        {loadingCategories ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border hover:bg-gray-50 whitespace-nowrap"
                        onClick={() => setShowAllCategories(false)}
                      >
                        Show Recent Only
                      </button>
                      <button className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black disabled:opacity-50 whitespace-nowrap" onClick={loadAllCategories} disabled={loadingCategories}>
                        {loadingCategories ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showAllCategories && (
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="Search categories by name, slug, or ID..."
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        value={categorySearchQuery}
                        onChange={(e) => handleCategorySearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={showAllCategories ? 'grid grid-cols-1 gap-4 p-4' : 'divide-y'}>
                {!showAllCategories ? (
                  // Recent categories view
                  recentCategories.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No categories yet</div>
                  ) : recentCategories.map(c => (
                    <div key={c.id} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2 mt-1">
                            <span>Slug: {c.slug}</span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-xs text-gray-500">
                              Created: {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black text-xs sm:text-sm"
                            onClick={() => startEditCategory(c.id)}
                          >Edit</button>
                          <button
                            className="px-3 py-1 rounded border bg-red-600 text-white hover:bg-red-700 transition-colors text-xs sm:text-sm"
                            onClick={() => confirmDeleteCategory(c.id, c.name)}
                            disabled={deletingCategoryId === c.id}
                          >
                            {deletingCategoryId === c.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // All categories view
                  filteredCategories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {categorySearchQuery ? 'No categories match your search.' : 'No categories found.'}
                    </div>
                  ) : filteredCategories.map(c => (
                    <div key={c.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">{c.name}</h3>
                                <div className="text-sm text-gray-600 mt-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-xs sm:text-sm">Slug: {c.slug}</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Created: {new Date(c.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <button
                                className="flex-1 sm:flex-none text-xs sm:text-sm px-3 py-2 rounded border bg-black text-white hover:bg-white hover:text-black hover:outline-1 hover:outline-black"
                                onClick={() => startEditCategory(c.id)}
                              >
                                Edit Category
                              </button>
                              <button
                                className="flex-1 sm:flex-none text-xs sm:text-sm px-3 py-2 rounded border bg-red-600 text-white hover:bg-red-700 transition-colors"
                                onClick={() => confirmDeleteCategory(c.id, c.name)}
                                disabled={deletingCategoryId === c.id}
                              >
                                {deletingCategoryId === c.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'createCategory' && (
          <form className="bg-white rounded border p-4 sm:p-6 max-w-[720px]" onSubmit={handleCreateCategory}>
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
          <form className="bg-white rounded border p-4 sm:p-6" onSubmit={handleCreateProduct}>
            <h2 className="text-lg font-medium mb-4">Create Product</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.name} onChange={(e) => updateProductField('name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Product type</label>
                <select className="w-full border rounded px-3 py-2" value={productForm.product_type} onChange={(e) => updateProductField('product_type', e.target.value)} required>
                  <option value="individual">Individual</option>
                  <option value="bundle">Bundle</option>
                  <option value="kit">Kit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Subtitle</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.subtitle} onChange={(e) => updateProductField('subtitle', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="w-full border rounded px-3 py-2" value={productForm.category_id} onChange={(e) => updateProductField('category_id', e.target.value)} required>
                  <option value="">Select a category</option>
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
                <label className="block text-sm mb-1">Old price</label>
                <input 
                  className={`w-full border rounded px-3 py-2 ${!productForm.is_sale ? 'bg-gray-100 text-gray-400' : ''}`} 
                  inputMode="decimal" 
                  value={productForm.old_price} 
                  onChange={(e) => updateProductField('old_price', e.target.value)} 
                  disabled={!productForm.is_sale}
                />
              </div>

              {/* Move checkboxes right below price fields */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

              <div>
                <label className="block text-sm mb-1">Stock quantity</label>
                <input className="w-full border rounded px-3 py-2" type="number" value={productForm.stock_quantity} onChange={(e) => updateProductField('stock_quantity', e.target.value)} required min="0" />
              </div>
              <div>
                <label className="block text-sm mb-1">Tags (comma separated)</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.tags} onChange={(e) => updateProductField('tags', e.target.value)} required />
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
                <textarea className="w-full border rounded px-3 py-2" rows="4" value={productForm.description} onChange={(e) => updateProductField('description', e.target.value)} required />
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

        {activeTab === 'editCategory' && (
          <form className="bg-white rounded border p-4 sm:p-6 max-w-[720px]" onSubmit={handleUpdateCategory}>
            <h2 className="text-lg font-medium mb-4">Edit Category</h2>
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button className="bg-black text-white px-4 py-2 rounded hover:bg-white hover:text-black hover:outline-1 hover:outline-black order-1" type="submit">Update Category</button>
              <button
                type="button"
                className="px-4 py-2 rounded border hover:bg-gray-50 order-2"
                onClick={() => {
                  setEditingCategoryId(null)
                  setActiveTab('overview')
                  setCategoryName('')
                }}
              >Cancel</button>
              <button
                type="button"
                className="px-4 py-2 rounded border bg-red-600 text-white hover:bg-red-700 transition-colors order-3 sm:ml-auto"
                onClick={() => confirmDeleteCategory(editingCategoryId, categoryName)}
              >
                Delete Category
              </button>
            </div>
          </form>
        )}

        {activeTab === 'editProduct' && (
          <form className="bg-white rounded border p-4 sm:p-6" onSubmit={handleUpdateProduct}>
            <h2 className="text-lg font-medium mb-4">Edit Product</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.name} onChange={(e) => updateProductField('name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Product type</label>
                <select className="w-full border rounded px-3 py-2" value={productForm.product_type} onChange={(e) => updateProductField('product_type', e.target.value)} required>
                  <option value="individual">Individual</option>
                  <option value="bundle">Bundle</option>
                  <option value="kit">Kit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Subtitle</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.subtitle} onChange={(e) => updateProductField('subtitle', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="w-full border rounded px-3 py-2" value={productForm.category_id} onChange={(e) => updateProductField('category_id', e.target.value)} required>
                  <option value="">Select a category</option>
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
                <label className="block text-sm mb-1">Old price</label>
                <input 
                  className={`w-full border rounded px-3 py-2 ${!productForm.is_sale ? 'bg-gray-100 text-gray-400' : ''}`} 
                  inputMode="decimal" 
                  value={productForm.old_price} 
                  onChange={(e) => updateProductField('old_price', e.target.value)} 
                  disabled={!productForm.is_sale}
                />
              </div>

              {/* Move checkboxes right below price fields */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

              <div>
                <label className="block text-sm mb-1">Stock quantity</label>
                <input className="w-full border rounded px-3 py-2" type="number" value={productForm.stock_quantity} onChange={(e) => updateProductField('stock_quantity', e.target.value)} required min="0" />
              </div>
              <div>
                <label className="block text-sm mb-1">Tags (comma separated)</label>
                <input className="w-full border rounded px-3 py-2" value={productForm.tags} onChange={(e) => updateProductField('tags', e.target.value)} required />
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
                <textarea className="w-full border rounded px-3 py-2" rows="4" value={productForm.description} onChange={(e) => updateProductField('description', e.target.value)} required />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button className="bg-black text-white px-4 py-2 rounded hover:bg-white hover:text-black hover:outline-1 hover:outline-black order-1" type="submit">Update Product</button>
              <button
                type="button"
                className="px-4 py-2 rounded border hover:bg-gray-50 order-2"
                onClick={() => {
                  setEditingProductId(null)
                  setActiveTab('overview')
                  setProductForm({
                    name: '', subtitle: '', description: '', price: '', old_price: '', is_sale: false,
                    is_bestseller: false, is_new: false, category_id: '', product_type: 'individual', stock_quantity: 0,
                    tags: '', images: []
                  })
                }}
              >Cancel</button>
              <button
                type="button"
                className="px-4 py-2 rounded border bg-red-600 text-white hover:bg-red-700 transition-colors order-3 sm:ml-auto"
                onClick={() => confirmDeleteProduct(editingProductId, productForm.name)}
              >
                Delete Product
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">{statusMessage}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 order-2 sm:order-1"
                onClick={cancelDeleteProduct}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 order-1 sm:order-2"
                onClick={handleDeleteProduct}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Category delete confirmation modal */}
      {showCategoryDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">{statusMessage}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 order-2 sm:order-1"
                onClick={cancelDeleteCategory}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 order-1 sm:order-2"
                onClick={handleDeleteCategory}
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success notification at bottom */}
      {successMessage ? (
        <div className="fixed bottom-6 right-6 max-w-sm p-4 bg-green-50 border border-green-200 rounded-lg shadow-lg flex items-center gap-3 text-green-800 z-50">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">{successMessage}</div>
          <button 
            onClick={() => setSuccessMessage('')}
            className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  )
}
