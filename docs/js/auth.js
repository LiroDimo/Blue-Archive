/* =====================================================
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
