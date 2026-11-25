from pathlib import Path
import re,base64,hashlib
p=Path('web'); h=(p/'index.html').read_text(); css=(p/'styles.css').read_text(); js=(p/'app.js').read_text()
for f in [p/'icon.svg',*(p/'assets').glob('*.svg')]:
    old='/'+str(f.relative_to(p)); data='data:image/svg+xml;base64,'+base64.b64encode(f.read_bytes()).decode(); h=h.replace(old,data); css=css.replace(old,data)
h=re.sub(r'\s*<link rel="manifest"[^>]+>','',h)
h=h.replace('<link rel="stylesheet" href="/styles.css">','<style>'+css+'\n.preview-notice{position:fixed;z-index:10000;bottom:0;left:0;right:0;padding:12px 20px;background:#13252d;color:#fff;border-top:1px solid #d6af68;font:14px/1.5 system-ui;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center}.preview-notice a{color:#ffe09a;text-decoration:underline}.preview-notice[hidden]{display:none}body.preview-mode .main-content{padding-bottom:80px}body.preview-mode form :disabled{opacity:.6}</style>')
h=re.sub(r'\s*<script src="/deployment.js" defer></script>','',h)
h=re.sub(r'\s*<script src="/app.js" type="module" defer></script>','',h)
preview='''document.body.classList.add('preview-mode');document.getElementById('offline-notice').hidden=false;document.querySelectorAll('form input,form textarea,form button,form select').forEach(x=>x.disabled=true);document.querySelectorAll('button').forEach(x=>{if(!x.matches('[data-view],#menu-button,#new-chat,#user-avatar'))x.disabled=true});const view=(name)=>{document.querySelectorAll('.view').forEach(x=>x.classList.toggle('hidden',x.id!=='view-'+name));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));document.getElementById('view-heading').textContent=name[0].toUpperCase()+name.slice(1);document.body.classList.remove('sidebar-open');document.getElementById('sidebar').classList.remove('open');};document.querySelectorAll('[data-view]').forEach(x=>x.addEventListener('click',()=>view(x.dataset.view)));document.getElementById('new-chat').onclick=()=>view('chat');document.getElementById('user-avatar').onclick=()=>view('settings');document.getElementById('menu-button').onclick=()=>{document.body.classList.toggle('sidebar-open');document.getElementById('sidebar').classList.toggle('open');};const t=document.getElementById('theme-select');t.onchange=()=>document.documentElement.dataset.theme=t.value;document.getElementById('auth-screen').classList.add('hidden');'''
script="if(location.protocol==='file:'){"+preview+"}else{window.OMNI_PROXY=location.hostname.endsWith('.netlify.app');\n"+js+"\n}"
notice='<div id="offline-notice" class="preview-notice" hidden><strong>Offline interface preview — AI and account actions are disabled.</strong><span>Extract the ZIP, run <code>npm start</code> using Node 22+, then <a href="http://localhost:3000/standalone.html">open the live app</a>.</span></div>'
h=h.replace('</body>',notice+'\n<script type="module">'+script+'</script>\n</body>')
(p/'standalone.html').write_text(h)
# Permit only these exact inline assets on the single-file page, not arbitrary inline scripts.
style=re.search(r'<style>(.*?)</style>',h,re.S).group(1)
sha=lambda v:base64.b64encode(hashlib.sha256(v.encode()).digest()).decode()
app=Path('server/app.js'); a=app.read_text(); a=re.sub(r'\n      // standalone CSP start[\s\S]*?// standalone CSP end','',a)
marker="      const route=url.pathname;"
extra=f'''\n      // standalone CSP start
      if(route==='/standalone.html')res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'sha256-{sha(style)}'; script-src 'self' 'sha256-{sha(script)}'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; frame-src 'self' blob:; media-src 'self' blob:");
      // standalone CSP end'''
app.write_text(a.replace(marker,marker+extra))

