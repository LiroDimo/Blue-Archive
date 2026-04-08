const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { runExport } = require('./export');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function readJsonFile(filePath, fallbackData) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Erro ao ler ${filePath}:`, err);
  }
  return fallbackData;
}

function writeJsonFile(filePath, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Erro ao escrever ${filePath}:`, err);
  }
}

// ===== INICIALIZAÇÃO DE DADOS (Modelo Consolidado) =====
function initializeData() {
  const wikiData = {
    topics: [],
    categories: [],
    config: {},
    auth: null
  };

  // Carregar ou criar Tópicos
  let topicsData = readJsonFile(TOPICS_FILE, null);
  if (!topicsData) {
    topicsData = readJsonFile(SEED_FILE, []);
    if (topicsData.length > 0) {
      writeJsonFile(TOPICS_FILE, topicsData);
    }
  }
  wikiData.topics = topicsData || [];

  // Carregar ou criar Categorias
  let categoriesData = readJsonFile(CATEGORIES_FILE, null);
  if (!categoriesData) {
    categoriesData = [
      { id: "lore", label: "História", icon: "menu_book", order: 1 },
      { id: "characters", label: "Fichas", icon: "group", order: 2 }
    ];
    writeJsonFile(CATEGORIES_FILE, categoriesData);
  }
  wikiData.categories = categoriesData || [];

  // Carregar ou criar Config
  let configData = readJsonFile(CONFIG_FILE, null);
  if (!configData) {
    configData = {
      siteName: "Nome do Site",
      siteSubtitle: "Subtítulo",
      siteDescription: "Descrição",
      organizationName: "Nome",
      organizationFull: "Nome",
      protocolName: "Protocolo Padrão",
      locationName: "Local Padrão",
      statusName: "Online",
      heroImage: "",
      mapImage: "",
      profileImage: "",
      footerLinks: [],
      labels: {
        dashboard: "Painel",
        archiveDatabase: "Banco de Dados",
        latestUpdates: "Últimas Atualizações",
        loreSpotlight: "Destaques",
        characterOfTheDay: "Destaque do Dia",
        strategicDomains: "Domínios",
        personnelDirectory: "Diretório"
      },
      design: {
        colors: {
          primary: "#00629d",
          primaryContainer: "#00a3ff",
          secondary: "#446278",
          tertiary: "#854d63",
          error: "#ba1a1a",
          surface: "#f6fafe",
          onSurface: "#171c1f",
          onPrimary: "#ffffff",
          secondaryContainer: "#c4e4fe",
          tertiaryContainer: "#cb8aa2",
          onSurfaceVariant: "#3f4852",
          outline: "#6f7883",
          headerBg: "rgba(255, 255, 255, 0.7)",
          sidebarBg: "rgba(248, 250, 252, 0.5)",
          surfaceContainer: "#eaeef2",
          surfaceContainerLow: "#f0f4f8",
          background: "#f6fafe"
        },
        fonts: {
          headline: "Space Grotesk",
          body: "Inter",
          label: "Plus Jakarta Sans"
        },
        layout: {},
        effects: {},
        homepage: {
          showHero: true,
          showCharacterOfDay: true,
          showStrategicDomains: true,
          showLatestUpdates: true,
          showLoreSpotlight: true,
          heroTextColor: "#171c1f",
          heroOverlay: "rgba(255, 255, 255, 0.8)"
        }
      }
    };
    writeJsonFile(CONFIG_FILE, configData);
  }
  wikiData.config = configData || {};

  return wikiData;
}

// Inicializar dados consolidados
const wikiData = initializeData();
let topicsData = wikiData.topics;
let categoriesData = wikiData.categories;
let configData = wikiData.config;

// === UTILITÁRIOS ===

