const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'dist', '_redirects');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Use VITE_API_BASE from Netlify env, or fallback to the production URL
  let backendUrl = process.env.VITE_API_BASE || 'https://tawla-backend.up.railway.app';
  backendUrl = backendUrl.trim();
  if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
    backendUrl = 'https://' + backendUrl;
  }
  if (backendUrl.endsWith('/')) {
    backendUrl = backendUrl.slice(0, -1);
  }
  content = content.replace(/__BACKEND_URL__/g, backendUrl);
  fs.writeFileSync(filePath, content);
  console.log(`Successfully replaced __BACKEND_URL__ with ${backendUrl} in dist/_redirects`);
} else {
  console.warn(`Warning: dist/_redirects not found at ${filePath}`);
}
