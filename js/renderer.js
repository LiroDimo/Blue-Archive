/* =====================================================
   RENDERER.JS — Renderizador Dinâmico (PT-BR)
   Com seções arrastáveis/redimensionáveis na home,
   grid de cards para todas as categorias,
   e detecção de personagem independente de categoria.
   ===================================================== */

window.WikiRenderer = (function () {
  let container = null;
  let configCache = {};

  function init(containerId) {
    container = document.getElementById(containerId);
    return container;
  }

  function setConfig(c) { configCache = c; }
  function label(key) { return (configCache.labels && configCache.labels[key]) || key; }

  // Helper: detect if topic is a character type
  function isCharacterType(topic) {
    return topic.isCharacter === true || topic.category === 'characters';
  }

  // Helper: extract plain text from HTML content
  function extractText(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').trim();
  }

  function characterStatusBadge(status) {
    if (!status) return '';
    const map = {
      vivo: { icon: 'favorite', cls: 'chip-status-vivo', label: 'Vivo' },
      morto: { icon: 'skull', cls: 'chip-status-morto', label: 'Morto' },
      desconhecido: { icon: 'help', cls: 'chip-status-desconhecido', label: 'Desconhecido' }
    };
    const s = map[status];
    if (!s) return '';
    return `<span class="chip ${s.cls}" style="display:inline-flex;align-items:center;gap:3px;font-size:0.6rem;padding:2px 7px">
      <span class="material-symbols-outlined" style="font-size:10px">${s.icon}</span>${s.label}
    </span>`;
  }

  function gmControls(topicId, opts = {}) {
    if (!WikiAuth.isMasterMode()) return '';
    const { canEdit = true, canDelete = true, canToggle = true } = opts;
    const topic = WikiStore.getTopicById(topicId);
    const isHidden = topic && topic.visible === false;
    let html = '<div class="gm-controls">';
    if (canToggle) html += `<button class="gm-btn" data-action="toggle-visibility" data-id="${topicId}" title="${isHidden ? 'Tornar Visível' : 'Ocultar'}"><span class="material-symbols-outlined">${isHidden ? 'visibility' : 'visibility_off'}</span></button>`;
    if (canEdit) html += `<button class="gm-btn" data-action="edit-topic" data-id="${topicId}" title="Editar"><span class="material-symbols-outlined">edit</span></button>`;
    if (canDelete) html += `<button class="gm-btn danger" data-action="delete-topic" data-id="${topicId}" title="Excluir"><span class="material-symbols-outlined">delete</span></button>`;
    html += '</div>';
    return html;
  }

  // ===== SECTION WRAPPER (for drag & drop + resize) =====
  function wrapSection(sectionId, sectionLabel, innerHTML) {
    const hp = configCache.design?.homepage || {};
    const dims = hp.sectionDimensions || {};
    const d = dims[sectionId] || {};
    let styles = '';
    let hasCustomSize = false;
    if (d.height) { styles += `height:${d.height}px;`; hasCustomSize = true; }
    if (d.width) { styles += `width:${d.width}px;`; hasCustomSize = true; }
    return `
    <div class="home-section-wrapper ${hasCustomSize ? 'custom-size' : ''}" data-section-id="${sectionId}" draggable="false" style="${styles}">
      <div class="drag-handle" title="Arrastar para mover">
        <span class="material-symbols-outlined" style="font-size:14px">drag_indicator</span>
        ${sectionLabel}
      </div>
      <div class="resize-handle-right" title="Redimensionar largura"></div>
      <div class="resize-handle-bottom" title="Redimensionar altura"></div>
      <div class="resize-handle-corner" title="Redimensionar"></div>
      ${innerHTML}
    </div>`;
  }

  // ===== HOME PAGE =====
  function renderHome() {
    const cfg = configCache;
    const design = cfg.design || {};
    const hp = design.homepage || {};
    const topics = WikiStore.getAllTopics();
    const categories = WikiStore.getCategories();

    // Define all available sections
    const sectionBuilders = {
      hero: () => buildHeroSection(cfg, hp, topics),
      charOfDay: () => buildCharOfDaySection(cfg, hp, topics),
      domains: () => buildDomainsSection(cfg, hp, topics, categories),
      updates: () => buildUpdatesSection(cfg, hp, topics),
      lore: () => buildLoreSection(cfg, hp, topics),
      map: () => buildMapSection(cfg)
    };

    // Get section order from config or use default
    const defaultOrder = ['hero', 'charOfDay', 'domains', 'updates', 'lore', 'map'];
    const sectionOrder = hp.sectionOrder || defaultOrder;

    // Build sections in order
    let html = '<div class="home-sections-container">';
    for (const sectionId of sectionOrder) {
      const builder = sectionBuilders[sectionId];
      if (builder) {
        const sectionHTML = builder();
        if (sectionHTML) html += sectionHTML;
      }
    }

    // Also add any sections that exist in builders but not in order (for safety)
    for (const sectionId of defaultOrder) {
      if (!sectionOrder.includes(sectionId)) {
        const builder = sectionBuilders[sectionId];
        if (builder) {
          const sectionHTML = builder();
          if (sectionHTML) html += sectionHTML;
        }
      }
    }
    html += '</div>';

    // Footer stats
    html += `
    <section class="reveal" style="margin-bottom:2rem">
      <div class="tech-line" style="margin-bottom:2rem"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;text-align:center">
        <div>
          <div class="font-headline" style="font-size:2rem;font-weight:800;color:var(--primary)">${topics.filter(t => t.visible !== false).length}</div>
          <p class="font-label" style="font-size:0.6875rem;color:var(--outline);text-transform:uppercase;letter-spacing:0.1em">Entradas no Arquivo</p>
        </div>
        <div>
          <div class="font-headline" style="font-size:2rem;font-weight:800;color:var(--primary)">${categories.length}</div>
          <p class="font-label" style="font-size:0.6875rem;color:var(--outline);text-transform:uppercase;letter-spacing:0.1em">Categorias</p>
        </div>
        <div>
          <div class="font-headline" style="font-size:2rem;font-weight:800;color:var(--primary)">${topics.filter(t => isCharacterType(t) && t.visible !== false).length}</div>
          <p class="font-label" style="font-size:0.6875rem;color:var(--outline);text-transform:uppercase;letter-spacing:0.1em">Personagens</p>
        </div>
      </div>
    </section>`;

    container.innerHTML = html;
    WikiAnimations.refresh();
    return container;
  }

  // --- Individual Section Builders ---

  function buildHeroSection(cfg, hp) {
    if (hp.showHero === false) return null;
    const heroImg = cfg.heroImage || '';
    const inner = `
    <section class="hero parallax-container reveal" data-gm-id="hero">
      ${heroImg ? `<img src="${heroImg}" alt="Hero" class="hero-image parallax-image">` : ''}
      <div class="hero-overlay" style="background: linear-gradient(to right, ${hp.heroOverlay || 'rgba(255,255,255,0.9)'}, ${hp.heroOverlay || 'rgba(255,255,255,0.8)'}, transparent);"></div>
      <div class="hero-content">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
          <span class="material-symbols-outlined" style="font-size:14px;color:var(--primary)">terminal</span>
          <span class="font-label" style="font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:var(--outline)">${cfg.organizationFull || 'ARQUIVO TÁTICO SCHALE'}</span>
        </div>
        <h1 class="font-headline" style="font-size:3.75rem;font-weight:800;line-height:1.1;margin-bottom:1rem;color:${hp.heroTextColor || 'var(--on-surface)'}">
          ${cfg.siteName || 'ARQUIVO TÁTICO'}
        </h1>
        <p style="font-size:1rem;color:var(--on-surface-variant);max-width:32rem;line-height:1.7;margin-bottom:2rem">
          ${cfg.siteDescription || 'Documentando operações táticas de campo.'}
        </p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
          <a href="${(() => { const firstCat = WikiStore.getCategories()[0]; return firstCat ? '#/category/' + firstCat.id : '#/'; })()}" class="btn btn-gradient" style="text-decoration:none">
            <span class="material-symbols-outlined" style="font-size:16px">menu_book</span>
            ${label('archiveDatabase') || 'Banco de Dados do Arquivo'}
          </a>
        </div>
      </div>
    </section>`;
    return wrapSection('hero', 'Hero', inner);
  }

  function buildCharOfDaySection(cfg, hp, topics) {
    if (hp.showCharacterOfDay === false) return null;
    const chars = topics.filter(t => isCharacterType(t) && t.visible !== false);
    if (chars.length === 0) return null;

    const dayIndex = Math.floor(Date.now() / 86400000) % chars.length;
    const charOfDay = chars[dayIndex];
    const meta = charOfDay.metadata || {};
    const portrait = meta.portraitUrl || cfg.profileImage || '';

    const inner = `
    <section class="reveal" style="margin-bottom:3rem" data-gm-id="char-of-day">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
        <span class="material-symbols-outlined" style="color:var(--primary)">person_pin</span>
        <h2 class="font-headline" style="font-size:1.5rem;font-weight:700">${label('characterOfTheDay') || 'Personagem do Dia'}</h2>
      </div>
      <div class="wiki-card clickable" onclick="window.location.hash='#/topic/${charOfDay.id}'" style="display:flex;gap:2rem;align-items:center;flex-wrap:wrap">
        ${portrait ? `<div style="width:140px;height:175px;border-radius:var(--radius-lg);overflow:hidden;flex-shrink:0;background:var(--surface-container-high)">
          <img src="${portrait}" alt="${WikiEditor.sanitize(charOfDay.title)}" style="width:100%;height:100%;object-fit:cover">
        </div>` : ''}
        <div style="flex:1;min-width:200px">
          <h3 class="font-headline" style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem">${WikiEditor.sanitize(charOfDay.title)}</h3>
          ${meta.role ? `<p style="color:var(--on-surface-variant);font-size:0.875rem;margin-bottom:0.25rem"><strong>Função:</strong> ${WikiEditor.sanitize(meta.role)}</p>` : ''}
          ${meta.school ? `<p style="color:var(--on-surface-variant);font-size:0.875rem;margin-bottom:0.75rem"><strong>Escola:</strong> ${WikiEditor.sanitize(meta.school)}</p>` : ''}
          <a href="#/topic/${charOfDay.id}" class="btn btn-sm btn-ghost" style="text-decoration:none">
            <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
            ${label('viewDossier') || 'Ver Dossiê'}
          </a>
        </div>
      </div>
    </section>`;
    return wrapSection('charOfDay', 'Personagem', inner);
  }

  function buildDomainsSection(cfg, hp, topics, categories) {
    if (hp.showStrategicDomains === false) return null;
    let catHTML = '';
    categories.forEach(cat => {
      const topicCount = topics.filter(t => t.category === cat.id && !t.parentId).length;
      catHTML += `
        <div class="wiki-card clickable" onclick="window.location.hash='#/category/${cat.id}'" style="position:relative;text-align:center;padding:1.5rem">
          ${WikiAuth.isMasterMode() ? `<div class="gm-controls">
            <button class="gm-btn" data-action="edit-category" data-id="${cat.id}" title="Editar"><span class="material-symbols-outlined">edit</span></button>
            <button class="gm-btn danger" data-action="delete-category" data-id="${cat.id}" title="Excluir"><span class="material-symbols-outlined">delete</span></button>
          </div>` : ''}
          <span class="material-symbols-outlined" style="font-size:2rem;color:var(--primary);margin-bottom:0.75rem;display:block">${cat.icon || 'folder'}</span>
          <h3 class="font-headline" style="font-size:0.9375rem;font-weight:700;margin-bottom:0.25rem">${WikiEditor.sanitize(cat.label)}</h3>
          <span class="font-label" style="font-size:0.6875rem;color:var(--outline)">${topicCount} entrada(s)</span>
        </div>`;
    });

    const inner = `
    <section class="reveal" style="margin-bottom:3rem" data-gm-id="strategic-domains">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <span class="material-symbols-outlined" style="color:var(--primary)">category</span>
          <h2 class="font-headline" style="font-size:1.5rem;font-weight:700">${label('strategicDomains') || 'Domínios Estratégicos'}</h2>
        </div>
        ${WikiAuth.isMasterMode() ? `<button class="btn btn-sm btn-ghost" data-action="create-category">
          <span class="material-symbols-outlined" style="font-size:14px">add</span> Nova Categoria
        </button>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem" class="reveal-stagger">
        ${catHTML}
      </div>
    </section>`;
    return wrapSection('domains', 'Categorias', inner);
  }

  function buildUpdatesSection(cfg, hp, topics) {
    if (hp.showLatestUpdates === false) return null;
    const recent = [...topics].filter(t => t.visible !== false && t.updatedAt)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    if (recent.length === 0) return null;

    let itemsHTML = '';
    recent.forEach(t => {
      const cat = WikiStore.getCategories().find(c => c.id === t.category);
      const dateStr = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      itemsHTML += `
        <div class="timeline-item" style="cursor:pointer" onclick="window.location.hash='#/topic/${t.id}'">
          <div class="timeline-bullet"></div>
          <div class="wiki-card" style="padding:1rem 1.5rem">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <span class="material-symbols-outlined" style="color:var(--primary);font-size:18px">${t.icon || 'description'}</span>
                <h4 class="font-headline" style="font-size:0.9375rem;font-weight:600">${WikiEditor.sanitize(t.title)}</h4>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem">
                ${cat ? `<span class="chip chip-primary">${cat.label}</span>` : ''}
                <span class="font-label" style="font-size:0.625rem;color:var(--outline)">${dateStr}</span>
              </div>
            </div>
          </div>
        </div>`;
    });

    const inner = `
    <section class="reveal" style="margin-bottom:3rem" data-gm-id="latest-updates">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
        <span class="material-symbols-outlined" style="color:var(--primary)">update</span>
        <h2 class="font-headline" style="font-size:1.5rem;font-weight:700">${label('latestUpdates') || 'Últimas Atualizações'}</h2>
      </div>
      <div class="timeline">${itemsHTML}</div>
    </section>`;
    return wrapSection('updates', 'Atualizações', inner);
  }

  function buildLoreSection(cfg, hp, topics) {
    if (hp.showLoreSpotlight === false) return null;
    // Usa a primeira categoria disponível que não seja 'characters', ou a configurada
    const loreCategory = hp.loreSpotlightCategory ||
      (WikiStore.getCategories().find(c => c.id !== 'characters')?.id) ||
      'lore';
    const loreSeed = topics.filter(t => t.category === loreCategory && t.visible !== false);
    if (loreSeed.length === 0) return null;
    const spotlight = loreSeed[Math.floor(Date.now() / 86400000) % loreSeed.length];

    const inner = `
    <section class="reveal" style="margin-bottom:3rem" data-gm-id="lore-spotlight">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
        <span class="material-symbols-outlined" style="color:var(--primary)">auto_stories</span>
        <h2 class="font-headline" style="font-size:1.5rem;font-weight:700">${label('loreSpotlight') || 'Destaque de Lore'}</h2>
      </div>
      <div class="wiki-card clickable" onclick="window.location.hash='#/topic/${spotlight.id}'" style="padding:2rem">
        <h3 class="font-headline" style="font-size:1.125rem;font-weight:700;margin-bottom:0.75rem">${WikiEditor.sanitize(spotlight.title)}</h3>
        <div style="font-size:0.875rem;color:var(--on-surface-variant);line-height:1.7;max-height:6rem;overflow:hidden">${spotlight.content ? extractText(spotlight.content).substring(0, 300) + '...' : ''}</div>
        <div style="margin-top:1rem">
          <span class="btn btn-sm btn-ghost">
            <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span> Ler Mais
          </span>
        </div>
      </div>
    </section>`;
    return wrapSection('lore', 'Lore', inner);
  }

  function buildMapSection(cfg) {
    if (!cfg.mapImage) return null;
    const inner = `
    <section class="reveal" style="margin-bottom:3rem" data-gm-id="live-map">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
        <span class="material-symbols-outlined" style="color:var(--primary)">map</span>
        <h2 class="font-headline" style="font-size:1.5rem;font-weight:700">${label('liveMapFeed') || 'Feed do Mapa ao Vivo'}</h2>
      </div>
      <div class="wiki-card" style="padding:0;overflow:hidden;border-radius:var(--radius-2xl)">
        <img src="${cfg.mapImage}" alt="Mapa Tático" style="width:100%;display:block;border-radius:var(--radius-2xl)">
      </div>
      <p style="font-size:0.75rem;color:var(--outline);margin-top:0.75rem;text-align:center">Zonas de conflito e setores seguros atualizados em tempo real pelo sistema SCHALE.</p>
    </section>`;
    return wrapSection('map', 'Mapa', inner);
  }

  // ===== CATEGORIA PAGE (CARD GRID) =====
  function renderCategory(categoryId) {
    const cat = WikiStore.getCategories().find(c => c.id === categoryId);
    if (!cat) return renderNotFound();
    const topics = WikiStore.getVisibleTopicsSorted ? WikiStore.getVisibleTopicsSorted(categoryId) : WikiStore.getTopicsByCategory(categoryId).filter(t => !t.parentId);

    let html = `
    <div class="reveal" style="margin-bottom:2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
        <div style="display:flex;align-items:center;gap:1rem">
          <span class="material-symbols-outlined" style="font-size:2rem;color:var(--primary)">${cat.icon || 'folder'}</span>
          <div>
            <h1 class="font-headline" style="font-size:2rem;font-weight:800">${WikiEditor.sanitize(cat.label)}</h1>
            <p class="font-label" style="font-size:0.75rem;color:var(--outline);text-transform:uppercase;letter-spacing:0.1em">${topics.length} entrada(s)</p>
          </div>
        </div>
        ${WikiAuth.isMasterMode() ? `<button class="btn btn-primary" data-action="new-topic" data-category="${categoryId}">
          <span class="material-symbols-outlined" style="font-size:16px">add</span> ${label('newEntry') || 'Nova Entrada'}
        </button>` : ''}
      </div>
    </div>`;

    // All categories use card grid now
    html += '<div class="topic-card-grid reveal-stagger">';
    topics.forEach(t => {
      const isChar = isCharacterType(t);
      const isHidden = t.visible === false;
      const subs = WikiStore.getSubtopics(t.id);
      const meta = t.metadata || {};
      const portrait = meta.portraitUrl || '';
      const excerpt = extractText(t.content).substring(0, 120);

      if (isChar && portrait) {
        // Character card with portrait
        html += `
        <div class="topic-card has-portrait ${isHidden ? 'gm-hidden' : ''}" data-gm-id="${t.id}" onclick="window.location.hash='#/topic/${t.id}'">
          ${t.pinned ? '<div class="pin-badge"><span class="material-symbols-outlined">push_pin</span></div>' : ''}
          ${gmControls(t.id)}
          <div class="topic-card-portrait">
            ${portrait ? `<img src="${portrait}" alt="${WikiEditor.sanitize(t.title)}" loading="lazy">` : ''}
          </div>
          <div class="topic-card-title">${WikiEditor.sanitize(t.title)}</div>
          ${characterStatusBadge(meta.status)}
          ${meta.role ? `<div class="topic-card-badge"><span class="material-symbols-outlined" style="font-size:10px">badge</span> ${WikiEditor.sanitize(meta.role)}</div>` : ''}
          ${t.tags && t.tags.length > 0 ? `<div class="tag-list">${t.tags.map(tag => `<span class="tag-chip" onclick="event.stopPropagation();window.location.hash='#/search/tag:${encodeURIComponent(tag)}'">${tag}</span>`).join('')}</div>` : ''}
          <div class="topic-card-footer">
            ${subs.length > 0 ? `<span>${subs.length} subtópico(s)</span>` : '<span></span>'}
            ${isChar ? '<span class="topic-card-badge"><span class="material-symbols-outlined" style="font-size:10px">person</span> Personagem</span>' : ''}
          </div>
        </div>`;
      } else {
        // Standard topic card
        html += `
        <div class="topic-card ${isHidden ? 'gm-hidden' : ''}" data-gm-id="${t.id}" onclick="window.location.hash='#/topic/${t.id}'">
          ${t.pinned ? '<div class="pin-badge"><span class="material-symbols-outlined">push_pin</span></div>' : ''}
          ${gmControls(t.id)}
          <div class="topic-card-icon">
            <span class="material-symbols-outlined">${t.icon || 'description'}</span>
          </div>
          <div class="topic-card-title">${WikiEditor.sanitize(t.title)}</div>
          ${excerpt ? `<div class="topic-card-excerpt">${WikiEditor.sanitize(excerpt)}${excerpt.length >= 120 ? '...' : ''}</div>` : ''}
          ${t.tags && t.tags.length > 0 ? `<div class="tag-list">${t.tags.map(tag => `<span class="tag-chip" onclick="event.stopPropagation();window.location.hash='#/search/tag:${encodeURIComponent(tag)}'">${tag}</span>`).join('')}</div>` : ''}
          <div class="topic-card-footer">
            ${subs.length > 0 ? `<span>${subs.length} subtópico(s)</span>` : '<span></span>'}
            ${isChar ? '<span class="topic-card-badge"><span class="material-symbols-outlined" style="font-size:10px">person</span> Personagem</span>' : ''}
          </div>
        </div>`;
      }
    });

    // Add card (GM only)
    if (WikiAuth.isMasterMode()) {
      html += `
      <div class="topic-card-add" onclick="document.querySelector('[data-action=new-topic]').click()">
        <div style="text-align:center;color:var(--outline)">
          <span class="material-symbols-outlined" style="font-size:2rem;display:block;margin-bottom:0.5rem">add_circle_outline</span>
          <span class="font-label" style="font-size:0.6875rem">${label('newEntry') || 'Nova Entrada'}</span>
        </div>
      </div>`;
    }
    html += '</div>';

    container.innerHTML = html;
    WikiAnimations.refresh();
  }

  // ===== TOPIC DETAIL PAGE =====
  function renderTopic(topicId) {
    const topic = WikiStore.getTopicById(topicId);
    if (!topic) return renderNotFound();
    const cat = WikiStore.getCategories().find(c => c.id === topic.category);
    const subtopics = WikiStore.getSubtopics(topicId);
    const isChar = isCharacterType(topic);
    const isHidden = topic.visible === false;

    let html = `
    <div class="reveal ${isHidden ? 'gm-hidden' : ''}" data-gm-id="${topic.id}">
      ${gmControls(topic.id)}
      <div style="margin-bottom:2rem">
        <!-- BREADCRUMBS -->
        <nav class="breadcrumb">
          <a href="#/"><span class="material-symbols-outlined" style="font-size:14px">home</span> ${label('dashboard') || 'Painel'}</a>
          <span class="sep">›</span>
          ${cat ? `<a href="#/category/${topic.category}"><span class="material-symbols-outlined" style="font-size:14px">${cat.icon || 'folder'}</span> ${WikiEditor.sanitize(cat.label)}</a><span class="sep">›</span>` : ''}
          ${topic.parentId ? (() => {
        const parent = WikiStore.getTopicById(topic.parentId);
        return parent ? `<a href="#/topic/${parent.id}">${WikiEditor.sanitize(parent.title)}</a><span class="sep">›</span>` : '';
      })() : ''}
          <span class="current">${WikiEditor.sanitize(topic.title)}</span>
        </nav>
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap">
          <a href="#/category/${topic.category}" style="text-decoration:none;display:flex;align-items:center;gap:0.5rem">
            <span class="chip chip-primary">${cat ? cat.label : topic.category}</span>
          </a>
          ${topic.parentId ? (() => {
        const parent = WikiStore.getTopicById(topic.parentId);
        return parent ? `<a href="#/topic/${parent.id}" style="text-decoration:none"><span class="chip chip-primary">${WikiEditor.sanitize(parent.title)}</span></a>` : '';
      })() : ''}
          ${isHidden ? '<span class="chip chip-danger"><span class="material-symbols-outlined" style="font-size:10px">visibility_off</span> Oculto</span>' : ''}
          ${isChar ? '<span class="chip chip-primary"><span class="material-symbols-outlined" style="font-size:10px">person</span> Personagem</span>' : ''}
        </div>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem">
          <span class="material-symbols-outlined" style="font-size:2rem;color:var(--primary)">${topic.icon || 'description'}</span>
          <h1 class="font-headline" style="font-size:2.25rem;font-weight:800">${WikiEditor.sanitize(topic.title)}</h1>
        </div>
        ${topic.updatedAt ? `<p class="font-label" style="font-size:0.6875rem;color:var(--outline)">Atualizado em ${new Date(topic.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>` : ''}
        ${topic.tags && topic.tags.length > 0 ? `<div class="tag-list" style="margin-top:0.5rem">${topic.tags.map(tag => `<span class="tag-chip" onclick="window.location.hash='#/search/tag:${encodeURIComponent(tag)}'">${tag}</span>`).join('')}</div>` : ''}
        ${topic.eventDate ? `<div class="font-label" style="font-size:0.6875rem;color:var(--primary);margin-top:0.25rem"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">event</span> ${WikiEditor.sanitize(topic.eventDate)}</div>` : ''}
      </div>`;

    if (isChar) {
      html += renderCharacterDetail(topic);
    } else {
      if (topic.imageUrl) {
        html += `<div style="margin-bottom:2rem;border-radius:var(--radius-xl);overflow:hidden;max-height:400px">
          <img src="${topic.imageUrl}" alt="${WikiEditor.sanitize(topic.title)}" style="width:100%;object-fit:cover;display:block">
        </div>`;
      }
      html += `<div class="topic-content">${topic.content || '<p style="color:var(--outline)">Sem conteúdo ainda.</p>'}</div>`;
    }

    // === SUBTÓPICOS ===
    if (subtopics.length > 0 || WikiAuth.isMasterMode()) {
      html += `
      <div class="subtopics-list" style="margin-top:3rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h2 class="font-headline" style="font-size:1.25rem;font-weight:700">Subtópicos</h2>
          ${WikiAuth.isMasterMode() ? `<button class="btn btn-sm btn-ghost" data-action="new-subtopic" data-parent="${topicId}" data-category="${topic.category}">
            <span class="material-symbols-outlined" style="font-size:14px">add</span> ${label('addSubtopic') || 'Adicionar Subtópico'}
          </button>` : ''}
        </div>`;

      subtopics.forEach(st => {
        const stIsHidden = st.visible === false;
        html += `
        <div class="subtopic-item ${stIsHidden ? 'gm-hidden' : ''}" data-gm-id="${st.id}" onclick="window.location.hash='#/topic/${st.id}'">
          ${gmControls(st.id)}
          <span class="material-symbols-outlined" style="color:var(--primary);font-size:18px">${st.icon || 'description'}</span>
          <div style="flex:1;min-width:0">
            <h4 class="font-headline" style="font-size:0.875rem;font-weight:600">${WikiEditor.sanitize(st.title)}</h4>
          </div>
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--outline)">chevron_right</span>
        </div>`;
      });
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
    WikiAnimations.refresh();
  }

  function renderCharacterDetail(topic) {
    const meta = topic.metadata || {};
    const portrait = meta.portraitUrl || '';
    const bgUrl = meta.bgUrl || '';
    const stats = meta.stats || {};

    let html = '';
    if (bgUrl) {
      html += `<div style="position:absolute; top:0; left:0; right:0; height:400px; z-index:-1; overflow:hidden;">
        <img src="${bgUrl}" style="width:100%; height:100%; object-fit:cover; opacity:0.3; mask-image: linear-gradient(to bottom, black 50%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);" alt="Background">
      </div>`;
    }

    html += `<div style="display:flex;gap:2rem;flex-wrap:wrap;margin-bottom:2rem; position:relative;">`;

    // Retrato
    if (portrait) {
      html += `<div style="width:250px;flex-shrink:0">
        <div style="border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-elevated)">
          <img src="${portrait}" alt="${WikiEditor.sanitize(topic.title)}" style="width:100%;display:block">
        </div>
      </div>`;
    }

    // Info
    html += `<div style="flex:1;min-width:250px">
      <h2 class="font-headline" style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem">${label('tacticalBio') || 'Bio Tática'}</h2>
      ${meta.status ? `<div style="margin-bottom:1rem">${characterStatusBadge(meta.status)}</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem">`;

    const fields = [
      { label: 'Função', val: meta.role },
      { label: 'Escola / Afiliação', val: meta.school || meta.affiliation },
      { label: 'Clube / Departamento', val: meta.club || meta.department },
      { label: 'Idade', val: meta.age },
      { label: 'Aniversário', val: meta.birthday },
      { label: 'Arma', val: meta.weapon }
    ];

    fields.forEach(f => {
      if (f.val) {
        html += `<div style="background:var(--surface-container-low);padding:0.75rem 1rem;border-radius:var(--radius-md)">
          <div class="font-label" style="font-size:0.625rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--outline);margin-bottom:0.25rem">${f.label}</div>
          <div style="font-weight:600;font-size:0.875rem">${WikiEditor.sanitize(f.val)}</div>
        </div>`;
      }
    });

    html += '</div>';

    // Estatísticas
    const statKeys = Object.keys(stats);
    if (statKeys.length > 0 && statKeys.some(k => parseInt(stats[k]) > 0)) {
      html += `<h3 class="font-headline" style="font-size:1rem;font-weight:700;margin-top:1.5rem;margin-bottom:1rem">${label('capabilityMatrix') || 'Matriz de Capacidade'}</h3>
      <div style="display:flex;flex-direction:column;gap:0.75rem">`;
      statKeys.forEach(k => {
        const val = parseInt(stats[k]) || 0;
        html += `<div>
          <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem">
            <span class="font-label" style="font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;color:var(--on-surface-variant)">${k}</span>
            <span class="font-label" style="font-size:0.6875rem;font-weight:700;color:var(--primary)">${val}%</span>
          </div>
          <div class="stat-bar-track"><div class="stat-bar-fill" data-width="${val}%"></div></div>
        </div>`;
      });
      html += '</div>';
    }

    html += '</div></div>';

    // Segredos Classificados
    if (meta.secrets && WikiAuth.isMasterMode()) {
      html += `<div class="secrets-section" style="margin-bottom:2rem">
        <h3 class="font-headline" style="font-size:1.125rem;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem">
          <span class="material-symbols-outlined" style="color:#f59e0b">lock</span>
          ${label('classifiedSecrets') || 'Segredos Classificados'}
        </h3>
        <p style="font-size:0.875rem;line-height:1.7;color:#cbd5e1">${WikiEditor.sanitize(meta.secrets)}</p>
      </div>`;
    }

    // Conteúdo
    html += `<div class="topic-content" style="margin-top:2rem">${topic.content || ''}</div>`;
    return html;
  }

  // ===== SEARCH RESULTS =====
  function renderSearch(query) {
    const results = WikiStore.searchTopics(query);
    let html = `
    <div class="reveal" style="margin-bottom:2rem">
      <h1 class="font-headline" style="font-size:2rem;font-weight:800;margin-bottom:0.5rem">Resultados da Busca</h1>
      <p style="color:var(--on-surface-variant)">${results.length} resultado(s) para "<strong>${WikiEditor.sanitize(query)}</strong>"</p>
    </div>`;

    if (results.length === 0) {
      html += '<div class="wiki-card" style="text-align:center;padding:3rem"><span class="material-symbols-outlined" style="font-size:3rem;color:var(--outline);display:block;margin-bottom:1rem">search_off</span><p style="color:var(--outline)">Nenhum resultado encontrado.</p></div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:0.75rem">';
      results.forEach(t => {
        const cat = WikiStore.getCategories().find(c => c.id === t.category);
        html += `
        <div class="search-result" onclick="window.location.hash='#/topic/${t.id}'">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
            <span class="material-symbols-outlined" style="color:var(--primary);font-size:18px">${t.icon || 'description'}</span>
            <h3 class="font-headline" style="font-size:0.9375rem;font-weight:600">${highlightMatch(t.title, query)}</h3>
            ${cat ? `<span class="chip chip-primary">${cat.label}</span>` : ''}
          </div>
          ${t.content ? `<p style="font-size:0.8125rem;color:var(--on-surface-variant);max-height:3rem;overflow:hidden">${extractSnippet(t.content, query)}</p>` : ''}
        </div>`;
      });
      html += '</div>';
    }

    container.innerHTML = html;
    WikiAnimations.refresh();
  }

  function renderNotFound() {
    container.innerHTML = `
    <div class="reveal" style="text-align:center;padding:4rem 2rem">
      <span class="material-symbols-outlined" style="font-size:4rem;color:var(--outline);display:block;margin-bottom:1rem">error_outline</span>
      <h1 class="font-headline" style="font-size:1.75rem;font-weight:800;margin-bottom:0.75rem">Entrada Não Encontrada</h1>
      <p style="color:var(--on-surface-variant);margin-bottom:2rem">Esta entrada do arquivo não existe ou foi classificada.</p>
      <a href="#/" class="btn btn-primary" style="text-decoration:none">
        <span class="material-symbols-outlined" style="font-size:16px">home</span>Voltar ao Painel
      </a>
    </div>`;
    WikiAnimations.refresh();
  }

  function highlightMatch(text, query) {
    if (!query) return WikiEditor.sanitize(text);
    const safe = WikiEditor.sanitize(text);
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function extractSnippet(htmlContent, query) {
    const text = extractText(htmlContent);
    if (!query) return WikiEditor.sanitize(text.substring(0, 200)) + '...';
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    const start = Math.max(0, idx - 60);
    const snippet = text.substring(start, start + 200);
    return highlightMatch(snippet, query) + '...';
  }

  // ===== ADVANCED SEARCH =====
  function renderSearchAdvanced(query, filters = {}) {
    const categories = WikiStore.getCategories();
    const allTags = WikiStore.getAllTags ? WikiStore.getAllTags() : [];
    const results = WikiStore.searchTopicsAdvanced ? WikiStore.searchTopicsAdvanced(query, filters) : WikiStore.searchTopics(query);

    let html = `
    <div class="reveal" style="margin-bottom:1rem">
      <h1 class="font-headline" style="font-size:2rem;font-weight:800;margin-bottom:0.5rem">Resultados da Busca</h1>
      <p style="color:var(--on-surface-variant)">${results.length} resultado(s)${query ? ` para "<strong>${WikiEditor.sanitize(query)}</strong>"` : ''}</p>
    </div>
    <div class="search-filters">
      <label>Categoria:</label>
      <select id="filter-category" onchange="WikiRenderer._applySearchFilters()">
        <option value="">Todas</option>
        ${categories.map(c => `<option value="${c.id}" ${filters.category === c.id ? 'selected' : ''}>${WikiEditor.sanitize(c.label)}</option>`).join('')}
      </select>
      <label>Tipo:</label>
      <select id="filter-type" onchange="WikiRenderer._applySearchFilters()">
        <option value="">Todos</option>
        <option value="character" ${filters.type === 'character' ? 'selected' : ''}>Personagem</option>
        <option value="normal" ${filters.type === 'normal' ? 'selected' : ''}>Normal</option>
      </select>
      <label>Ordenar:</label>
      <select id="filter-sort" onchange="WikiRenderer._applySearchFilters()">
        <option value="" ${!filters.sort ? 'selected' : ''}>Relevância</option>
        <option value="az" ${filters.sort === 'az' ? 'selected' : ''}>A-Z</option>
        <option value="za" ${filters.sort === 'za' ? 'selected' : ''}>Z-A</option>
        <option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>Mais Recente</option>
        <option value="oldest" ${filters.sort === 'oldest' ? 'selected' : ''}>Mais Antigo</option>
      </select>
      ${allTags.length > 0 ? `
        <label>Tag:</label>
        <select id="filter-tag" onchange="WikiRenderer._applySearchFilters()">
          <option value="">Todas</option>
          ${allTags.map(t => `<option value="${t}" ${filters.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>` : ''}
    </div>`;

    if (results.length === 0) {
      html += '<div class="wiki-card" style="text-align:center;padding:3rem"><span class="material-symbols-outlined" style="font-size:3rem;color:var(--outline);display:block;margin-bottom:1rem">search_off</span><p style="color:var(--outline)">Nenhum resultado encontrado.</p></div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:0.75rem">';
      results.forEach(t => {
        const cat = categories.find(c => c.id === t.category);
        html += `
        <div class="search-result" onclick="window.location.hash='#/topic/${t.id}'">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
            <span class="material-symbols-outlined" style="color:var(--primary);font-size:18px">${t.icon || 'description'}</span>
            <h3 class="font-headline" style="font-size:0.9375rem;font-weight:600">${highlightMatch(t.title, query)}</h3>
            ${cat ? `<span class="chip chip-primary">${cat.label}</span>` : ''}
            ${t.isCharacter ? '<span class="chip chip-primary"><span class="material-symbols-outlined" style="font-size:10px">person</span> Personagem</span>' : ''}
          </div>
          ${t.tags && t.tags.length > 0 ? `<div class="tag-list" style="margin-bottom:0.375rem">${t.tags.map(tag => `<span class="tag-chip">${tag}</span>`).join('')}</div>` : ''}
          ${t.content ? `<p style="font-size:0.8125rem;color:var(--on-surface-variant);max-height:3rem;overflow:hidden">${extractSnippet(t.content, query)}</p>` : ''}
        </div>`;
      });
      html += '</div>';
    }

    container.innerHTML = html;
    WikiAnimations.refresh();
  }

  // Store current search state for filters
  let _searchQuery = '';
  let _searchFilters = {};
  function _applySearchFilters() {
    const cat = document.getElementById('filter-category')?.value || '';
    const type = document.getElementById('filter-type')?.value || '';
    const sort = document.getElementById('filter-sort')?.value || '';
    const tag = document.getElementById('filter-tag')?.value || '';
    _searchFilters = {};
    if (cat) _searchFilters.category = cat;
    if (type) _searchFilters.type = type;
    if (sort) _searchFilters.sort = sort;
    if (tag) _searchFilters.tag = tag;
    renderSearchAdvanced(_searchQuery, _searchFilters);
  }
  function setSearchState(query, filters) { _searchQuery = query; _searchFilters = filters || {}; }

  // ===== TIMELINE PAGE =====
  function renderTimeline() {
    const topics = WikiStore.getTimelineTopics ? WikiStore.getTimelineTopics() : [];
    let html = `
    <div class="reveal" style="margin-bottom:2rem">
      <div style="display:flex;align-items:center;gap:1rem">
        <span class="material-symbols-outlined" style="font-size:2rem;color:var(--primary)">schedule</span>
        <div>
          <h1 class="font-headline" style="font-size:2rem;font-weight:800">Linha do Tempo</h1>
          <p class="font-label" style="font-size:0.75rem;color:var(--outline);text-transform:uppercase;letter-spacing:0.1em">${topics.length} evento(s)</p>
        </div>
      </div>
    </div>`;

    if (topics.length === 0) {
      html += '<div class="wiki-card" style="text-align:center;padding:3rem"><span class="material-symbols-outlined" style="font-size:3rem;color:var(--outline);display:block;margin-bottom:1rem">event_busy</span><p style="color:var(--outline)">Nenhum evento na timeline. Adicione uma "Data do Evento" aos tópicos para vê-los aqui.</p></div>';
    } else {
      html += '<div class="timeline-vertical">';
      topics.forEach((t, i) => {
        html += `
        <div class="timeline-event" onclick="window.location.hash='#/topic/${t.id}'" style="animation-delay:${i * 0.1}s">
          <div class="timeline-event-card">
        
            <div style="display:flex;align-items:center;gap:0.75rem">
              <span class="material-symbols-outlined" style="color:var(--primary);font-size:18px">${t.icon || 'event'}</span>
              <h3 class="font-headline" style="font-size:0.9375rem;font-weight:600">${WikiEditor.sanitize(t.title)}</h3>
            </div>
            ${t.content ? `<p style="font-size:0.8125rem;color:var(--on-surface-variant);margin-top:0.5rem;max-height:3rem;overflow:hidden">${extractText(t.content).substring(0, 150)}...</p>` : ''}
          </div>
        </div>`;
      });
      html += '</div>';
    }

    container.innerHTML = html;
    WikiAnimations.refresh();
  }

  // ===== RELATIONSHIP GRAPH =====

  // ===== GALLERY HELPER =====
  function extractImages(htmlContent) {
    if (!htmlContent) return [];
    const matches = htmlContent.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/g);
    return [...matches].map(m => m[1]);
  }

  function renderGallery(images) {
    if (!images || images.length === 0) return '';
    return `
    <div style="margin-top:2rem">
      <h3 class="font-headline" style="font-size:1rem;font-weight:700;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem">
        <span class="material-symbols-outlined" style="color:var(--primary)">photo_library</span> Galeria
      </h3>
      <div class="gallery-grid">
        ${images.map((src, i) => `<div class="gallery-thumb" data-gallery-idx="${i}"><img src="${src}" alt="Imagem ${i + 1}" loading="lazy"></div>`).join('')}
      </div>
    </div>`;
  }

  return {
    init, setConfig, renderHome, renderCategory, renderTopic,
    renderSearch, renderSearchAdvanced, setSearchState, _applySearchFilters,
    renderTimeline, renderGallery, extractImages,
    renderNotFound, label, isCharacterType
  };
})();
