/* =====================================================
   EXPORT.JS — Gerador de Site Estático para GitHub Pages
   Remove todas as informações ocultas, segredos,
   e elementos de edição do GM.
   ===================================================== */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DOCS_DIR = path.join(__dirname, 'docs');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch { return fallback; }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// === SANITIZAÇÃO DE DADOS ===

// Remove spans com classe secret-text respeitando tags aninhadas
function removeSecretSpans(html) {
  const result = [];
  let i = 0;
  while (i < html.length) {
    const matchIdx = html.indexOf('<span', i);
    if (matchIdx === -1) { result.push(html.slice(i)); break; }
    const tagEnd = html.indexOf('>', matchIdx);
    if (tagEnd === -1) { result.push(html.slice(i)); break; }
    const tag = html.slice(matchIdx, tagEnd + 1);
    const isSecret = /class\s*=\s*["'][^"']*secret-text[^"']*["']/.test(tag);
    if (isSecret) {
      result.push(html.slice(i, matchIdx));
      let depth = 1;
      let j = tagEnd + 1;
      while (j < html.length && depth > 0) {
        if (html.startsWith('<span', j)) { depth++; j += 5; }
        else if (html.startsWith('</span>', j)) { depth--; j += 7; }
        else { j++; }
      }
      i = j;
    } else {
      result.push(html.slice(i, tagEnd + 1));
      i = tagEnd + 1;
    }
  }
  return result.join('');
}

// Escapa caracteres HTML para evitar XSS no HTML estático gerado
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


function sanitizeTopics(topics) {
  return topics
    // 1. Remover tópicos ocultos (visible === false)
    .filter(t => t.visible !== false)
    // 2. Limpar conteúdo sensível
    .map(t => {
      const clean = { ...t };

      // Remover texto secreto do conteúdo (parser próprio para lidar com spans aninhados)
      if (clean.content) {
        clean.content = removeSecretSpans(clean.content);
      }

      // Remover segredos dos metadados de personagem
      if (clean.metadata) {
        clean.metadata = { ...clean.metadata };
        delete clean.metadata.secrets;
      }

      // Garantir que visible não seja false (redundante mas seguro)
      delete clean.visible;

      return clean;
    });
}

// === GERAÇÃO DO HTML ESTÁTICO ===

function generateStaticHTML(config) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.siteName) || 'Wiki'} — ${escapeHtml(config.siteSubtitle) || 'Arquivo'}</title>
  <meta name="description" content="${(config.siteDescription || '').replace(/"/g, '&quot;')}">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Lato:wght@400;700&family=Raleway:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <!-- Styles -->
  <link rel="stylesheet" href="css/wiki.css?v=${Date.now()}">