// Remove spans com classe secret-text respeitando tags aninhadas (ex: negrito dentro do segredo)
function removeSecretSpans(html) {
  const result = [];
  let i = 0;
  while (i < html.length) {
    const matchIdx = html.indexOf('<span', i);
    if (matchIdx === -1) { result.push(html.slice(i)); break; }
    const tagEnd = html.indexOf('>', matchIdx);
    if (tagEnd === -1) { result.push(html.slice(i)); break; }
    const tag = html.slice(matchIdx, tagEnd + 1);
    const isSecret = /class\s*=\s*["'][^"']*secret-text[^"']*["']/.test(tag);
    if (isSecret) {
      result.push(html.slice(i, matchIdx));
      let depth = 1;
      let j = tagEnd + 1;
      while (j < html.length && depth > 0) {
        if (html.startsWith('<span', j)) { depth++; j += 5; }
        else if (html.startsWith('</span>', j)) { depth--; j += (depth === 0 ? 7 : 7); }
        else { j++; }
      }
      i = j;
    } else {
      result.push(html.slice(i, tagEnd + 1));
      i = tagEnd + 1;
    }
  }
  return result.join('');
}

// Coleta o ID do tópico e de todos os seus descendentes recursivamente
function collectDescendantIds(topics, rootId) {
  const ids = [rootId];
  let i = 0;
  while (i < ids.length) {
    const parentId = ids[i];
    topics.forEach(t => {
      if (t.parentId === parentId && !ids.includes(t.id)) ids.push(t.id);
    });
    i++;
  }
  return ids;
}

// Servidor local — sem autenticação necessária
const authOptional = (req, res, next) => { req.user = { role: 'master' }; next(); };
const authRequired = (req, res, next) => { req.user = { role: 'master' }; next(); };

// Rotas de Configuração
app.get('/api/config', (req, res) => {
  configData = readJsonFile(CONFIG_FILE, configData);
  res.json(configData);
});

app.put('/api/config', authRequired, (req, res) => {
  configData = { ...configData, ...req.body };
  writeJsonFile(CONFIG_FILE, configData);
  res.json(configData);
});

// Rotas de Categorias
app.get('/api/categories', (req, res) => {
  categoriesData = readJsonFile(CATEGORIES_FILE, categoriesData);
  res.json(categoriesData.sort((a, b) => a.order - b.order));
});

app.post('/api/categories', authRequired, (req, res) => {
  const newCat = req.body;
  newCat.id = newCat.label.trim().toLowerCase().replace(/[^a-z0-9à-ú]+/g, '-');
  if (!newCat.order) {
    newCat.order = categoriesData.length > 0 ? Math.max(...categoriesData.map(c => c.order)) + 1 : 1;
  }
  if (categoriesData.find(c => c.id === newCat.id)) {
    newCat.id = newCat.id + '-' + Math.floor(Math.random() * 1000);
  }
  categoriesData.push(newCat);
  writeJsonFile(CATEGORIES_FILE, categoriesData);
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', authRequired, (req, res) => {
  const idx = categoriesData.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Categoria não encontrada.' });
  categoriesData[idx] = { ...categoriesData[idx], ...req.body, id: req.params.id };
  writeJsonFile(CATEGORIES_FILE, categoriesData);
  res.json(categoriesData[idx]);
});

app.delete('/api/categories/:id', authRequired, (req, res) => {
  const idx = categoriesData.findIndex(c => c.id === req.params.id);
  if (idx > -1) {
    categoriesData.splice(idx, 1);
    writeJsonFile(CATEGORIES_FILE, categoriesData);
    topicsData = readJsonFile(TOPICS_FILE, topicsData);
    const newTopicsData = topicsData.filter(t => t.category !== req.params.id);
    const deletedCount = topicsData.length - newTopicsData.length;
    if (deletedCount > 0) {
      topicsData = newTopicsData;
      writeJsonFile(TOPICS_FILE, topicsData);
    }
    return res.json({ success: true, cascadingDeletions: deletedCount });
  }
  res.status(404).json({ error: 'Categoria não encontrada.' });
});

app.post('/api/categories/reorder', authRequired, (req, res) => {
  const { reorders } = req.body;
  if (reorders && Array.isArray(reorders)) {
    categoriesData = categoriesData.map(cat => {
      const match = reorders.find(r => r.id === cat.id);
      if (match) cat.order = match.order;
      return cat;
    });
    writeJsonFile(CATEGORIES_FILE, categoriesData);
  }
  res.json({ success: true, categories: categoriesData.sort((a, b) => a.order - b.order) });
});

// Rotas de Tópicos
app.get('/api/topics', authOptional, (req, res) => {
  topicsData = readJsonFile(TOPICS_FILE, topicsData);
  if (!req.user || req.user.role !== 'master') {
    const publicTopics = topicsData.filter(topic => topic.visible !== false)
      .map(topic => {
        const safeTopic = { ...topic };
        if (safeTopic.content) {
          safeTopic.content = removeSecretSpans(safeTopic.content);
        }
        if (safeTopic.metadata) {
          safeTopic.metadata = { ...safeTopic.metadata };
          delete safeTopic.metadata.secrets;
        }
        return safeTopic;
      });
    return res.json(publicTopics);
  }
  res.json(topicsData);
});

app.get('/api/topics/:id', authOptional, (req, res) => {
  topicsData = readJsonFile(TOPICS_FILE, topicsData);
  const topic = topicsData.find(t => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'Tópico não encontrado.' });
  if (topic.visible === false && (!req.user || req.user.role !== 'master')) {
    return res.status(404).json({ error: 'Tópico não encontrado.' });
  }
  if (!req.user || req.user.role !== 'master') {
    const safeTopic = { ...topic };
    if (safeTopic.content) {
      safeTopic.content = removeSecretSpans(safeTopic.content);
    }
    if (safeTopic.metadata) {
      safeTopic.metadata = { ...safeTopic.metadata };
      delete safeTopic.metadata.secrets;
    }
    return res.json(safeTopic);
  }
  res.json(topic);
});

