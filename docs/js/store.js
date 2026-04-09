/* =====================================================
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
    return cachedTopics.filter(t => {
      if (t.title.toLowerCase().includes(q)) return true;
      const textContent = (t.content || '').replace(/<[^>]*>/g, '').toLowerCase();
      return textContent.includes(q);
    });
  }

  function getVisibleTopicsSorted(category) {
    let topics = getVisibleTopics(category);
    return topics.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }

  function getTimelineTopics() {
    return cachedTopics
      .filter(t => t.eventDate && t.visible !== false)
      .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
  }

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

  function searchTopicsAdvanced(query, filters = {}) {
    let results = cachedTopics;
    if (query && query.length >= 2) {
      const q = query.toLowerCase();
      results = results.filter(t => {
        if (t.title.toLowerCase().includes(q)) return true;
        const textContent = (t.content || '').replace(/<[^>]*>/g, '').toLowerCase();
        return textContent.includes(q);
      });
    }
    if (filters.category) results = results.filter(t => t.category === filters.category);
    if (filters.type === 'character') results = results.filter(t => t.isCharacter === true);
    else if (filters.type === 'normal') results = results.filter(t => !t.isCharacter);
    if (filters.status) results = results.filter(t => t.metadata?.status === filters.status);
    if (filters.tag) results = results.filter(t => t.tags && t.tags.includes(filters.tag));
    if (filters.sort === 'az') results.sort((a, b) => a.title.localeCompare(b.title));
    else if (filters.sort === 'za') results.sort((a, b) => b.title.localeCompare(a.title));
    else if (filters.sort === 'newest') results.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    else if (filters.sort === 'oldest') results.sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));
    return results;
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
    getVisibleTopics, getVisibleSubtopics, getVisibleTopicsSorted, searchTopics,
    searchTopicsAdvanced, getTopicsByTag, getAllTags, getTimelineTopics,
    createTopic, updateTopic, deleteTopic,
    isVisible, toggleVisibility, getHiddenCount, revealAll
  };
})();