</head>
<body class="player-mode">

  <div id="app-shell">

    <!-- ===== HEADER (Sem modo GM, sem config) ===== -->
    <header id="app-header">
      <div style="display:flex;align-items:center;gap:1rem">
        <button id="menu-toggle" class="btn-icon" style="background:transparent;border:none;cursor:pointer;color:var(--on-surface-variant);display:none" title="Menu">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <a href="#/" style="text-decoration:none;display:flex;align-items:center;gap:0.75rem">
          <div style="width:2rem;height:2rem;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--primary),var(--primary-container));display:flex;align-items:center;justify-content:center">
            <span class="material-symbols-outlined" style="color:white;font-size:16px">shield</span>
          </div>
          <div>
            <div class="font-headline" style="font-size:0.875rem;font-weight:800;letter-spacing:0.05em;color:var(--on-surface)" id="site-name">${escapeHtml(config.siteName) || 'WIKI'}</div>
            <div class="font-label" style="font-size:0.5625rem;color:var(--outline);text-transform:uppercase;letter-spacing:0.15em" id="site-subtitle">${escapeHtml(config.siteSubtitle) || ''}</div>
          </div>
        </a>
      </div>

      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="position:relative">
          <span class="material-symbols-outlined" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);font-size:16px;color:var(--outline)">search</span>
          <input type="text" id="search-input" placeholder="Pesquisar arquivos..." class="form-input" style="padding-left:2.25rem;width:250px;height:2.25rem;font-size:0.8125rem">
        </div>
      </div>
    </header>

    <div id="app-body">
      <!-- ===== SIDEBAR ===== -->
      <aside id="sidebar">
        <nav id="sidebar-nav">
          <!-- Gerado dinamicamente -->
        </nav>
      </aside>

      <!-- ===== MAIN CONTENT ===== -->
      <main id="app-content">
        <!-- Gerado dinamicamente -->
      </main>
    </div>

    <!-- ===== FOOTER ===== -->
    <footer id="app-footer">
      <div class="tech-line" style="max-width:600px"></div>
      <div style="display:flex;align-items:center;gap:0.5rem">
        <span class="material-symbols-outlined" style="font-size:14px;color:var(--primary)">terminal</span>
        <span class="font-label" style="font-size:0.6875rem;color:var(--outline);text-transform:uppercase;letter-spacing:0.15em">TERMINAL DE ARQUIVO</span>
      </div>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center" id="footer-links">
        ${(config.footerLinks || []).map(l => `<a href="${escapeHtml(l.href) || '#'}" style="color:var(--outline);text-decoration:none;font-size:0.75rem">${escapeHtml(l.label)}</a>`).join('\n        ')}
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.6875rem;color:var(--outline)">
        <span class="material-symbols-outlined" style="font-size:12px">database</span>
        Status do Banco: <span style="color:var(--primary);font-weight:600">Operacional</span>
        <span style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block"></span>
      </div>
    </footer>

  </div>

  <!-- Scripts (versão estática) -->
  <script src="js/data.js?v=${Date.now()}"></script>
  <script src="js/auth.js?v=${Date.now()}"></script>
  <script src="js/store.js?v=${Date.now()}"></script>
  <script src="js/animations.js?v=${Date.now()}"></script>
  <script src="js/editor.js?v=${Date.now()}"></script>
  <script src="js/renderer.js?v=${Date.now()}"></script>
  <script src="js/app.js?v=${Date.now()}"></script>

</body>
</html>`;
}

// === GERAÇÃO DOS JS ESTÁTICOS ===

function generateDataJS(topics, categories, config) {
  return `/* Dados embarcados — Gerado automaticamente pelo exportador */
window.__WIKI_DATA__ = ${JSON.stringify({ topics, categories, config }, null, 2)};
`;
}

function generateStaticAuth() {
  return `/* =====================================================
   AUTH.JS — Versão Estática (Somente Leitura)
   ===================================================== */

window.WikiAuth = (function () {
  function init() {
    document.body.classList.remove('master-mode');
    document.body.classList.add('player-mode');
    return Promise.resolve();
  }
  return {
    init,
    login: () => Promise.resolve(false),
    logout: () => {},
    isAuthenticated: () => false,
    isMasterMode: () => false,
    getMode: () => 'player',
    changePassword: () => Promise.resolve(false),
    onModeChange: () => {},
    getHeaders: () => ({ 'Content-Type': 'application/json' })
  };
})();
`;
}

function generateStaticStore() {
  return `/* =====================================================
   STORE.JS — Versão Estática (Dados Embarcados)
   ===================================================== */

