# Bounty

React + Vite storefront and admin with Supabase and Cloudinary uploads.

## Development

1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`

## Cloudinary uploads (Netlify)

- Netlify function: `netlify/functions/sign-cloudinary.js` signs uploads.
- Set env vars in Netlify:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - Optional: `ALLOWED_ORIGIN` (e.g., `https://your-site.netlify.app` or `*` for local)
- Frontend env vars (in `.env`):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_CLOUDINARY_CLOUD_NAME`
  - Optional: `VITE_CLOUDINARY_SIGNER_URL` (defaults to `/.netlify/functions/sign-cloudinary`)

