// Netlify Function: Cloudinary signed upload signer
// Expects environment variables:
// - CLOUDINARY_CLOUD_NAME
// - CLOUDINARY_API_KEY
// - CLOUDINARY_API_SECRET
// Optional:
// - ALLOWED_ORIGIN (for CORS)

import crypto from 'crypto'

function corsHeaders(origin) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin === 'request' && origin ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  }
}

function sanitizeFolder(input) {
  const clean = String(input || '')
    .replace(/\.\.+/g, '') // remove ..
    .replace(/^\/+/, '') // no leading slash
    .replace(/[^a-zA-Z0-9_\/-]/g, '')
  return clean || 'bounty/products'
}

function buildSignature(params, apiSecret) {
  const keys = Object.keys(params).sort()
  const toSign = keys
    .map((k) => `${k}=${Array.isArray(params[k]) ? params[k].join(',') : params[k]}`)
    .join('&')
  return crypto.createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex')
}

export async function handler(event) {
  const headers = corsHeaders(event.headers?.origin)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Cloudinary configuration' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')

    // Whitelist and normalize upload params
    const timestamp = Math.floor(Date.now() / 1000)
    const folder = sanitizeFolder(body.folder || 'bounty/products')

    const allowedParams = {}
    allowedParams.timestamp = timestamp
    allowedParams.folder = folder

    // Optionally allow public_id, tags, context, eager (all signed)
    if (body.public_id && typeof body.public_id === 'string') {
      const pid = body.public_id.replace(/[^a-zA-Z0-9_\/-]/g, '')
      if (pid) allowedParams.public_id = pid
    }
    if (body.tags && typeof body.tags === 'string') {
      allowedParams.tags = body.tags
    }
    if (body.context && typeof body.context === 'string') {
      allowedParams.context = body.context
    }
    if (body.eager && typeof body.eager === 'string') {
      allowedParams.eager = body.eager
    }

    const signature = buildSignature(allowedParams, apiSecret)

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signature,
        timestamp,
        api_key: apiKey,
        cloud_name: cloudName,
        folder
      })
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request', details: String(err?.message || err) })
    }
  }
}


