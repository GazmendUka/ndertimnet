// Applied only to the staging build, after public-page prerendering.
const fs = require('node:fs');
const path = require('node:path');
if (process.env.REACT_APP_DEPLOYMENT_ENVIRONMENT !== 'staging') {
  throw new Error('This command is for staging builds only.');
}
const build = path.resolve(__dirname, '../build');
function mark(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) mark(target);
    else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(target, 'utf8')
        .replace(/<meta\b[^>]*name=["']robots["'][^>]*>/gi, '')
        .replace('</head>', '<meta name="robots" content="noindex,nofollow,noarchive"></head>')
        .replace(/<body([^>]*)>/, '<body$1><div role="note" style="background:#111827;color:white;padding:12px;text-align:center;font:14px system-ui">STAGING · Vetëm për testim — jo shërbimi i vërtetë. Pagesat, mesazhet dhe ngarkimi i imazheve janë të çaktivizuara.</div>');
      fs.writeFileSync(target, html);
    }
  }
}
mark(build);
fs.writeFileSync(path.join(build, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('Staging HTML marked, indexing disabled.');
