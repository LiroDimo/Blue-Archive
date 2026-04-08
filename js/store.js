/* =====================================================
   STORE.JS — Wiki Data Store
   ===================================================== */

window.WikiStore = (function () {
  let cachedTopics = [];
  let cachedCategories = [];
  let cachedConfig = {};

  async function fetchTopics() {
    try {
      const resp = await fetch('/api/topics', { headers: WikiAuth.getHeaders() });
      if (resp.ok) cachedTopics = await resp.json();
    } catch (err) { console.error('Erro ao baixar tópicos:', err); }
    return cachedTopics;
  }

  async function fetchCategories() {
    try {
      const resp = await fetch('/api/categories', { headers: WikiAuth.getHeaders() });
      if (resp.ok) cachedCategories = await resp.json();
    } catch (err) { console.error('Erro ao baixar categorias:', err); }
    return cachedCategories;
  }

  async function fetchConfig() {
    try {
      const resp = await fetch('/api/config');
      if (resp.ok) cachedConfig = await resp.json();
    } catch (err) { console.error('Erro ao baixar configurações:', err); }
    return cachedConfig;
  }

  async function saveConfig(updates) {
    try {
      const resp = await fetch('/api/config', { method: 'PUT', headers: WikiAuth.getHeaders(), body: JSON.stringify(updates) });
      if (resp.ok) { cachedConfig = await resp.json(); return cachedConfig; }
    } catch (err) { console.error('Erro ao salvar configurações:', err); }
    return null;
  }

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
    return cachedTopics.filter(t => {
      if (t.title.toLowerCase().includes(q)) return true;
      // Strip HTML tags before searching content to avoid matching tag names
      const textContent = (t.content || '').replace(/<[^>]*>/g, '').toLowerCase();
      return textContent.includes(q);
    });
  }

  async function createCategory(data) {
    try {
      const resp = await fetch('/api/categories', { method: 'POST', headers: WikiAuth.getHeaders(), body: JSON.stringify(data) });
      if (resp.ok) { const novo = await resp.json(); cachedCategories.push(novo); return novo; }
    } catch (e) { console.error(e); }
    return null;
  }

  async function updateCategory(id, updates) {
    try {
      const resp = await fetch(`/api/categories/${id}`, { method: 'PUT', headers: WikiAuth.getHeaders(), body: JSON.stringify(updates) });
      if (resp.ok) { const att = await resp.json(); const idx = cachedCategories.findIndex(c => c.id === id); if (idx > -1) cachedCategories[idx] = att; return att; }
    } catch (e) { console.error(e); }
    return null;
  }

  async function deleteCategory(id) {
    try {
      const resp = await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: WikiAuth.getHeaders() });
      if (resp.ok) { cachedCategories = cachedCategories.filter(c => c.id !== id); await fetchTopics(); }
    } catch (e) { console.error(e); }
  }

  async function createTopic(data) {
    try {
      const resp = await fetch('/api/topics', { method: 'POST', headers: WikiAuth.getHeaders(), body: JSON.stringify(data) });
      if (resp.ok) { const novo = await resp.json(); cachedTopics.push(novo); return novo; }
    } catch (e) { console.error(e); }
    return null;
  }

  async function updateTopic(id, updates) {
    try {
      const resp = await fetch(`/api/topics/${id}`, { method: 'PUT', headers: WikiAuth.getHeaders(), body: JSON.stringify(updates) });
      if (resp.ok) { const att = await resp.json(); const idx = cachedTopics.findIndex(t => t.id === id); if (idx > -1) cachedTopics[idx] = att; return att; }
    } catch (e) { console.error(e); }
    return null;
  }

  async function deleteTopic(id) {
    try {
      const resp = await fetch(`/api/topics/${id}`, { method: 'DELETE', headers: WikiAuth.getHeaders() });
      if (resp.ok) {
        // Coleta o tópico e todos os descendentes antes de filtrar (evita bug de ordem no array)
        const idsToDelete = [id];
        let i = 0;
        while (i < idsToDelete.length) {
          const parentId = idsToDelete[i];
          cachedTopics.forEach(t => {
            if (t.parentId === parentId && !idsToDelete.includes(t.id)) idsToDelete.push(t.id);
          });
          i++;
        }
        cachedTopics = cachedTopics.filter(t => !idsToDelete.includes(t.id));
      }
    } catch (e) { console.error(e); }
  }

  function isVisible(id) { const topic = getTopicById(id); return topic ? topic.visible !== false : false; }

  async function toggleVisibility(id) {
    const topic = getTopicById(id);
    if (!topic) return false;
    const novoStatus = topic.visible === false ? true : false;
    try {
      const resp = await fetch(`/api/topics/${id}/visibility`, { method: 'PUT', headers: WikiAuth.getHeaders(), body: JSON.stringify({ visible: novoStatus }) });
      if (resp.ok) topic.visible = novoStatus;
    } catch (e) { console.error(e); }
    return novoStatus;
  }

  function getHiddenCount() { return cachedTopics.filter(t => t.visible === false).length; }

  async function revealAll() {
    const hiddens = cachedTopics.filter(t => t.visible === false);
    await Promise.all(hiddens.map(h => toggleVisibility(h.id)));
  }

  function getConfig() { return cachedConfig; }
  function getLabel(key) { return cachedConfig.labels?.[key] || key; }

  // === TAGS ===
  function getAllTags() {
    const tagSet = new Set();
    cachedTopics.forEach(t => {
      if (t.tags && Array.isArray(t.tags)) t.tags.forEach(tag => tagSet.add(tag));
    });
    return [...tagSet].sort();
  }

  function getTopicsByTag(tag) {
    return cachedTopics.filter(t => t.tags && t.tags.includes(tag));
  }

  // === ADVANCED SEARCH ===
  function searchTopicsAdvanced(query, filters = {}) {
    let results = cachedTopics;
    // Text search
    if (query && query.length >= 2) {
      const q = query.toLowerCase();
      results = results.filter(t => {
        if (t.title.toLowerCase().includes(q)) return true;
        const textContent = (t.content || '').replace(/<[^>]*>/g, '').toLowerCase();
        return textContent.includes(q);
      });
    }
    // Category filter
    if (filters.category) {
      results = results.filter(t => t.category === filters.category);
    }
    // Type filter (character or normal)
    if (filters.type === 'character') {
      results = results.filter(t => t.isCharacter === true);
    } else if (filters.type === 'normal') {
      results = results.filter(t => !t.isCharacter);
    }
    // Status filter
    if (filters.status) {
      results = results.filter(t => t.metadata?.status === filters.status);
    }
    // Tag filter
    if (filters.tag) {
      results = results.filter(t => t.tags && t.tags.includes(filters.tag));
    }
    // Sort
    if (filters.sort === 'az') {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sort === 'za') {
      results.sort((a, b) => b.title.localeCompare(a.title));
    } else if (filters.sort === 'newest') {
      results.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    } else if (filters.sort === 'oldest') {
      results.sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));
    }
    return results;
  }

  // === PINNED TOPICS ===
  function getVisibleTopicsSorted(category) {
    let topics = getVisibleTopics(category);
    // Pinned first, then by order
    return topics.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }

  // === TIMELINE ===
  function getTimelineTopics() {
    return cachedTopics
      .filter(t => t.eventDate && t.visible !== false)
      .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
  }

  // === BACKUP / RESTORE ===
  async function downloadBackup() {
    try {
      const resp = await fetch('/api/backup', { headers: WikiAuth.getHeaders() });
      if (!resp.ok) throw new Error('Falha no backup');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wiki-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) { console.error(e); return false; }
  }

  async function restoreBackup(data) {
    try {
      const resp = await fetch('/api/restore', {
        method: 'POST', headers: WikiAuth.getHeaders(),
        body: JSON.stringify(data)
      });
      if (!resp.ok) throw new Error('Falha na restauração');
      const result = await resp.json();
      // Reload cache
      await fetchTopics();
      await fetchCategories();
      await fetchConfig();
      return result;
    } catch (e) { console.error(e); return null; }
  }

  // === UNDO ===
  async function saveUndoSnapshot(action) {
    try {
      await fetch('/api/undo/snapshot', {
        method: 'POST', headers: WikiAuth.getHeaders(),
        body: JSON.stringify({ action })
      });
    } catch (e) { console.error(e); }
  }

  async function undo() {
    try {
      const resp = await fetch('/api/undo', {
        method: 'POST', headers: WikiAuth.getHeaders()
      });
      if (!resp.ok) return null;
      const result = await resp.json();
      await fetchTopics();
      await fetchCategories();
      await fetchConfig();
      return result;
    } catch (e) { console.error(e); return null; }
  }

  async function getUndoStatus() {
    try {
      const resp = await fetch('/api/undo/status', { headers: WikiAuth.getHeaders() });
      return await resp.json();
    } catch { return { canUndo: false, stackSize: 0 }; }
  }

  return {
    fetchTopics, fetchCategories, fetchConfig, saveConfig, getConfig, getLabel,
    getCategories, createCategory, updateCategory, deleteCategory,
    getAllTopics, getTopicById, getTopicsByCategory, getSubtopics,
    getVisibleTopics, getVisibleSubtopics, getVisibleTopicsSorted, searchTopics,
    searchTopicsAdvanced, getTopicsByTag, getAllTags, getTimelineTopics,
    createTopic, updateTopic, deleteTopic,
    isVisible, toggleVisibility, getHiddenCount, revealAll,
    downloadBackup, restoreBackup, saveUndoSnapshot, undo, getUndoStatus
  };
})();
