/* Service worker do Planner: a app abre sem internet. A versão muda sempre que o código muda (o build escreve o número em 2b592656be). */
const VERSAO = 'planner-2b592656be';
const FICHEIROS = ['./', 'index.html', 'manifest.webmanifest', 'icone-180.png', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(FICHEIROS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('planner-') === 0 && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // a Microsoft e o OneDrive nunca passam pela cache (nem o início de sessão, nem os dados)
  if (/(^|\.)(microsoftonline\.com|microsoft\.com|live\.com|sharepoint\.com|1drv\.com|onedrive\.com|office\.com)$/.test(u.hostname)) return;
  if (u.origin === location.origin) {   // os ficheiros da app: responde logo com o que tem e atualiza em segundo plano
    const oauth = /[?&](code|state|error)=/.test(u.search);   // o regresso do início de sessão traz códigos no endereço: nunca se guarda
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(guardado => {
      const rede = fetch(e.request).then(r => { if (r && r.ok && !oauth) { const c = r.clone(); return caches.open(VERSAO).then(ca => ca.put(e.request, c)).then(() => r, () => r); } return r; }).catch(() => guardado);
      e.waitUntil(rede.catch(() => { }));   // a atualização em segundo plano não é cortada
      return guardado || rede;
    }));
    return;
  }
  if (/(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) {   // bibliotecas e tipos de letra: guarda-os à medida que se usam
    e.respondWith(caches.match(e.request).then(guardado => guardado || fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(e.request, c)); } return r; })));
  }
});
