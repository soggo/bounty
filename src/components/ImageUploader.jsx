import { useCallback, useMemo, useRef, useState } from 'react'

const MAX_FILES = 8
const MAX_BYTES = 8 * 1024 * 1024 // 8MB
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

export default function ImageUploader({ value, onChange, signerUrl, cloudName }) {
  const [uploads, setUploads] = useState([])
  const [error, setError] = useState('')
  const [isDragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const items = useMemo(() => Array.isArray(value) ? value : [], [value])

  const remaining = Math.max(0, MAX_FILES - (items.length + uploads.length))

  const onPick = () => inputRef.current?.click()

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    setError('')
    setDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    await handleFiles(files)
  }, [items, uploads])

  const onSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    await handleFiles(files)
    e.target.value = ''
  }

  async function handleFiles(files) {
    const allowed = []
    for (const file of files) {
      if (!ACCEPT.includes(file.type)) {
        setError('Only JPEG, PNG, and WEBP are allowed')
        continue
      }
      if (file.size > MAX_BYTES) {
        setError('File too large (max 8MB)')
        continue
      }
      if (remaining <= 0) break
      allowed.push(file)
    }
    if (!allowed.length) return

    const newUploads = allowed.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: 'pending'
    }))
    setUploads((prev) => [...prev, ...newUploads])

    for (const u of newUploads) {
      await uploadOne(u)
    }
  }

  async function uploadOne(u) {
    try {
      updateUpload(u.id, { status: 'signing', progress: 5 })

      const folder = 'bounty/products/temp'
      const signRes = await fetch(signerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
      })
      if (!signRes.ok) throw new Error(`Sign failed: ${await signRes.text()}`)
      const { signature, timestamp, api_key, cloud_name, folder: signedFolder } = await signRes.json()

      const form = new FormData()
      form.append('file', u.file)
      form.append('api_key', api_key)
      form.append('timestamp', String(timestamp))
      form.append('signature', signature)
      form.append('folder', signedFolder)

      updateUpload(u.id, { status: 'uploading', progress: 10 })

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name || cloudName}/auto/upload`
      const xhr = new XMLHttpRequest()
      xhr.open('POST', uploadUrl, true)
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.max(10, Math.min(98, Math.round((evt.loaded / evt.total) * 100)))
          updateUpload(u.id, { progress: pct })
        }
      }
      const done = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`))
        }
        xhr.onerror = () => reject(new Error('Network error'))
      })
      xhr.send(form)
      await done

      const result = JSON.parse(xhr.responseText)
      const next = [
        ...items,
        {
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes
        }
      ]
      onChange(next)
      updateUpload(u.id, { status: 'done', progress: 100 })
      setTimeout(() => {
        setUploads((prev) => prev.filter((x) => x.id !== u.id))
      }, 400)
    } catch (err) {
      setError(String(err?.message || err))
      updateUpload(u.id, { status: 'error' })
    }
  }

  function updateUpload(id, patch) {
    setUploads((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function removeAt(idx) {
    const next = items.filter((_, i) => i !== idx)
    onChange(next)
  }

  function onDragOver(e) {
    e.preventDefault()
  }

  function onDragEnter(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e) {
    e.preventDefault()
    setDragging(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPick()
    }
  }

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded p-6 transition cursor-pointer select-none flex flex-col items-center justify-center text-center ${isDragging ? 'border-black bg-gray-100' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onClick={onPick}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Upload images by clicking to browse or drag and drop"
        title="Click to upload or drag & drop"
      >
        <div className="text-gray-400 mb-2" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5L12 3m0 0l4.5 4.5M12 3v12" />
          </svg>
        </div>
        <div className="text-sm text-gray-700">
          <span className="underline">Click to upload</span> or drag & drop
        </div>
        <div className="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP up to 8MB each. {remaining} slots left.</div>
        <input ref={inputRef} type="file" accept={ACCEPT.join(',')} multiple className="hidden" onChange={onSelect} />
      </div>

      {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}

      {uploads.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {uploads.map((u) => (
            <div key={u.id} className="border rounded p-2 text-xs">
              <div className="truncate">{u.file.name}</div>
              <div className="h-1 bg-gray-200 rounded overflow-hidden mt-2">
                <div className="h-full bg-black" style={{ width: `${u.progress}%` }} />
              </div>
              <div className="mt-1 text-gray-500">{u.status}</div>
            </div>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Uploaded</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((img, idx) => (
              <div key={img.public_id || img.url} className="relative group">
                <img src={img.url} alt={img.public_id} className="w-full h-40 object-cover rounded border" />
                <button
                  type="button"
                  className="absolute top-1 right-1 text-xs bg-black text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); removeAt(idx) }}
                >Remove</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}


