/* =====================================================
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
    let html = `
      <a href="#/" class="nav-link" data-nav="home">
        <span class="material-symbols-outlined">dashboard</span>
        <span>${config.labels?.dashboard || 'Painel'}</span>
      </a>`;

    categories.forEach(cat => {
      html += `
        <a href="#/category/${cat.id}" class="nav-link" data-nav="${cat.id}">
          <span class="material-symbols-outlined">${cat.icon || 'folder'}</span>
          <span>${WikiEditor.sanitize(cat.label)}</span>
        </a>`;
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

  // ===== DARK MODE TOGGLE =====
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    // Check saved preference
    const savedTheme = localStorage.getItem('wiki-dark-mode');
    if (savedTheme === 'true') {
      document.body.classList.add('dark-mode');
      const icon = themeToggle.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'light_mode';
    }

    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('wiki-dark-mode', isDark);
      const icon = themeToggle.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    });
  }

  WikiAnimations.init();
})();
