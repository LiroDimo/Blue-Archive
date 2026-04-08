/* =====================================================
   APP.JS — Roteador Principal & Gerenciamento Global
   ===================================================== */

(async function () {
  'use strict';

  // ===== INICIALIZAÇÃO =====
  await WikiAuth.init();
  WikiEditor.init();

  const config = await WikiStore.fetchConfig();
  WikiRenderer.init('app-content');
  WikiRenderer.setConfig(config);

  await WikiStore.fetchCategories();
  await WikiStore.fetchTopics();

  // Dark Mode
  if (localStorage.getItem('wiki-dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
  }

  applyDesignTokens(config);
  buildSidebar();
  bindGlobalEvents();
  route();

  window.addEventListener('hashchange', route);

  WikiAuth.onModeChange(async (mode) => {
    await WikiStore.fetchTopics();
    buildSidebar();
    updateToolbar();
    route();
  });

  // ===== ROTEAMENTO =====
  function route() {
    const hash = window.location.hash || '#/';
    const parts = hash.replace('#/', '').split('/');

    if (parts[0] === 'category' && parts[1]) {
      WikiRenderer.renderCategory(parts[1]);
      setActiveNav(parts[1]);
    } else if (parts[0] === 'topic' && parts[1]) {
      WikiRenderer.renderTopic(parts[1]);
      // Gallery lightbox setup
      setTimeout(() => setupGalleryLightbox(), 100);
    } else if (parts[0] === 'timeline') {
      WikiRenderer.renderTimeline();
      setActiveNav('timeline');
    } else if (parts[0] === 'search') {
      const rawQuery = decodeURIComponent(parts.slice(1).join('/'));
      // Check for tag: prefix
      if (rawQuery.startsWith('tag:')) {
        const tag = rawQuery.substring(4);
        WikiRenderer.setSearchState('', { tag });
        WikiRenderer.renderSearchAdvanced('', { tag });
      } else {
        WikiRenderer.setSearchState(rawQuery, {});
        WikiRenderer.renderSearchAdvanced(rawQuery, {});
      }
    } else {
      WikiRenderer.renderHome();
      setActiveNav('home');
      if (WikiAuth.isMasterMode()) {
        setTimeout(() => initHomeSections(), 50);
      }
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

    // Special pages
    html += `
      <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--outline-variant)">
        <a href="#/timeline" class="nav-link" data-nav="timeline">
          <span class="material-symbols-outlined">schedule</span>
          <span>Linha do Tempo</span>
        </a>
      </div>`;

    nav.innerHTML = html;
    setActiveNav(window.location.hash.includes('/category/') ? window.location.hash.split('/category/')[1]?.split('/')[0] : 'home');
  }

  // ===== TOOLBAR GM =====
  function updateToolbar() {
    const hiddenCount = WikiStore.getHiddenCount();
    const countEl = document.getElementById('hidden-count');
    if (countEl) countEl.textContent = hiddenCount + ' itens ocultos';
  }

  // ===== DESIGN TOKENS =====
  function applyDesignTokens(cfg) {
    const d = cfg.design || {};
    const c = d.colors || {};
    const f = d.fonts || {};
    const lay = d.layout || {};
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
    if (f.headline) root.style.setProperty('--font-headline', `'${f.headline}', sans-serif`);
    if (f.body) root.style.setProperty('--font-body', `'${f.body}', sans-serif`);
    if (f.label) root.style.setProperty('--font-label', `'${f.label}', sans-serif`);
    if (lay.sidebarWidth) root.style.setProperty('--sidebar-width', lay.sidebarWidth);

    // Atualizar título do site
    const siteNameEl = document.getElementById('site-name');
    if (siteNameEl && cfg.siteName) siteNameEl.textContent = cfg.siteName;
    const siteSubEl = document.getElementById('site-subtitle');
    if (siteSubEl && cfg.siteSubtitle) siteSubEl.textContent = cfg.siteSubtitle;
    document.title = (cfg.siteName || 'Wiki') + ' — ' + (cfg.siteSubtitle || 'Arquivo Tático');

    // Footer
    const footerLinks = document.getElementById('footer-links');
    if (footerLinks && cfg.footerLinks) {
      footerLinks.innerHTML = cfg.footerLinks.map(link => `<a href="${link.href || '#'}" style="color:var(--outline);text-decoration:none;font-size:0.75rem;transition:color 0.2s">${WikiEditor.sanitize(link.label)}</a>`).join('');
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

    // Toggle modo mestre — sem senha, uso local apenas
    const loginBtn = document.getElementById('master-mode-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        if (WikiAuth.isMasterMode()) {
          WikiAuth.logout();
        } else {
          await WikiAuth.login();
          await WikiStore.fetchTopics();
          buildSidebar();
          route();
          updateToolbar();
        }
      });
    }

    // Fechar modais
    document.querySelectorAll('.modal-close, [data-dismiss]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-backdrop').classList.remove('open');
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
    });

    // Salvar/Cancelar Tópico
    const saveBtn = document.getElementById('topic-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      await WikiEditor.saveFromModal();
      route();
    });

    const cancelBtn = document.getElementById('topic-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', WikiEditor.closeTopicModal);

    // GM Toolbar
    const revealAllBtn = document.getElementById('reveal-all-btn');
    if (revealAllBtn) {
      revealAllBtn.addEventListener('click', async () => {
        await WikiStore.revealAll();
        updateToolbar();
        route();
      });
    }

    const exitGmBtn = document.getElementById('exit-gm-btn');
    if (exitGmBtn) exitGmBtn.addEventListener('click', () => WikiAuth.logout());



    // Exportar para GitHub Pages
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        if (!WikiAuth.isMasterMode()) return;
        const backdrop = document.getElementById('export-modal-backdrop');
        const loading = document.getElementById('export-loading');
        const success = document.getElementById('export-success');
        const errorEl = document.getElementById('export-error');

        loading.style.display = 'block';
        success.style.display = 'none';
        errorEl.style.display = 'none';
        backdrop.classList.add('open');

        try {
          const resp = await fetch('/api/export', {
            method: 'POST',
            headers: WikiAuth.getHeaders()
          });
          const result = await resp.json();
          loading.style.display = 'none';

          if (result.success) {
            const stats = result.stats;
            document.getElementById('export-stats').innerHTML = `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
                <div style="text-align:center;padding:0.5rem">
                  <div class="font-headline" style="font-size:1.5rem;font-weight:800;color:var(--primary)">${stats.exportedTopics}</div>
                  <div class="font-label" style="font-size:0.625rem;color:var(--outline);text-transform:uppercase">Tópicos Exportados</div>
                </div>
                <div style="text-align:center;padding:0.5rem">
                  <div class="font-headline" style="font-size:1.5rem;font-weight:800;color:var(--error)">${stats.hiddenRemoved}</div>
                  <div class="font-label" style="font-size:0.625rem;color:var(--outline);text-transform:uppercase">Ocultos Removidos</div>
                </div>
                <div style="text-align:center;padding:0.5rem">
                  <div class="font-headline" style="font-size:1.5rem;font-weight:800;color:#f59e0b">${stats.secretsStripped}</div>
                  <div class="font-label" style="font-size:0.625rem;color:var(--outline);text-transform:uppercase">Segredos Limpos</div>
                </div>
                <div style="text-align:center;padding:0.5rem">
                  <div class="font-headline" style="font-size:1.5rem;font-weight:800;color:var(--secondary)">${stats.categories}</div>
                  <div class="font-label" style="font-size:0.625rem;color:var(--outline);text-transform:uppercase">Categorias</div>
                </div>
              </div>`;
            success.style.display = 'block';
          } else {
            document.getElementById('export-error-msg').textContent = result.error || 'Erro desconhecido.';
            errorEl.style.display = 'block';
          }
        } catch (err) {
          loading.style.display = 'none';
          document.getElementById('export-error-msg').textContent = 'Falha na conexão com o servidor: ' + err.message;
          errorEl.style.display = 'block';
        }
      });
    }

    // Player mode btn
    const playerBtn = document.getElementById('player-mode-btn');
    if (playerBtn) {
      playerBtn.addEventListener('click', () => {
        if (WikiAuth.isMasterMode()) WikiAuth.logout();
      });
    }

    // Delegação de eventos no conteúdo
    document.getElementById('app-content').addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) {
        // Wiki links
        const wikiLink = e.target.closest('.wiki-link');
        if (wikiLink) { e.preventDefault(); const href = wikiLink.getAttribute('href'); if (href) window.location.hash = href; }
        return;
      }

      const act = action.dataset.action;
      const id = action.dataset.id;

      switch (act) {
        case 'new-topic': {
          WikiEditor.openTopicModal({ category: action.dataset.category, onSave: () => route() });
          break;
        }
        case 'new-subtopic': {
          WikiEditor.openTopicModal({ parentId: action.dataset.parent, category: action.dataset.category, onSave: () => route() });
          break;
        }
        case 'edit-topic': {
          e.stopPropagation();
          WikiEditor.openTopicModal({ topicId: id, onSave: () => route() });
          break;
        }
        case 'delete-topic': {
          e.stopPropagation();
          const topic = WikiStore.getTopicById(id);
          if (!topic) break;
          openDeleteModal(topic.title, async () => {
            await WikiStore.deleteTopic(id);
            route();
          });
          break;
        }
        case 'toggle-visibility': {
          e.stopPropagation();
          await WikiStore.toggleVisibility(id);
          updateToolbar();
          route();
          break;
        }
        case 'create-category': {
          openCategoryModal();
          break;
        }
        case 'edit-category': {
          e.stopPropagation();
          const cat = WikiStore.getCategories().find(c => c.id === id);
          if (cat) openCategoryModal(cat);
          break;
        }
        case 'delete-category': {
          e.stopPropagation();
          const catDel = WikiStore.getCategories().find(c => c.id === id);
          if (!catDel) break;
          openDeleteModal(catDel.label, async () => {
            await WikiStore.deleteCategory(id);
            buildSidebar();
            route();
          });
          break;
        }
      }
    });

    // Config modal
    const configBtn = document.getElementById('config-btn');
    if (configBtn) {
      configBtn.addEventListener('click', () => {
        if (!WikiAuth.isMasterMode()) return;
        openConfigModal();
      });
    }

    // Upload retrato e fundo
    document.addEventListener('click', (e) => {
      if (e.target.closest('#upload-portrait-btn')) WikiEditor.uploadPortrait();
      if (e.target.closest('#upload-bg-btn')) WikiEditor.uploadBg();
    });
  }

  // ===== DELETE MODAL =====
  function openDeleteModal(itemName, onConfirm) {
    const backdrop = document.getElementById('delete-modal-backdrop');
    const nameEl = document.getElementById('delete-item-name');
    nameEl.textContent = itemName;
    backdrop.classList.add('open');

    const confirmBtn = document.getElementById('delete-confirm-btn');
    const handler = async () => {
      await onConfirm();
      backdrop.classList.remove('open');
      confirmBtn.removeEventListener('click', handler);
    };
    confirmBtn.addEventListener('click', handler);
  }

  // ===== CATEGORY MODAL =====
  function openCategoryModal(existing) {
    const isEdit = !!existing;
    let backdrop = document.getElementById('category-modal-backdrop');
    if (!backdrop) {
      // Criar modal dinâmico
      const div = document.createElement('div');
      div.id = 'category-modal-backdrop';
      div.className = 'modal-backdrop';
      div.innerHTML = `
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <h2 id="cat-modal-title">Nova Categoria</h2>
            <button class="modal-close" data-dismiss><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="cat-name-input" placeholder="Nome da categoria...">
          </div>
          <div class="form-group">
            <label class="form-label">Ícone</label>
            <div id="cat-icon-picker"></div>
            <input type="hidden" id="cat-icon-value" value="folder">
          </div>
          <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem">
            <button class="btn btn-ghost" data-dismiss>Cancelar</button>
            <button class="btn btn-primary" id="cat-save-btn">Salvar</button>
          </div>
        </div>`;
      document.body.appendChild(div);

      div.querySelectorAll('[data-dismiss]').forEach(btn => {
        btn.addEventListener('click', () => div.classList.remove('open'));
      });
      div.addEventListener('click', (e) => { if (e.target === div) div.classList.remove('open'); });

      div.querySelector('#cat-icon-picker').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-icon]');
        if (!btn) return;
        div.querySelectorAll('#cat-icon-picker button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        div.querySelector('#cat-icon-value').value = btn.dataset.icon;
      });

      div.querySelector('#cat-save-btn').addEventListener('click', async () => {
        const name = div.querySelector('#cat-name-input').value.trim();
        const icon = div.querySelector('#cat-icon-value').value;
        if (!name) return;
        const currentEditId = div.dataset.editId;
        if (currentEditId) {
          await WikiStore.updateCategory(currentEditId, { label: name, icon });
        } else {
          await WikiStore.createCategory({ label: name, icon });
        }
        div.classList.remove('open');
        buildSidebar();
        route();
      });
      backdrop = div;
    }

    backdrop.querySelector('#cat-modal-title').textContent = isEdit ? 'Editar Categoria' : 'Nova Categoria';
    backdrop.querySelector('#cat-name-input').value = isEdit ? existing.label : '';
    backdrop.querySelector('#cat-icon-picker').innerHTML = WikiEditor.getIconPickerHTML(isEdit ? existing.icon : 'folder');
    backdrop.querySelector('#cat-icon-value').value = isEdit ? existing.icon : 'folder';
    if (isEdit) {
      backdrop.dataset.editId = existing.id;
    } else {
      delete backdrop.dataset.editId;
    }

    setTimeout(() => backdrop.classList.add('open'), 10);
  }

  // ===== CONFIG MODAL =====
  function openConfigModal() {
    const cfg = WikiStore.getConfig();
    const d = cfg.design || {};
    const c = d.colors || {};
    const f = d.fonts || {};
    const hp = d.homepage || {};

    const backdrop = document.getElementById('config-modal-backdrop');
    if (!backdrop) return;

    // Preencher campos
    document.getElementById('cfg-site-name').value = cfg.siteName || '';
    document.getElementById('cfg-site-subtitle').value = cfg.siteSubtitle || '';
    document.getElementById('cfg-site-description').value = cfg.siteDescription || '';
    document.getElementById('cfg-org-name').value = cfg.organizationName || '';
    document.getElementById('cfg-org-full').value = cfg.organizationFull || '';
    document.getElementById('cfg-hero-image').value = cfg.heroImage || '';
    document.getElementById('cfg-map-image').value = cfg.mapImage || '';
    document.getElementById('cfg-profile-image').value = cfg.profileImage || '';

    // Cores
    document.getElementById('cfg-color-primary').value = c.primary || '#00629d';
    document.getElementById('cfg-color-primary-container').value = c.primaryContainer || '#00a3ff';
    document.getElementById('cfg-color-secondary').value = c.secondary || '#446278';
    document.getElementById('cfg-color-tertiary').value = c.tertiary || '#854d63';
    document.getElementById('cfg-color-error').value = c.error || '#ba1a1a';
    document.getElementById('cfg-color-surface').value = c.surface || '#f6fafe';
    document.getElementById('cfg-color-on-surface').value = c.onSurface || '#171c1f';

    // Fontes
    document.getElementById('cfg-font-headline').value = f.headline || 'Space Grotesk';
    document.getElementById('cfg-font-body').value = f.body || 'Inter';

    // Homepage
    document.getElementById('cfg-hp-hero').checked = hp.showHero !== false;
    document.getElementById('cfg-hp-char').checked = hp.showCharacterOfDay !== false;
    document.getElementById('cfg-hp-domains').checked = hp.showStrategicDomains !== false;
    document.getElementById('cfg-hp-updates').checked = hp.showLatestUpdates !== false;
    document.getElementById('cfg-hp-lore').checked = hp.showLoreSpotlight !== false;

    backdrop.classList.add('open');
  }

  // Config Save
  const cfgSaveBtn = document.getElementById('cfg-save-btn');
  if (cfgSaveBtn) {
    cfgSaveBtn.addEventListener('click', async () => {
      const updates = {
        siteName: document.getElementById('cfg-site-name').value,
        siteSubtitle: document.getElementById('cfg-site-subtitle').value,
        siteDescription: document.getElementById('cfg-site-description').value,
        organizationName: document.getElementById('cfg-org-name').value,
        organizationFull: document.getElementById('cfg-org-full').value,
        heroImage: document.getElementById('cfg-hero-image').value,
        mapImage: document.getElementById('cfg-map-image').value,
        profileImage: document.getElementById('cfg-profile-image').value,
        design: {
          colors: {
            primary: document.getElementById('cfg-color-primary').value,
            primaryContainer: document.getElementById('cfg-color-primary-container').value,
            secondary: document.getElementById('cfg-color-secondary').value,
            tertiary: document.getElementById('cfg-color-tertiary').value,
            error: document.getElementById('cfg-color-error').value,
            surface: document.getElementById('cfg-color-surface').value,
            onSurface: document.getElementById('cfg-color-on-surface').value,
            onPrimary: config.design?.colors?.onPrimary || '#ffffff',
            secondaryContainer: config.design?.colors?.secondaryContainer || '#c4e4fe',
            tertiaryContainer: config.design?.colors?.tertiaryContainer || '#cb8aa2',
            onSurfaceVariant: config.design?.colors?.onSurfaceVariant || '#3f4852',
            outline: config.design?.colors?.outline || '#6f7883',
            headerBg: config.design?.colors?.headerBg || 'rgba(255, 255, 255, 0.7)',
            sidebarBg: config.design?.colors?.sidebarBg || 'rgba(248, 250, 252, 0.5)',
            surfaceContainer: config.design?.colors?.surfaceContainer || '#eaeef2',
            surfaceContainerLow: config.design?.colors?.surfaceContainerLow || '#f0f4f8',
            background: document.getElementById('cfg-color-surface').value
          },
          fonts: {
            headline: document.getElementById('cfg-font-headline').value,
            body: document.getElementById('cfg-font-body').value,
            label: config.design?.fonts?.label || 'Plus Jakarta Sans'
          },
          layout: config.design?.layout || {},
          effects: config.design?.effects || {},
          homepage: {
            showHero: document.getElementById('cfg-hp-hero').checked,
            showCharacterOfDay: document.getElementById('cfg-hp-char').checked,
            showStrategicDomains: document.getElementById('cfg-hp-domains').checked,
            showLatestUpdates: document.getElementById('cfg-hp-updates').checked,
            showLoreSpotlight: document.getElementById('cfg-hp-lore').checked,
            heroTextColor: config.design?.homepage?.heroTextColor || '#171c1f',
            heroOverlay: config.design?.homepage?.heroOverlay || 'rgba(255, 255, 255, 0.8)'
          }
        },
        labels: config.labels || {}
      };

      const saved = await WikiStore.saveConfig(updates);
      if (saved) {
        Object.assign(config, saved);
        WikiRenderer.setConfig(saved);
        applyDesignTokens(saved);
        document.getElementById('config-modal-backdrop').classList.remove('open');
        route();
      }
    });
  }

  // ===== HOME SECTIONS: DRAG & DROP + RESIZE =====
  function initHomeSections() {
    const contentEl = document.getElementById('app-content');
    if (!contentEl) return;
    const wrappers = contentEl.querySelectorAll('.home-section-wrapper');
    if (wrappers.length === 0) return;

    let draggedEl = null;

    wrappers.forEach(wrapper => {
      const handle = wrapper.querySelector('.drag-handle');
      if (!handle) return;

      // --- DRAG & DROP ---
      handle.addEventListener('mousedown', () => {
        wrapper.setAttribute('draggable', 'true');
      });
      handle.addEventListener('mouseup', () => {
        wrapper.setAttribute('draggable', 'false');
      });

      wrapper.addEventListener('dragstart', (e) => {
        draggedEl = wrapper;
        wrapper.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', wrapper.dataset.sectionId);
      });

      wrapper.addEventListener('dragend', () => {
        wrapper.classList.remove('dragging');
        wrapper.setAttribute('draggable', 'false');
        draggedEl = null;
        // Remove all drag-over classes
        contentEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });

      wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (wrapper !== draggedEl) {
          wrapper.classList.add('drag-over');
        }
      });

      wrapper.addEventListener('dragleave', () => {
        wrapper.classList.remove('drag-over');
      });

      wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        wrapper.classList.remove('drag-over');
        if (!draggedEl || draggedEl === wrapper) return;

        // Reorder DOM
        const allWrappers = [...contentEl.querySelectorAll('.home-section-wrapper')];
        const draggedIdx = allWrappers.indexOf(draggedEl);
        const targetIdx = allWrappers.indexOf(wrapper);

        if (draggedIdx < targetIdx) {
          wrapper.parentNode.insertBefore(draggedEl, wrapper.nextSibling);
        } else {
          wrapper.parentNode.insertBefore(draggedEl, wrapper);
        }

        // Save new order
        saveSectionOrder();
      });

      // --- RESIZE (3 independent handles) ---
      function attachResize(handleEl, mode) {
        if (!handleEl) return;

        // Double-click to reset dimension
        handleEl.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (mode === 'width' || mode === 'both') {
            wrapper.style.width = '';
          }
          if (mode === 'height' || mode === 'both') {
            wrapper.style.height = '';
          }
          if (!wrapper.style.width && !wrapper.style.height) {
            wrapper.classList.remove('custom-size');
          }
          saveSectionDimensions();
        });

        handleEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = wrapper.offsetWidth;
          const startHeight = wrapper.offsetHeight;
          wrapper.classList.add('resizing', 'custom-size');

          function onMouseMove(e2) {
            if (mode === 'width' || mode === 'both') {
              const maxWidth = wrapper.parentElement ? wrapper.parentElement.clientWidth : window.innerWidth - 100;
              const newWidth = Math.min(maxWidth, Math.max(60, startWidth + (e2.clientX - startX)));
              wrapper.style.width = newWidth + 'px';
            }
            if (mode === 'height' || mode === 'both') {
              const newHeight = Math.max(40, startHeight + (e2.clientY - startY));
              wrapper.style.height = newHeight + 'px';
            }
          }

          function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            wrapper.classList.remove('resizing');
            saveSectionDimensions();
          }

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      }

      attachResize(wrapper.querySelector('.resize-handle-right'), 'width');
      attachResize(wrapper.querySelector('.resize-handle-bottom'), 'height');
      attachResize(wrapper.querySelector('.resize-handle-corner'), 'both');
    });

    // Save section order to config
    async function saveSectionOrder() {
      const ordered = [...contentEl.querySelectorAll('.home-section-wrapper')]
        .map(el => el.dataset.sectionId)
        .filter(Boolean);

      const cfg = WikiStore.getConfig();
      const design = cfg.design || {};
      const homepage = design.homepage || {};
      homepage.sectionOrder = ordered;
      design.homepage = homepage;

      await WikiStore.saveConfig({ ...cfg, design });
      Object.assign(config, WikiStore.getConfig());
      WikiRenderer.setConfig(config);
    }

    // Save section dimensions (width + height) to config
    async function saveSectionDimensions() {
      const dimensions = {};
      contentEl.querySelectorAll('.home-section-wrapper').forEach(el => {
        const d = {};
        if (el.style.width) d.width = parseInt(el.style.width);
        if (el.style.height) d.height = parseInt(el.style.height);
        if (d.width || d.height) {
          dimensions[el.dataset.sectionId] = d;
        }
      });

      const cfg = WikiStore.getConfig();
      const design = cfg.design || {};
      const homepage = design.homepage || {};
      homepage.sectionDimensions = dimensions;
      design.homepage = homepage;

      await WikiStore.saveConfig({ ...cfg, design });
      Object.assign(config, WikiStore.getConfig());
      WikiRenderer.setConfig(config);
    }
  }

  // Inicializar
  updateToolbar();
  WikiAnimations.init();

  // ===== TOAST NOTIFICATION SYSTEM =====
  window.showToast = function (message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined">${icons[type] || 'info'}</span>${message}`;
    toast.addEventListener('click', () => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    });
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  };

  // ===== DARK MODE TOGGLE =====
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('wiki-dark-mode', isDark);
      const icon = themeToggle.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
      showToast(isDark ? 'Modo escuro ativado' : 'Modo claro ativado', 'info', 2000);
    });
  }

  // ===== GALLERY LIGHTBOX =====
  function setupGalleryLightbox() {
    const content = document.getElementById('app-content');
    if (!content) return;
    // Extract images from topic content
    const topicContent = content.querySelector('.topic-content');
    if (topicContent) {
      const images = WikiRenderer.extractImages(topicContent.innerHTML);
      if (images.length > 1) {
        const galleryHTML = WikiRenderer.renderGallery(images);
        if (galleryHTML) topicContent.insertAdjacentHTML('afterend', galleryHTML);
      }
    }
    // Lightbox click handlers
    content.addEventListener('click', (e) => {
      const thumb = e.target.closest('.gallery-thumb');
      if (thumb) {
        const imgs = content.querySelectorAll('.gallery-thumb img');
        const srcs = [...imgs].map(img => img.src);
        const idx = parseInt(thumb.dataset.galleryIdx) || 0;
        openLightbox(srcs, idx);
      }
    });
  }

  function openLightbox(images, startIdx) {
    let current = startIdx;
    const backdrop = document.createElement('div');
    backdrop.className = 'lightbox-backdrop';
    backdrop.innerHTML = `
      <button class="lightbox-close"><span class="material-symbols-outlined">close</span></button>
      ${images.length > 1 ? '<button class="lightbox-nav prev"><span class="material-symbols-outlined">chevron_left</span></button>' : ''}
      <img src="${images[current]}" alt="Lightbox">
      ${images.length > 1 ? '<button class="lightbox-nav next"><span class="material-symbols-outlined">chevron_right</span></button>' : ''}
      ${images.length > 1 ? `<div class="lightbox-counter">${current + 1} / ${images.length}</div>` : ''}
    `;
    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add('open'), 10);

    const updateImage = () => {
      backdrop.querySelector('img').src = images[current];
      const counter = backdrop.querySelector('.lightbox-counter');
      if (counter) counter.textContent = `${current + 1} / ${images.length}`;
    };

    backdrop.querySelector('.lightbox-close').addEventListener('click', () => {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 300);
    });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) { backdrop.classList.remove('open'); setTimeout(() => backdrop.remove(), 300); } });
    const prev = backdrop.querySelector('.lightbox-nav.prev');
    const next = backdrop.querySelector('.lightbox-nav.next');
    if (prev) prev.addEventListener('click', () => { current = (current - 1 + images.length) % images.length; updateImage(); });
    if (next) next.addEventListener('click', () => { current = (current + 1) % images.length; updateImage(); });

    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { backdrop.classList.remove('open'); setTimeout(() => backdrop.remove(), 300); document.removeEventListener('keydown', handler); }
      if (e.key === 'ArrowLeft' && prev) { current = (current - 1 + images.length) % images.length; updateImage(); }
      if (e.key === 'ArrowRight' && next) { current = (current + 1) % images.length; updateImage(); }
    });
  }

  // ===== BACKUP / RESTORE =====
  const backupBtn = document.getElementById('btn-backup');
  if (backupBtn) {
    backupBtn.addEventListener('click', async () => {
      showToast('Gerando backup...', 'info', 2000);
      const ok = await WikiStore.downloadBackup();
      if (ok) showToast('Backup baixado com sucesso!', 'success');
      else showToast('Falha ao gerar backup', 'error');
    });
  }

  const restoreInput = document.getElementById('restore-file-input');
  if (restoreInput) {
    restoreInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.topics || !data.categories) throw new Error('Invalid');
        const result = await WikiStore.restoreBackup(data);
        if (result) {
          showToast(`Restaurado! ${result.topics} tópicos, ${result.categories} categorias`, 'success');
          Object.assign(config, WikiStore.getConfig());
          WikiRenderer.setConfig(config);
          applyDesignTokens(config);
          buildSidebar();
          route();
        } else {
          showToast('Falha na restauração', 'error');
        }
      } catch {
        showToast('Arquivo de backup inválido', 'error');
      }
      restoreInput.value = '';
    });
  }

  // ===== UNDO (Ctrl+Z) =====
  document.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && WikiAuth.isMasterMode()) {
      e.preventDefault();
      const result = await WikiStore.undo();
      if (result) {
        showToast(`Desfeito: ${result.action}`, 'info');
        Object.assign(config, WikiStore.getConfig());
        WikiRenderer.setConfig(config);
        applyDesignTokens(config);
        buildSidebar();
        route();
      } else {
        showToast('Nada para desfazer', 'warning', 2000);
      }
    }
  });

  // ===== PIN TOGGLE (in event delegation) =====
  document.getElementById('app-content')?.addEventListener('click', async (e) => {
    const pinBtn = e.target.closest('[data-action="toggle-pin"]');
    if (pinBtn && WikiAuth.isMasterMode()) {
      const id = pinBtn.dataset.id;
      const topic = WikiStore.getTopicById(id);
      if (topic) {
        await WikiStore.saveUndoSnapshot('pin-toggle');
        topic.pinned = !topic.pinned;
        await WikiStore.updateTopic(id, { pinned: topic.pinned });
        showToast(topic.pinned ? 'Tópico fixado!' : 'Tópico desafixado', 'success', 2000);
        route();
      }
    }
  });

  // ===== PWA SERVICE WORKER =====
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

})();