app.post('/api/topics', authRequired, (req, res) => {
  topicsData = readJsonFile(TOPICS_FILE, topicsData);
  const newTopic = req.body;
  // Validação básica
  if (!newTopic.title || typeof newTopic.title !== 'string' || !newTopic.title.trim()) {
    return res.status(400).json({ error: 'O campo "title" é obrigatório.' });
  }
  if (!newTopic.category || typeof newTopic.category !== 'string') {
    return res.status(400).json({ error: 'O campo "category" é obrigatório.' });
  }
  if (!newTopic.id) {
    newTopic.id = 't-' + crypto.randomUUID();
  }
  newTopic.createdAt = new Date().toISOString();
  newTopic.updatedAt = newTopic.createdAt;
  topicsData.push(newTopic);
  writeJsonFile(TOPICS_FILE, topicsData);
  res.status(201).json(newTopic);
});

app.put('/api/topics/:id', authRequired, (req, res) => {
  topicsData = readJsonFile(TOPICS_FILE, topicsData);
  const idx = topicsData.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tópico não encontrado.' });
  topicsData[idx] = { ...topicsData[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  writeJsonFile(TOPICS_FILE, topicsData);
  res.json(topicsData[idx]);
});

app.delete('/api/topics/:id', authRequired, (req, res) => {
  topicsData = readJsonFile(TOPICS_FILE, topicsData);
  const idsToDelete = collectDescendantIds(topicsData, req.params.id);
  topicsData = topicsData.filter(t => !idsToDelete.includes(t.id));
  writeJsonFile(TOPICS_FILE, topicsData);
  res.json({ success: true, deletedCount: idsToDelete.length });
});

app.put('/api/topics/:id/visibility', authRequired, (req, res) => {
  topicsData = readJsonFile(TOPICS_FILE, topicsData);
  const idx = topicsData.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tópico não encontrado.' });
  topicsData[idx].visible = req.body.visible;
  topicsData[idx].updatedAt = new Date().toISOString();
  writeJsonFile(TOPICS_FILE, topicsData);
  res.json(topicsData[idx]);
});

// === BACKUP / RESTORE ===
app.get('/api/backup', authRequired, (req, res) => {
  topicsData = readJsonFile(TOPICS_FILE, topicsData);
  categoriesData = readJsonFile(CATEGORIES_FILE, categoriesData);
  configData = readJsonFile(CONFIG_FILE, configData);
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    topics: topicsData,
    categories: categoriesData,
    config: configData
  };
  res.setHeader('Content-Disposition', `attachment; filename="wiki-backup-${Date.now()}.json"`);
  res.json(backup);
});

app.post('/api/restore', authRequired, (req, res) => {
  const data = req.body;
  if (!data || !data.topics || !data.categories) {
    return res.status(400).json({ error: 'Formato de backup inválido.' });
  }
  // Save undo snapshot before restoring
  pushUndoSnapshot('restore');
  topicsData = data.topics;
  categoriesData = data.categories;
  if (data.config) configData = data.config;
  writeJsonFile(TOPICS_FILE, topicsData);
  writeJsonFile(CATEGORIES_FILE, categoriesData);
  writeJsonFile(CONFIG_FILE, configData);
  res.json({ success: true, topics: topicsData.length, categories: categoriesData.length });
});

// === UNDO SYSTEM ===
const undoStack = [];
const MAX_UNDO = 20;

function pushUndoSnapshot(action) {
  undoStack.push({
    action,
    timestamp: new Date().toISOString(),
    topics: JSON.parse(JSON.stringify(topicsData)),
    categories: JSON.parse(JSON.stringify(categoriesData)),
    config: JSON.parse(JSON.stringify(configData))
  });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

// Hook into write operations for auto-undo
const origWriteJsonFile = writeJsonFile;
// We'll track via the undo endpoint instead

app.post('/api/undo/snapshot', authRequired, (req, res) => {
  pushUndoSnapshot(req.body.action || 'manual');
  res.json({ stackSize: undoStack.length });
});

app.post('/api/undo', authRequired, (req, res) => {
  if (undoStack.length === 0) {
    return res.status(400).json({ error: 'Nada para desfazer.' });
  }
  const snapshot = undoStack.pop();
  topicsData = snapshot.topics;
  categoriesData = snapshot.categories;
  configData = snapshot.config;
  writeJsonFile(TOPICS_FILE, topicsData);
  writeJsonFile(CATEGORIES_FILE, categoriesData);
  writeJsonFile(CONFIG_FILE, configData);
  res.json({ success: true, action: snapshot.action, stackSize: undoStack.length });
});

app.get('/api/undo/status', authRequired, (req, res) => {
  res.json({
    canUndo: undoStack.length > 0,
    stackSize: undoStack.length,
    lastAction: undoStack.length > 0 ? undoStack[undoStack.length - 1].action : null
  });
});

// Rota de Exportação
app.post('/api/export', authRequired, (req, res) => {
  try {
    const result = runExport();
    res.json(result);
  } catch (err) {
    console.error('Erro na exportação:', err);
    res.status(500).json({ error: 'Falha na exportação: ' + err.message });
  }
});

// Frontend estático — servir apenas arquivos públicos necessários
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'manifest.json')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'sw.js')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada.' });
});

app.listen(PORT, () => {
  console.log(`🔡 Servidor rodando na porta ${PORT}`);
  console.log(`🛡️ Sistema de Edição Visual ativo — PT-BR`);
});
