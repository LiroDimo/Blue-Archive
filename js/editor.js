/* =====================================================
   EDITOR.JS — Editor de Texto Rico Aprimorado
   Com tamanho de fonte, cor do texto, família de fonte
   + Fichas de Personagem + Ocultação de Textos
   ===================================================== */

window.WikiEditor = (function () {
  let currentEditId = null;
  let onSaveCallback = null;
  let savedRange = null;

  const ICONS = [
    'description','gavel','school','account_balance','bolt','precision_manufacturing',
    'masks','history_edu','event_note','menu_book','group','security','map',
    'inventory_2','star','shield','auto_stories','explore','public','science',
    'psychology','swords','castle','forest','water_drop','local_fire_department',
    'diamond','skull','pets','music_note','brush','camera_alt','biotech'
  ];

  const FONT_SIZES = [
    { label: '10px', value: '1' },
    { label: '13px', value: '2' },
    { label: '16px', value: '3' },
    { label: '18px', value: '4' },
    { label: '24px', value: '5' },
    { label: '32px', value: '6' },
    { label: '48px', value: '7' }
  ];

  const FONT_FAMILIES = [
    'Inter', 'Space Grotesk', 'Plus Jakarta Sans', 'Roboto', 'Arial',
    'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS',
    'Poppins', 'Montserrat', 'Open Sans', 'Lato', 'Raleway'
  ];

  function execCmd(cmd, value) {
    const editor = document.getElementById('editor-content');
    if (editor) editor.focus();
    if (savedRange && document.getElementById('editor-content') && document.getElementById('editor-content').contains(savedRange.commonAncestorContainer)) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    document.execCommand(cmd, false, value || null);
  }

  function handleToolbarClick(e) {
    const btn = e.target.closest('button[data-cmd]');
    if (!btn) return;
    const cmd = btn.dataset.cmd;

    switch (cmd) {
      case 'h2': execCmd('formatBlock', '<h2>'); break;
      case 'h3': execCmd('formatBlock', '<h3>'); break;
      case 'blockquote': execCmd('formatBlock', '<blockquote>'); break;
      case 'secret': {
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const parent = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
          const secretNode = parent.closest ? parent.closest('.secret-text') : null;
          if (secretNode) {
            const textNode = document.createTextNode(secretNode.textContent);
            secretNode.parentNode.replaceChild(textNode, secretNode);
          } else {
            const text = sel.toString();
            execCmd('insertHTML', `<span class="secret-text" title="Oculto dos Jogadores">${sanitize(text)}</span>`);
          }
        }
        break;
      }
      case 'wikilink': openWikiLinkPicker(); break;
      case 'insertImage': {
        const useFile = confirm('Deseja enviar uma imagem do seu dispositivo?\n(Cancele para inserir uma URL da web)');
        if (useFile) {
          const imgInput = document.getElementById('image-upload-input');
          if (imgInput) {
            imgInput.onchange = function(event) {
              const file = event.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                  const canvas = document.createElement('canvas');
                  const MAX = 800;
                  let w = img.width, h = img.height;
                  if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                  else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                  canvas.width = w; canvas.height = h;
                  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                  execCmd('insertImage', canvas.toDataURL('image/jpeg', 0.85));
                };
                img.src = e.target.result;
              };
              reader.readAsDataURL(file);
              event.target.value = '';
            };
            imgInput.click();
          }
        } else {
          const url = prompt('Cole a URL da imagem:');
          if (url) execCmd('insertImage', sanitize(url));
        }
        break;
      }
      default: execCmd(cmd);
    }
  }

  // Seletores de formatação avançada
  function handleFontSize(val) {
    if (val) execCmd('fontSize', val);
  }

  function handleFontFamily(e) {
    const val = e.target.value;
    if (val) execCmd('fontName', val);
  }

  function handleTextColor(e) {
    execCmd('foreColor', e.target.value);
  }

  function handleBgColor(e) {
    execCmd('backColor', e.target.value);
  }

  // Wiki Link Picker
  function openWikiLinkPicker() {
    closeWikiLinkPicker();
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
    const selectedText = sel.toString();

    const picker = document.createElement('div');
    picker.className = 'wiki-link-picker';
    picker.id = 'wiki-link-picker';
    picker.innerHTML = `
      <input type="text" placeholder="Pesquisar tópicos..." id="wiki-link-search" autocomplete="off">
      <div id="wiki-link-results"></div>
    `;

    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    const rect = range ? range.getBoundingClientRect() : null;
    if (rect && rect.bottom) {
      picker.style.position = 'fixed';
      picker.style.top = (rect.bottom + 8) + 'px';
      picker.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
    } else {
      picker.style.position = 'fixed';
      picker.style.top = '50%'; picker.style.left = '50%';
      picker.style.transform = 'translate(-50%, -50%)';
    }

    document.body.appendChild(picker);
    const searchInput = document.getElementById('wiki-link-search');
    const resultsDiv = document.getElementById('wiki-link-results');

    function renderResults(query) {
      const topics = WikiStore.getAllTopics();
      let filtered = topics;
      if (query && query.length > 0) {
        const q = query.toLowerCase();
        filtered = topics.filter(t => t.title.toLowerCase().includes(q));
      }
      const grouped = {};
      filtered.forEach(t => { if (!grouped[t.category]) grouped[t.category] = []; grouped[t.category].push(t); });
      let html = '';
      const cats = WikiStore.getCategories();
      Object.keys(grouped).forEach(cat => {
        const catObj = cats.find(c => c.id === cat);
        html += `<div class="picker-category">${catObj ? catObj.label : cat}</div>`;
        grouped[cat].slice(0, 10).forEach(t => {
          html += `<div class="picker-item" data-id="${t.id}" data-title="${sanitize(t.title)}">
            <span class="material-symbols-outlined">${t.icon || 'description'}</span>
            <span>${sanitize(t.title)}</span>
          </div>`;
        });
      });
      if (!html) html = '<div style="padding:1rem;color:var(--outline);font-size:0.8125rem">Nenhum tópico encontrado</div>';
      resultsDiv.innerHTML = html;
    }

    renderResults('');
    searchInput.focus();
    searchInput.addEventListener('input', () => renderResults(searchInput.value));
    resultsDiv.addEventListener('click', (e) => {
      const item = e.target.closest('.picker-item');
      if (!item) return;
      insertWikiLink(item.dataset.id, selectedText || item.dataset.title);
      closeWikiLinkPicker();
    });

    function onKeyDown(e) { if (e.key === 'Escape') { closeWikiLinkPicker(); document.removeEventListener('keydown', onKeyDown); } }
    document.addEventListener('keydown', onKeyDown);
    setTimeout(() => {
      function onClick(e) { if (!picker.contains(e.target)) { closeWikiLinkPicker(); document.removeEventListener('click', onClick); } }
      document.addEventListener('click', onClick);
    }, 100);
  }

  function closeWikiLinkPicker() { const el = document.getElementById('wiki-link-picker'); if (el) el.remove(); savedRange = null; }

  function insertWikiLink(topicId, text) {
    const editor = document.getElementById('editor-content');
    if (editor) editor.focus();
    if (savedRange) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
    document.execCommand('insertHTML', false, `<a href="#/topic/${topicId}" class="wiki-link" data-topic-id="${topicId}">${sanitize(text)}</a>`);
  }

  // Upload de Retrato
  function uploadPortrait() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          let w = img.width, h = img.height;
          if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          document.getElementById('meta-portrait-url').value = canvas.toDataURL('image/jpeg', 0.85);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function uploadBg() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          let w = img.width, h = img.height;
          if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          document.getElementById('meta-bg-url').value = canvas.toDataURL('image/jpeg', 0.85);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // Atalhos de teclado
  function handleKeyboard(e) {
    if (!document.getElementById('editor-content')) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); execCmd('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); execCmd('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); execCmd('underline'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openWikiLinkPicker(); }
  }

  function getIconPickerHTML(selected) {
    let html = '<div class="icon-picker">';
    ICONS.forEach(icon => {
      html += `<button type="button" data-icon="${icon}" class="${icon === selected ? 'selected' : ''}" title="${icon}">
        <span class="material-symbols-outlined" style="font-size:18px;">${icon}</span>
      </button>`;
    });
    html += '</div>';
    return html;
  }

  // Modal de Edição de Tópico
  function openTopicModal(opts = {}) {
    const { topicId, parentId, category, onSave } = opts;
    const isEdit = !!topicId;
    const topic = isEdit ? WikiStore.getTopicById(topicId) : null;
    onSaveCallback = onSave;
    currentEditId = topicId || null;

    const modal = document.getElementById('topic-modal-backdrop');
    const title = document.getElementById('topic-modal-title');
    const titleInput = document.getElementById('topic-title-input');
    const categorySelect = document.getElementById('topic-category-select');
    const editorContent = document.getElementById('editor-content');
    const iconPicker = document.getElementById('icon-picker-container');

    title.textContent = isEdit ? (WikiStore.getLabel('editTopic') || 'Editar') :
                        (parentId ? (WikiStore.getLabel('newSubtopic') || 'Novo Subtópico') :
                        (WikiStore.getLabel('newTopic') || 'Novo Tópico'));
    titleInput.value = topic ? topic.title : '';

    categorySelect.innerHTML = WikiStore.getCategories().map(c => `<option value="${c.id}">${c.label}</option>`).join('');
    const catVal = topic ? topic.category : (category || 'lore');
    if ([...categorySelect.options].map(o => o.value).includes(catVal)) categorySelect.value = catVal;
    else if (categorySelect.options.length > 0) categorySelect.selectedIndex = 0;

    // Campos de ficha de personagem
    const metaBox = document.getElementById('character-meta-fields');
    const charToggle = document.getElementById('topic-is-character');
    if (metaBox) {
      function toggleMetaBox() {
        const isChar = (charToggle && charToggle.checked) || categorySelect.value === 'characters';
        metaBox.style.display = isChar ? 'block' : 'none';
      }
      categorySelect.removeEventListener('change', toggleMetaBox);
      categorySelect.addEventListener('change', toggleMetaBox);
      if (charToggle) {
        charToggle.removeEventListener('change', toggleMetaBox);
        charToggle.addEventListener('change', toggleMetaBox);
        charToggle.checked = topic ? (topic.isCharacter === true || topic.category === 'characters') : (category === 'characters');
      }
      toggleMetaBox();

      const meta = (topic && topic.metadata) ? topic.metadata : {};
      document.getElementById('meta-portrait-url').value = meta.portraitUrl || '';
      document.getElementById('meta-bg-url').value = meta.bgUrl || '';
      document.getElementById('meta-role').value = meta.role || '';
      document.getElementById('meta-school').value = meta.school || meta.affiliation || '';
      document.getElementById('meta-club').value = meta.club || meta.department || '';
      document.getElementById('meta-age').value = meta.age || '';
      document.getElementById('meta-birthday').value = meta.birthday || '';
      document.getElementById('meta-weapon').value = meta.weapon || '';
      document.getElementById('meta-status').value = meta.status || '';
      document.getElementById('meta-secrets').value = meta.secrets || '';
      document.getElementById('meta-stat-atk').value = meta.stats ? meta.stats.ATK : '';
      document.getElementById('meta-stat-def').value = meta.stats ? meta.stats.DEF : '';
      document.getElementById('meta-stat-sup').value = meta.stats ? meta.stats.SUP : '';
      document.getElementById('meta-stat-tct').value = meta.stats ? meta.stats.TCT : '';
    }

    editorContent.innerHTML = topic ? topic.content : '';
    document.getElementById('topic-parent-id').value = parentId || (topic ? topic.parentId : '') || '';

    // Tags
    const tagsListEl = document.getElementById('topic-tags-list');
    const tagInput = document.getElementById('topic-tag-input');
    const tagSuggestions = document.getElementById('tag-suggestions');
    let currentTags = topic && topic.tags ? [...topic.tags] : [];
    renderTagsInInput(tagsListEl, currentTags);

    // Remove old handlers by cloning
    const freshTagInput = tagInput.cloneNode(true);
    tagInput.parentNode.replaceChild(freshTagInput, tagInput);

    freshTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && freshTagInput.value.trim()) {
        e.preventDefault();
        const tag = freshTagInput.value.trim().toLowerCase();
        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
          renderTagsInInput(tagsListEl, currentTags);
        }
        freshTagInput.value = '';
        tagSuggestions.classList.remove('open');
      }
    });
    freshTagInput.addEventListener('input', () => {
      const val = freshTagInput.value.trim().toLowerCase();
      if (val.length < 1) { tagSuggestions.classList.remove('open'); return; }
      const allTags = WikiStore.getAllTags ? WikiStore.getAllTags() : [];
      const filtered = allTags.filter(t => t.includes(val) && !currentTags.includes(t));
      if (filtered.length > 0) {
        tagSuggestions.innerHTML = filtered.map(t => `<div class="tag-suggestion" data-tag="${t}">${t}</div>`).join('');
        tagSuggestions.classList.add('open');
      } else {
        tagSuggestions.classList.remove('open');
      }
    });
    tagSuggestions.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.tag-suggestion');
      if (suggestion) {
        const tag = suggestion.dataset.tag;
        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
          renderTagsInInput(tagsListEl, currentTags);
        }
        freshTagInput.value = '';
        tagSuggestions.classList.remove('open');
      }
    });
    tagsListEl.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-tag');
      if (removeBtn) {
        const tag = removeBtn.dataset.tag;
        currentTags = currentTags.filter(t => t !== tag);
        renderTagsInInput(tagsListEl, currentTags);
      }
    });

    // Store tags reference for save
    window._currentTopicTags = currentTags;

    // EventDate
    const eventDateInput = document.getElementById('topic-event-date');
    if (eventDateInput) eventDateInput.value = topic ? (topic.eventDate || '') : '';

    const selectedIcon = topic ? topic.icon : 'description';
    iconPicker.innerHTML = getIconPickerHTML(selectedIcon);
    document.getElementById('selected-icon-value').value = selectedIcon;
    // Replace element to remove any previous event listeners
    const freshPicker = iconPicker.cloneNode(true);
    iconPicker.parentNode.replaceChild(freshPicker, iconPicker);
    freshPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-icon]');
      if (!btn) return;
      freshPicker.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('selected-icon-value').value = btn.dataset.icon;
    });

    modal.classList.add('open');
    titleInput.focus();
  }

  function renderTagsInInput(container, tags) {
    container.innerHTML = tags.map(t => `<span class="tag-chip">${t}<span class="remove-tag material-symbols-outlined" data-tag="${t}">close</span></span>`).join('');
  }

  async function saveFromModal() {
    const titleInput = document.getElementById('topic-title-input');
    const categorySelect = document.getElementById('topic-category-select');
    const editorContent = document.getElementById('editor-content');
    const parentId = document.getElementById('topic-parent-id').value || null;
    const icon = document.getElementById('selected-icon-value').value || 'description';

    const charToggleEl = document.getElementById('topic-is-character');
    const isCharacterChecked = charToggleEl ? charToggleEl.checked : false;

    const data = {
      title: titleInput.value.trim() || 'Sem Título',
      content: editorContent.innerHTML,
      category: categorySelect.value,
      parentId: parentId,
      icon: icon,
      isCharacter: isCharacterChecked,
      tags: window._currentTopicTags || [],
      eventDate: document.getElementById('topic-event-date')?.value || ''
    };

    // Metadados de personagem
    if (isCharacterChecked || categorySelect.value === 'characters') {
      data.metadata = {
        portraitUrl: document.getElementById('meta-portrait-url').value,
        bgUrl: document.getElementById('meta-bg-url').value,
        role: document.getElementById('meta-role').value,
        school: document.getElementById('meta-school').value,
        club: document.getElementById('meta-club').value,
        age: document.getElementById('meta-age').value,
        birthday: document.getElementById('meta-birthday').value,
        weapon: document.getElementById('meta-weapon').value,
        status: document.getElementById('meta-status').value,
        secrets: document.getElementById('meta-secrets').value,
        stats: {
          ATK: document.getElementById('meta-stat-atk').value || 0,
          DEF: document.getElementById('meta-stat-def').value || 0,
          SUP: document.getElementById('meta-stat-sup').value || 0,
          TCT: document.getElementById('meta-stat-tct').value || 0
        }
      };
    }

    let topic;
    const saveBtn = document.getElementById('topic-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Salvando...';

    // Save undo snapshot before modifying
    if (WikiStore.saveUndoSnapshot) {
      await WikiStore.saveUndoSnapshot(currentEditId ? 'edit-topic' : 'create-topic');
    }

    if (currentEditId) topic = await WikiStore.updateTopic(currentEditId, data);
    else topic = await WikiStore.createTopic(data);

    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">save</span> Salvar';
    closeTopicModal();

    if (window.showToast) {
      showToast(currentEditId ? 'Tópico atualizado!' : 'Tópico criado!', 'success');
    }

    if (onSaveCallback && topic) { onSaveCallback(topic); onSaveCallback = null; }
    return topic;
  }

  function closeTopicModal() {
    const modal = document.getElementById('topic-modal-backdrop');
    if (modal) modal.classList.remove('open');
    currentEditId = null;
  }

  function enableQuickEdit(element, topicId, field) {
    element.contentEditable = true;
    element.classList.add('quick-editing');
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);

    async function saveEdit() {
      element.contentEditable = false;
      element.classList.remove('quick-editing');
      const update = {}; update[field] = element.textContent.trim();
      await WikiStore.updateTopic(topicId, update);
    }
    element.addEventListener('blur', saveEdit, { once: true });
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); element.blur(); }
      if (e.key === 'Escape') {
        const orig = WikiStore.getTopicById(topicId);
        element.textContent = orig[field];
        element.contentEditable = false;
        element.classList.remove('quick-editing');
      }
    });
  }

  function init() {
    document.addEventListener('selectionchange', () => {
      const editor = document.getElementById('editor-content');
      if (!editor) return;
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedRange = range.cloneRange();
        }
      }
    });
    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('#editor-toolbar button[data-cmd]')) {
        e.preventDefault();
      }
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest('#editor-toolbar')) handleToolbarClick(e);
    });
    // Eventos de seletores avançados
    document.addEventListener('change', (e) => {
      if (e.target.id === 'editor-font-size') handleFontSize(e.target.value);
      if (e.target.id === 'editor-font-family') handleFontFamily(e);
      if (e.target.id === 'editor-text-color') handleTextColor(e);
      if (e.target.id === 'editor-bg-color') handleBgColor(e);
    });
    document.addEventListener('input', (e) => {
      if (e.target.id === 'editor-text-color') handleTextColor(e);
      if (e.target.id === 'editor-bg-color') handleBgColor(e);
    });
  }

  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init, openTopicModal, closeTopicModal, saveFromModal, enableQuickEdit,
    getIconPickerHTML, uploadPortrait, uploadBg, ICONS, FONT_SIZES, FONT_FAMILIES, sanitize
  };
})();
