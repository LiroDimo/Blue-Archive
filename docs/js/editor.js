/* =====================================================
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
