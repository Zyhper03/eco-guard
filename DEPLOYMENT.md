Deployment notes

Netlify (frontend)
- Site URL (example): https://goaecoguard.netlify.app
- This project is static; Netlify can publish from the repository root.
- We added `netlify.toml` and `/_redirects` to proxy API calls to the Render backend.

Render (backend)
- Backend URL: https://eco-guard-backend.onrender.com
- `package.json` contains `start: node server.js` so Render can run the service.
- Ensure the following environment variables are configured in Render (Service -> Environment):
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (optional, for admin writes)
  - `JWT_SECRET`

Steps to deploy frontend to Netlify
1. Push repo to GitHub.
2. Create a new site on Netlify -> Connect to GitHub -> select this repo.
3. Build settings: no build command (leave blank), publish directory: `/` (project root).
4. Deploy site. Netlify will serve files and proxy `/api/*` to the Render backend.

Steps to deploy backend to Render
1. Create a new Web Service on Render -> Connect to GitHub -> select repo.
2. Branch: choose branch to deploy (e.g., `main`).
3. Start Command: `npm start` (or leave default).
4. Environment: set required env vars listed above.
5. Deploy; Render will provide the URL (use `https://eco-guard-backend.onrender.com` if that's your service URL).

Local testing
- To test locally with the backend running on port 3000, you can override `API_BASE` temporarily in the browser console:

  window.API_BASE = 'http://localhost:3000';

Or edit `script.js`, `login/auth.js`, and `admin/admin.js` to set `API_BASE` back to `http://localhost:3000` for local dev.

Troubleshooting
- If CORS errors appear, ensure the Render service allows requests from Netlify origin or rely on Netlify proxy (recommended).
- For file uploads, Render stores files in the deployed instance's filesystem which is ephemeral. Consider using Supabase Storage or S3 for persistent uploads.
