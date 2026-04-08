/* =====================================================
   AUTH.JS — Modo Mestre (toggle local, sem senha)
   O servidor roda apenas localmente, então não há
   necessidade de autenticação por senha ou JWT.
   ===================================================== */

window.WikiAuth = (function () {
  let _isMaster = false;
  let modeCallbacks = [];

  function init() {
    applyMode();
    return Promise.resolve();
  }

  function login() {
    _isMaster = true;
    applyMode();
    return Promise.resolve(true);
  }

  function logout() {
    _isMaster = false;
    applyMode();
  }

  function isAuthenticated() { return _isMaster; }
  function isMasterMode() { return _isMaster; }
  function getMode() { return _isMaster ? 'master' : 'player'; }
  function onModeChange(callback) { modeCallbacks.push(callback); }

  function applyMode() {
    const mode = getMode();
    document.body.classList.remove('master-mode', 'player-mode');
    document.body.classList.add(mode + '-mode');
    modeCallbacks.forEach(cb => cb(mode));
  }

  function getHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  return { init, login, logout, isAuthenticated, isMasterMode, getMode, onModeChange, getHeaders };
})();