window.WikiStore = (function () {
  const embedded = window.__WIKI_DATA__ || { topics: [], categories: [], config: {} };
  let cachedTopics = embedded.topics;
  let cachedCategories = embedded.categories;
  let cachedConfig = embedded.config;

  async function fetchTopics() { return cachedTopics; }
  async function fetchCategories() { return cachedCategories; }
  async function fetchConfig() { return cachedConfig; }

  function getCategories() { return cachedCategories; }
  function getAllTopics() { return cachedTopics; }
  function getTopicById(id) { return cachedTopics.find(t => t.id === id) || null; }
  function getTopicsByCategory(category) {
    return cachedTopics.filter(t => t.category === category && !t.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  function getSubtopics(parentId) {
    return cachedTopics.filter(t => t.parentId === parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  function getVisibleTopics(category) {
    let topics = cachedTopics.filter(t => !t.parentId);
    if (category) topics = topics.filter(t => t.category === category);
    return topics.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  function getVisibleSubtopics(parentId) { return getSubtopics(parentId); }
  function searchTopics(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return cachedTopics.filter(t => t.title.toLowerCase().includes(q) || (t.content || '').toLowerCase().includes(q));
  }

  function isVisible() { return true; }
  function getHiddenCount() { return 0; }
  function getConfig() { return cachedConfig; }
  function getLabel(key) { return cachedConfig.labels?.[key] || key; }

  // Métodos de escrita — no-ops na versão estática
  async function saveConfig() { return null; }
  async function createCategory() { return null; }
  async function updateCategory() { return null; }
  async function deleteCategory() {}
  async function createTopic() { return null; }
  async function updateTopic() { return null; }
  async function deleteTopic() {}
  async function toggleVisibility() { return false; }
  async function revealAll() {}

  return {
    fetchTopics, fetchCategories, fetchConfig, saveConfig, getConfig, getLabel,
    getCategories, createCategory, updateCategory, deleteCategory,
    getAllTopics, getTopicById, getTopicsByCategory, getSubtopics,
    getVisibleTopics, getVisibleSubtopics, searchTopics,
    createTopic, updateTopic, deleteTopic,
    isVisible, toggleVisibility, getHiddenCount, revealAll
  };
})();
`;
}

function generateStaticEditor() {
  return `/* =====================================================
   EDITOR.JS — Versão Estática (Stubs)
   ===================================================== */

window.WikiEditor = (function () {
  function sanitize(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init: () => {},
    sanitize,
    openTopicModal: () => {},
    closeTopicModal: () => {},
    saveFromModal: () => Promise.resolve(),
    getIconPickerHTML: () => '',
    uploadPortrait: () => {}
  };
})();
`;
}

function generateStaticApp() {
  return `/* =====================================================
   APP.JS — Versão Estática (Somente Leitura)
   ===================================================== */

(async function () {
  'use strict';

  await WikiAuth.init();

  const config = await WikiStore.fetchConfig();
  WikiRenderer.init('app-content');
  WikiRenderer.setConfig(config);

  await WikiStore.fetchCategories();
  await WikiStore.fetchTopics();

  applyDesignTokens(config);
  buildSidebar();
  bindGlobalEvents();
  route();

  window.addEventListener('hashchange', route);

  // ===== ROTEAMENTO =====
  function route() {
    const hash = window.location.hash || '#/';
    const parts = hash.replace('#/', '').split('/');

    if (parts[0] === 'category' && parts[1]) {
      WikiRenderer.renderCategory(parts[1]);
      setActiveNav(parts[1]);
    } else if (parts[0] === 'topic' && parts[1]) {
      WikiRenderer.renderTopic(parts[1]);
    } else if (parts[0] === 'search') {
      const query = decodeURIComponent(parts.slice(1).join('/'));
      WikiRenderer.renderSearch(query);
    } else {
      WikiRenderer.renderHome();
      setActiveNav('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setActiveNav(id) {
    document.querySelectorAll('#sidebar .nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === id);
    });
  }

  // ===== SIDEBAR =====
  function buildSidebar() {
    const categories = WikiStore.getCategories();
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    let html = \`
      <a href="#/" class="nav-link" data-nav="home">
        <span class="material-symbols-outlined">dashboard</span>
        <span>\${config.labels?.dashboard || 'Painel'}</span>
      </a>\`;

    categories.forEach(cat => {
      html += \`
        <a href="#/category/\${cat.id}" class="nav-link" data-nav="\${cat.id}">
          <span class="material-symbols-outlined">\${cat.icon || 'folder'}</span>
          <span>\${WikiEditor.sanitize(cat.label)}</span>
        </a>\`;
    });
    nav.innerHTML = html;
    setActiveNav(window.location.hash.includes('/category/') ? window.location.hash.split('/category/')[1]?.split('/')[0] : 'home');
  }

  // ===== DESIGN TOKENS =====
  function applyDesignTokens(cfg) {
    const d = cfg.design || {};
    const c = d.colors || {};
    const f = d.fonts || {};
    const l = d.layout || {};
    const root = document.documentElement;

    if (c.primary) root.style.setProperty('--primary', c.primary);
    if (c.primaryContainer) root.style.setProperty('--primary-container', c.primaryContainer);
    if (c.onPrimary) root.style.setProperty('--on-primary', c.onPrimary);
    if (c.secondary) root.style.setProperty('--secondary', c.secondary);
    if (c.secondaryContainer) root.style.setProperty('--secondary-container', c.secondaryContainer);
    if (c.tertiary) root.style.setProperty('--tertiary', c.tertiary);
    if (c.error) root.style.setProperty('--error', c.error);
    if (c.background) root.style.setProperty('--surface', c.background);
    if (c.surface) root.style.setProperty('--surface', c.surface);
    if (c.surfaceContainer) root.style.setProperty('--surface-container', c.surfaceContainer);
    if (c.surfaceContainerLow) root.style.setProperty('--surface-container-low', c.surfaceContainerLow);
    if (c.onSurface) root.style.setProperty('--on-surface', c.onSurface);
    if (c.onSurfaceVariant) root.style.setProperty('--on-surface-variant', c.onSurfaceVariant);
    if (c.outline) root.style.setProperty('--outline', c.outline);
    if (c.headerBg) root.style.setProperty('--header-bg', c.headerBg);
    if (c.sidebarBg) root.style.setProperty('--sidebar-bg', c.sidebarBg);
    if (f.headline) root.style.setProperty('--font-headline', "'" + f.headline + "', sans-serif");
    if (f.body) root.style.setProperty('--font-body', "'" + f.body + "', sans-serif");
    if (f.label) root.style.setProperty('--font-label', "'" + f.label + "', sans-serif");
    if (l.sidebarWidth) root.style.setProperty('--sidebar-width', l.sidebarWidth);

    const siteNameEl = document.getElementById('site-name');
    if (siteNameEl && cfg.siteName) siteNameEl.textContent = cfg.siteName;
    const siteSubEl = document.getElementById('site-subtitle');
    if (siteSubEl && cfg.siteSubtitle) siteSubEl.textContent = cfg.siteSubtitle;
    document.title = (cfg.siteName || 'Wiki') + ' — ' + (cfg.siteSubtitle || 'Arquivo');

    const footerLinks = document.getElementById('footer-links');
    if (footerLinks && cfg.footerLinks) {
      footerLinks.innerHTML = cfg.footerLinks.map(l => '<a href="' + (l.href || '#') + '" style="color:var(--outline);text-decoration:none;font-size:0.75rem;transition:color 0.2s">' + WikiEditor.sanitize(l.label) + '</a>').join('');
    }
  }

  // ===== EVENTOS GLOBAIS =====
  function bindGlobalEvents() {
    // Pesquisa
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const q = searchInput.value.trim();
          if (q.length >= 2) window.location.hash = '#/search/' + encodeURIComponent(q);
        }, 400);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          if (q) window.location.hash = '#/search/' + encodeURIComponent(q);
        }
      });
    }

    // Mobile sidebar
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      });
    }

    // Mobile menu toggle visibility
    if (window.innerWidth <= 768 && menuToggle) {
      menuToggle.style.display = 'flex';
    }
    window.addEventListener('resize', () => {
      if (menuToggle) menuToggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    });

    // Delegação de eventos no conteúdo (somente wiki links)
    const content = document.getElementById('app-content');
    if (content) {
      content.addEventListener('click', (e) => {
        const wikiLink = e.target.closest('.wiki-link');
        if (wikiLink) {
          e.preventDefault();
          const href = wikiLink.getAttribute('href');
          if (href) window.location.hash = href;
        }
      });
    }
  }

  WikiAnimations.init();
})();
`;
}

// === EXECUÇÃO PRINCIPAL ===

function runExport() {
  console.log('📦 Iniciando exportação para GitHub Pages...');
  console.log('');

  // Limpar diretório de saída
  if (fs.existsSync(DOCS_DIR)) {
    fs.rmSync(DOCS_DIR, { recursive: true, force: true });
  }
  ensureDir(DOCS_DIR);

  // Ler dados
  const topics = readJson('topics.json', []);
  const categories = readJson('categories.json', []);
  const config = readJson('config.json', {});

  // Sanitizar
  const cleanTopics = sanitizeTopics(topics);
  const hiddenCount = topics.length - cleanTopics.length;
  let secretsStripped = 0;

  cleanTopics.forEach(t => {
    if (t.content && t.content !== topics.find(o => o.id === t.id)?.content) secretsStripped++;
  });

  topics.forEach(t => {
    if (t.metadata?.secrets) secretsStripped++;
  });

  console.log(`📊 Dados processados:`);
  console.log(`   • ${topics.length} tópicos encontrados`);
  console.log(`   • ${hiddenCount} tópicos ocultos removidos`);
  console.log(`   • ${secretsStripped} segredos limpos`);
  console.log(`   • ${cleanTopics.length} tópicos exportados`);
  console.log(`   • ${categories.length} categorias`);
  console.log('');

  // Gerar arquivos

  // 1. CSS
  const cssDir = path.join(__dirname, 'css');
  if (fs.existsSync(cssDir)) {
    ensureDir(path.join(DOCS_DIR, 'css'));
    fs.readdirSync(cssDir).forEach(f => {
      copyFile(path.join(cssDir, f), path.join(DOCS_DIR, 'css', f));
    });
    console.log('✅ CSS copiado');
  }

  // 2. HTML
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), generateStaticHTML(config), 'utf8');
  console.log('✅ index.html gerado (sem elementos de edição)');

  // 3. JS
  ensureDir(path.join(DOCS_DIR, 'js'));

  fs.writeFileSync(path.join(DOCS_DIR, 'js', 'data.js'), generateDataJS(cleanTopics, categories, config), 'utf8');
  console.log('✅ js/data.js gerado (dados embarcados e sanitizados)');

  fs.writeFileSync(path.join(DOCS_DIR, 'js', 'auth.js'), generateStaticAuth(), 'utf8');
  console.log('✅ js/auth.js gerado (somente leitura)');

  fs.writeFileSync(path.join(DOCS_DIR, 'js', 'store.js'), generateStaticStore(), 'utf8');
  console.log('✅ js/store.js gerado (dados embarcados)');

  fs.writeFileSync(path.join(DOCS_DIR, 'js', 'editor.js'), generateStaticEditor(), 'utf8');
  console.log('✅ js/editor.js gerado (stub mínimo)');

  // Copiar animations.js e renderer.js (sem alterações)
  copyFile(path.join(__dirname, 'js', 'animations.js'), path.join(DOCS_DIR, 'js', 'animations.js'));
  console.log('✅ js/animations.js copiado');

  copyFile(path.join(__dirname, 'js', 'renderer.js'), path.join(DOCS_DIR, 'js', 'renderer.js'));
  console.log('✅ js/renderer.js copiado');

  fs.writeFileSync(path.join(DOCS_DIR, 'js', 'app.js'), generateStaticApp(), 'utf8');
  console.log('✅ js/app.js gerado (somente leitura)');

  console.log('');
  console.log('🎉 Exportação concluída com sucesso!');
  console.log(`📁 Arquivos gerados em: ${DOCS_DIR}`);
  console.log('');
  console.log('📋 Próximos passos:');
  console.log('   1. Faça commit do diretório "docs/" no seu repositório');
  console.log('   2. No GitHub, vá em Settings → Pages');
  console.log('   3. Em "Source", selecione "Deploy from a branch"');
  console.log('   4. Selecione a branch e pasta "/docs"');
  console.log('   5. Clique em "Save"');

  return {
    success: true,
    stats: {
      totalTopics: topics.length,
      exportedTopics: cleanTopics.length,
      hiddenRemoved: hiddenCount,
      secretsStripped,
      categories: categories.length
    }
  };
}

// Se executado diretamente pela CLI
if (require.main === module) {
  runExport();
}

module.exports = { runExport };
