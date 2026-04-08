# Wiki Sistema Visual

Sistema de Wiki com edição visual completa em Português Brasileiro.

## Descrição

Plataforma de wiki interativa para gerenciamento de conteúdo de campanhas de RPG, com editor visual rico, categorias personalizadas e conteúdo secreto para o Mestre.

## Como funciona

O projeto opera em duas etapas:

1. **Edição local** — rode o servidor Node.js, crie e edite tópicos como Mestre, marque conteúdo secreto e tópicos ocultos.
2. **Publicação** — rode `npm run export` para gerar a pasta `/docs` já sanitizada (sem segredos) e faça commit para o GitHub. O GitHub Pages serve `/docs` automaticamente para os jogadores.

## Funcionalidades

- Editor visual completo (negrito, cor, imagens, wiki-links)
- Categorias personalizáveis com ícones
- Modo Mestre (toggle local, sem senha — uso pessoal)
- Conteúdo secreto (`secret-text`) oculto na exportação
- Tópicos e subtópicos com visibilidade controlada
- Fichas de personagem com metadados e segredos do GM
- Exportação sanitizada para GitHub Pages
- Interface 100% em Português Brasileiro

## Tecnologias

- Node.js + Express
- Vanilla JS (sem frameworks)
- JSON (armazenamento local em `/data`)

## Instalação

```bash
npm install
```

## Uso

```bash
# Iniciar servidor local (modo edição)
npm start

# Exportar para GitHub Pages
npm run export
```

Acesse em `http://localhost:3000`

## Publicação no GitHub Pages

Após rodar `npm run export`:

1. Faça commit do diretório `docs/` no repositório
2. No GitHub, vá em **Settings → Pages**
3. Em *Source*, selecione **Deploy from a branch**
4. Selecione a branch e pasta `/docs`
5. Clique em **Save**

## Rotas da API (servidor local)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/config | Obter configuração |
| PUT | /api/config | Atualizar configuração |
| GET | /api/categories | Listar categorias |
| POST | /api/categories | Criar categoria |
| PUT | /api/categories/:id | Atualizar categoria |
| DELETE | /api/categories/:id | Deletar categoria |
| GET | /api/topics | Listar tópicos |
| POST | /api/topics | Criar tópico |
| PUT | /api/topics/:id | Atualizar tópico |
| DELETE | /api/topics/:id | Deletar tópico (cascata) |
| PUT | /api/topics/:id/visibility | Alternar visibilidade |
| POST | /api/export | Exportar para /docs |

## Estrutura

```
├── data/           # Arquivos JSON (dados locais)
├── docs/           # Site estático gerado (GitHub Pages)
├── js/             # Frontend JavaScript (modo edição)
├── css/            # Estilos
├── server.js       # Servidor local
└── export.js       # Gerador do site estático
```

## Observações de segurança

- O servidor local **não tem autenticação por senha** — é destinado a uso pessoal na rede local.
- A exportação remove automaticamente todo conteúdo `secret-text`, `metadata.secrets` e tópicos com `visible: false`.
- Nunca suba a pasta `/data` para um repositório público se ela contiver segredos de campanha.
