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
