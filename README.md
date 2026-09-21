# Blog Platform

Plataforma de blogs completa no estilo **Blogger / WordPress**, com painel administrativo,
**vários blogs independentes**, imagens organizadas por blog, personalização total da
aparência e múltiplos templates de layout.

- **Front-end:** React 18 + Vite + Tailwind CSS
- **Back-end:** Node.js + Express + PostgreSQL
- **Imagens:** Cloudinary (plano gratuito)
- **Deploy:** um único Web Service no Render (o Express serve o build do React)

---

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Estrutura do projeto](#estrutura-do-projeto)
3. [Rodando localmente](#rodando-localmente)
4. [Deploy no Render (passo a passo)](#deploy-no-render-passo-a-passo)
5. [Variáveis de ambiente](#variáveis-de-ambiente)
6. [Configurando o Cloudinary](#configurando-o-cloudinary)
7. [Usando o painel](#usando-o-painel)
8. [API REST](#api-rest)
9. [Segurança](#segurança)
10. [Solução de problemas](#solução-de-problemas)

---

## Funcionalidades

### Múltiplos blogs

- Crie **quantos blogs quiser** dentro da mesma instalação. Cada um tem aparência,
  categorias, publicações e **pasta de imagens** próprias.
- Endereço por caminho: `/b/nome-do-blog` (funciona no plano gratuito do Render,
  que não permite subdomínios como `blog1.seudominio.com`).
- Com um único blog, a página inicial `/` redireciona automaticamente para ele.
  Com vários, mostra um índice com todos.
- O painel tem um **seletor de blog** no topo, além de uma tela "Meus blogs" com
  contadores de publicações, rascunhos, categorias e visualizações.
- Dois blogs podem ter posts com o **mesmo slug** — a unicidade é por blog.
- Ao excluir um blog, as publicações e categorias saem junto. As imagens do Cloudinary
  só são removidas se você marcar a opção.

### Pastas de imagem por blog

Cada blog ganha uma pasta exclusiva, organizada por tipo de imagem. O **destino é escolhido
automaticamente**:

| Situação | Destino | Onde ficam os arquivos |
|---|---|---|
| Chaves `CLOUDINARY_*` **vazias** | 🖥️ **Pasta local** | `server/uploads/meu-blog/posts/` |
| Chaves `CLOUDINARY_*` **preenchidas** | ☁️ **Cloudinary** | `blog-platform/meu-blog/posts/` |

Ou seja: **para testar tudo localmente você não precisa configurar nada** — basta deixar as
chaves do Cloudinary vazias. As imagens são salvas em `server/uploads/` e servidas pela
própria aplicação em `/uploads/...`.

```
local:      server/uploads/          cloudinary:  blog-platform/   <- CLOUDINARY_FOLDER
            └── meu-blog/                         └── meu-blog/
                ├── logo/                             ├── logo/
                ├── favicon/                          ├── favicon/
                ├── banner/                           ├── banner/
                ├── posts/                            ├── posts/
                └── uploads/                          └── uploads/
```

- A pasta do blog é criada **automaticamente** ao criar o blog.
- Ela é **imutável**: renomear o endereço (slug) do blog não move nem quebra as
  imagens já enviadas.
- O caminho exato aparece no painel em **Aparência → Identidade → Pasta de imagens**.
- A pasta raiz é configurável pela variável `CLOUDINARY_FOLDER` (útil para separar
  ambientes de produção e teste dentro da mesma conta Cloudinary).

### Área administrativa (usuário único)
- Login com usuário e senha, sessão via **JWT** (7 dias), senha com hash **bcrypt**.
- Troca de usuário e senha dentro do painel.
- Rotas administrativas protegidas por middleware — nenhuma rota de escrita funciona sem token.

### Painel
- **Dashboard** com totais (publicações, rascunhos, categorias, visualizações), posts recentes
  e gráfico de publicações por categoria.

### Publicações
- Título, slug automático e estável, **resumo** (veja abaixo), autor, categoria,
  imagem de capa, destaque na home, status (rascunho/publicado) e campos de **SEO**.
- **Editor Markdown** com barra de ferramentas: negrito, itálico, títulos, listas, citação,
  bloco de código, links, upload de imagem por botão, **alinhamento de texto**,
  desfazer/refazer e **pré-visualização ao vivo**.
- Publicar/despublicar com um clique, busca por título, filtros por status e categoria,
  paginação e exclusão com confirmação.

### Resumo da publicação

O campo **Resumo** é opcional e tem dois modos:

| Modo | O que acontece |
|---|---|
| **Gerar automaticamente** (padrão) | O resumo é extraído do início do texto. Usado nas listagens e na busca. |
| **Escrito por você** | Além das listagens, aparece como **introdução** na página do post. |

A diferença importa: um resumo automático é apenas o começo do conteúdo, então ele **não**
é exibido na página do post — seria o leitor ler o mesmo trecho duas vezes. Só resumos
escritos pelo autor aparecem como introdução.

No editor, marque ou desmarque **Gerar automaticamente** para alternar entre os modos. Com a
opção marcada, o campo mostra uma prévia do que será gerado.

### Categorias
- CRUD completo com nome, slug automático, descrição e cor.
- Contador de publicações por categoria.

### Personalização da aparência (com preview em tempo real)
- **Identidade:** nome do blog, slogan, descrição, logo e favicon.
- **Banner:** imagem de fundo, título, subtítulo e controle de escurecimento.
- **Cores:** 8 paletas prontas + 7 cores individuais (primária, secundária, destaque,
  texto, fundo, superfície e bordas), além de modo escuro.
- **Tipografia:** 20 fontes do Google Fonts (títulos e corpo) e controle de arredondamento.
- **Layout:** 4 templates + publicações por página + barra lateral + exibição do autor.
- **Navegação:** editor da navbar (adicionar, reordenar, remover links, abrir em nova aba).
- **Rodapé e redes sociais.**
- **CSS customizado** com acesso às variáveis do tema.
- Restaurar aparência padrão e descartar alterações não salvas.

### Templates de layout
| ID | Nome | Descrição |
|---|---|---|
| `classic` | Clássico | Destaque grande + lista em coluna |
| `magazine` | Revista | Destaque principal + grade editorial |
| `grid` | Grade | Cards uniformes em grade responsiva |
| `minimal` | Minimalista | Sem imagens grandes, foco em tipografia |

### Site público
- Home paginada, busca, página de post com Markdown, posts relacionados, contagem de
  visualizações, botão copiar link e compartilhar.
- Listagem e navegação por categorias, página "Sobre", página 404.
- SEO: títulos e meta tags dinâmicos, `robots.txt` e `sitemap.xml` automáticos.
- Sanitização de HTML com DOMPurify (Markdown é convertido e limpo antes de renderizar).
- Layout totalmente responsivo.

---

## Estrutura do projeto

```
blog-system/
├── package.json            # scripts de build/start usados pelo Render
├── render.yaml             # Blueprint do Render (web service + PostgreSQL)
├── docker-compose.yml      # PostgreSQL local para desenvolvimento
├── .nvmrc                  # versão de Node recomendada (22.12)
├── scripts/
│   └── dev.mjs             # sobe API + React juntos (npm run dev)
├── server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── env.js          # carrega sempre server/.env (qualquer cwd)
│       ├── blog-service.js # criação de blogs, pastas de imagem, middlewares de escopo
│       ├── setup.js        # npm run setup — cria o .env com JWT_SECRET aleatório
│       ├── doctor.js       # npm run doctor — diagnostica o ambiente
│       ├── reset.js        # npm run db:reset-hard — recria o banco do zero
│       ├── index.js        # app Express, rotas, SEO, arquivos estáticos
│       ├── db.js           # pool PostgreSQL
│       ├── migrate.js      # schema + seed (admin, categorias, settings)
│       ├── auth.js         # JWT + middleware requireAuth
│       ├── cloudinary.js   # upload/remoção de imagens
│       ├── utils.js        # slug, sanitização, conversões
│       └── routes/
│           ├── auth.js
│           ├── blogs.js    # lista/cria/edita/exclui blogs (público + admin)
│           ├── settings.js
│           ├── posts.js    # rotas públicas + admin + stats
│           ├── categories.js
│           └── upload.js
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                 # todas as rotas do React Router
        ├── index.css               # variáveis do tema + estilos do conteúdo
        ├── lib/
        │   ├── api.js              # cliente HTTP + endpoints
        │   ├── urls.js             # URLs por blog e resolução da navbar
        │   ├── alignment.js        # alinhamento de blocos do editor
        │   ├── theme.js            # motor de temas (fontes, cores, favicon)
        │   └── markdown.js         # marked + DOMPurify + utilitários
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── BlogContext.jsx      # blog atual + aplica o tema dele
        │   └── SettingsContext.jsx  # guarda a aparência ativa
        ├── components/
        │   ├── public/             # Navbar, Footer, Banner, PostCard, Pagination
        │   ├── admin/              # AdminLayout, MarkdownEditor
        │   └── ui/                 # ImageField, ColorField, Feedback
        ├── templates/Templates.jsx # os 4 templates de layout
        └── pages/
            ├── public/             # Índice de blogs, Home, Post, Categorias, Sobre, 404
            └── admin/              # Login, Meus blogs, Dashboard, Posts, Editor,
                                    # Categorias, Aparência, Minha conta
```

---

## Rodando localmente

### Resumo (3 comandos)

Se você já tem Node 20.19+ e Docker instalados:

```bash
docker compose up -d        # 1. sobe o PostgreSQL
npm run setup               # 2. instala tudo e cria o server/.env
npm run migrate             # 3. cria as tabelas
npm run dev                 # 4. inicia API + React juntos
```

Pronto: abra **http://localhost:5173**. Para conferir se está tudo certo antes de rodar,
use `npm run doctor` — ele diz exatamente o que está faltando.

O passo a passo detalhado está abaixo.

---

### 1. Pré-requisitos

- **Node.js 20.19 ou superior** (recomendado 22.12 LTS). Confira com `node -v`.
  O arquivo `.nvmrc` já está no projeto: se você usa `nvm`, basta rodar `nvm use`.
- **PostgreSQL** — escolha **uma** das opções:

| Opção | Como | Quando usar |
|---|---|---|
| **Docker** (mais fácil) | `docker compose up -d` | Não quer instalar PostgreSQL |
| PostgreSQL instalado | `createdb blog` | Já tem Postgres na máquina |
| Neon / Supabase (grátis) | cole a connection string no `.env` | Não quer instalar nada |

> Com Docker, o banco já sobe configurado com usuário `blog`, senha `blog` e banco `blog`.

### 2. Instalar as dependências

Na **raiz** do projeto:

```bash
npm run install:all
```

Isso instala o back-end (`server/`) e o front-end (`client/`).

### 3. Criar o arquivo de configuração

```bash
npm run setup
```

Esse comando cria `server/.env` a partir do `.env.example` e **já gera um `JWT_SECRET`
aleatório** para você. O `DATABASE_URL` já vem apontando para o banco do Docker.

Se for usar outro banco, abra `server/.env` e ajuste apenas a linha `DATABASE_URL`.

> O arquivo **precisa** ficar em `server/.env`. Os comandos `npm run migrate` e `npm start`
são executados da raiz, mas o projeto carrega o `.env` sempre da pasta `server/`.

### 4. Conferir o ambiente

```bash
npm run doctor
```

Ele verifica Node, `.env`, conexão com o banco, tabelas, usuário administrador, Cloudinary
e se o front-end já foi compilado — com a instrução exata para cada problema encontrado.

### 5. Criar as tabelas

```bash
npm run migrate
```

Isso cria as tabelas, as 3 categorias iniciais, a configuração padrão do blog e o
usuário administrador (definido por `ADMIN_USERNAME` / `ADMIN_PASSWORD`).
É seguro rodar mais de uma vez — não apaga nada.

### 6. Rodar a aplicação

**Modo desenvolvimento** (recomendado para testar — recarrega sozinho ao salvar arquivos):

```bash
npm run dev
```

Isso sobe as duas partes ao mesmo tempo:

| Parte | Endereço |
|---|---|
| Blog (React + hot reload) | <http://localhost:5173> |
| Painel administrativo | <http://localhost:5173/admin> |
| API | <http://localhost:4000/api> |

> Se preferir dois terminais: `npm run dev:server` e `npm run dev:client`.

**Modo produção local** (testa exatamente o que o Render vai executar — um único servidor):

```bash
npm run build   # compila o React em client/dist
npm start       # http://localhost:4000 serve a API e o site juntos
```

Nesse modo acesse <http://localhost:4000> e <http://localhost:4000/admin>.

### 7. Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run doctor` | Diagnostica o ambiente e diz o que está faltando |
| `npm run migrate` | Cria/atualiza tabelas (não apaga dados) |
| `npm run db:reset-hard` | **Apaga tudo** e recria o banco do zero (pede confirmação) |
| `npm run dev` | API + React em modo desenvolvimento |
| `npm start` | Sobe o servidor único em modo produção |

---

## Deploy no Render (passo a passo)

### Opção A — Blueprint automático (recomendado)

1. Envie o projeto para um repositório no GitHub.
2. No Render, clique em **New +** → **Blueprint**.
3. Selecione o repositório. O Render lerá o `render.yaml` e criará:
   - o **PostgreSQL** (`blog-db`)
   - o **Web Service** (`blog-platform`) já ligado ao banco
4. O Render vai pedir os valores das variáveis marcadas com `sync: false`:

   | Variável | O que informar |
   |---|---|
   | `ADMIN_PASSWORD` | a senha do administrador (escolha uma forte) |
   | `SITE_URL` | a URL do serviço, ex. `https://blog-platform.onrender.com` |
   | `CLOUDINARY_CLOUD_NAME` | veja [Configurando o Cloudinary](#configurando-o-cloudinary) |
   | `CLOUDINARY_API_KEY` | idem |
   | `CLOUDINARY_API_SECRET` | idem |

5. Clique em **Apply**. O Render executa:
   - **Build:** `npm run build`
   - **Start:** `npm start`
6. Aguarde o deploy. Acesse `https://SEU-SERVICO.onrender.com/admin`.

> As tabelas e o usuário administrador são criados automaticamente no primeiro boot
> (`runMigrations()` roda antes de o servidor começar a ouvir).

### Opção B — Manual

1. **New +** → **PostgreSQL** → plano Free → crie o banco.
2. **New +** → **Web Service** → conecte o repositório → runtime **Node**.
3. Configure:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Em **Environment**, adicione:

   | Chave | Valor |
   |---|---|
   | `NODE_VERSION` | `22.12.0` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *Internal Database URL* do banco criado |
   | `JWT_SECRET` | uma string longa e aleatória |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD` | sua senha |
   | `SITE_URL` | `https://seu-servico.onrender.com` |
   | `CLOUDINARY_CLOUD_NAME` | ... |
   | `CLOUDINARY_API_KEY` | ... |
   | `CLOUDINARY_API_SECRET` | ... |

5. **Create Web Service**.

### Observações importantes sobre o Render

- **Um único serviço.** Não é preciso criar um Static Site separado nem configurar CORS:
  o Express serve o build do React e faz o fallback de rotas para `index.html`
  (necessário para o React Router).
- **Use a Internal Database URL** quando o serviço e o banco estão na mesma região
  (mais rápido e sem exigir SSL externo).
- **Plano free:** o serviço hiberna após ~15 min de inatividade e acorda em ~30 s no
  primeiro acesso. O banco gratuito expira após 90 dias (faça upgrade para manter).
- **Nunca use disco local** para arquivos: por isso as imagens vão para o Cloudinary.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | String de conexão do PostgreSQL |
| `JWT_SECRET` | ✅ | Chave para assinar os tokens. Gere uma aleatória longa |
| `ADMIN_USERNAME` | ✅ | Usuário do administrador (criado no primeiro boot) |
| `ADMIN_PASSWORD` | ✅ | Senha inicial do administrador |
| `NODE_ENV` | recomendada | `production` no Render |
| `PORT` | automática | O Render injeta; localmente use `4000` |
| `SITE_URL` | recomendada | URL pública (usada no `sitemap.xml` e `robots.txt`) |
| `STORAGE_DRIVER` | opcional | `auto` (padrão), `local` ou `cloudinary` |
| `UPLOADS_DIR` | opcional | Pasta das imagens locais (padrão `server/uploads`) |
| `CLOUDINARY_FOLDER` | opcional | Pasta raiz no Cloudinary (padrão `blog-platform`) |
| `CLOUDINARY_CLOUD_NAME` | ✅ para uploads | Cloud name |
| `CLOUDINARY_API_KEY` | ✅ para uploads | API key |
| `CLOUDINARY_API_SECRET` | ✅ para uploads | API secret |
| `CORS_ORIGIN` | opcional | Origens permitidas, separadas por vírgula (padrão: todas) |
| `JWT_EXPIRES_IN` | opcional | Validade do token (padrão `7d`) |
| `DATABASE_SSL` | opcional | `false` desativa SSL (útil em Postgres local) |
| `ADMIN_PASSWORD_SYNC` | opcional | `true` força reaplicar `ADMIN_PASSWORD` no boot |

> **Sobre a senha:** ao trocar a senha pelo painel, ela **não** é sobrescrita nos reinícios.
> Se você quiser voltar a controlar a senha apenas pelo ambiente, defina
> `ADMIN_PASSWORD_SYNC=true` (e remova depois).

Gerar um `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Armazenamento de imagens

Há dois destinos. **Localmente você não precisa configurar nada** — deixe as chaves
`CLOUDINARY_*` vazias e as imagens vão para `server/uploads/`.

> ⚠️ **Ao publicar no Render, configure o Cloudinary.** O Render não oferece disco
> persistente no plano gratuito: imagens salvas localmente são **perdidas a cada deploy**.
> O servidor avisa isso no log de inicialização quando roda em produção com armazenamento local.

### Usando o Cloudinary (necessário em produção)

Plano gratuito: 25 GB de armazenamento e banda generosa.

1. Crie uma conta gratuita em <https://cloudinary.com/users/register/free>.
2. Copie os três valores em **Console → Settings → API Keys**:

   | No Cloudinary | Vai para |
   |---|---|
   | **Cloud name** | `CLOUDINARY_CLOUD_NAME` |
   | **API Key** | `CLOUDINARY_API_KEY` |
   | **API Secret** | `CLOUDINARY_API_SECRET` |

3. Preencha as três linhas em `server/.env` e **reinicie o servidor** (o `.env` é lido só na
   inicialização). Localmente: `npm run dev`. No Render: em *Environment* e depois redeploy.
4. Confirme com `npm run doctor` — deve aparecer `✔ OK  Armazenamento de imagens  Cloudinary (nuvem)`.

Assim que as três chaves existem, o destino muda sozinho: nada mais precisa ser alterado.

As imagens são organizadas automaticamente **por blog**:
`{CLOUDINARY_FOLDER}/{slug-do-blog}/{logo|favicon|banner|posts|uploads}`.

Para usar outra pasta raiz, defina `CLOUDINARY_FOLDER` (ex.: `blog-producao`) — as pastas
novas são criadas sozinhas na primeira imagem enviada.

**Forçando um destino:** se quiser fixar, use `STORAGE_DRIVER=local` ou
`STORAGE_DRIVER=cloudinary` no `server/.env`. Para mudar a pasta onde as imagens locais
são salvas, use `UPLOADS_DIR`.

---

## Usando o painel

1. Acesse `/admin` e entre com `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
2. **Meus blogs:** crie um blog (nome + endereço). As pastas de imagem dele são criadas
   automaticamente. Clique em **Gerenciar** para abrir o blog.
3. Dentro do blog, use o **seletor no topo da barra lateral** para trocar de blog a
   qualquer momento.
4. **Publicações → Nova publicação:** escreva o título, o conteúdo no editor Markdown,
   escolha a categoria, envie a imagem de capa e clique em **Publicar**.
5. **Aparência:** personalize tudo. As alterações aparecem **em tempo real** na tela;
   clique em **Salvar alterações** para gravar (a barra inferior mostra se há pendências).
   Na aba **Identidade** você também altera o **endereço do blog** e vê a
   **pasta de imagens** dele.
6. **Categorias:** crie as categorias e escolha uma cor para cada.
7. **Minha conta:** altere usuário e senha (vale para todos os blogs).

### Endereços

| O que | Endereço |
|---|---|
| Índice de blogs | `/` |
| Um blog | `/b/nome-do-blog` |
| Um post | `/b/nome-do-blog/post/titulo-do-post` |
| Painel | `/admin` |
| Painel de um blog | `/admin/b/1` |

### Atalhos do editor Markdown

| Sintaxe | Resultado |
|---|---|
| `**texto**` | **negrito** |
| `_texto_` | _itálico_ |
| `## Título` | cabeçalho |
| `- item` | lista |
| `> citação` | citação |
| `[texto](url)` | link |
| `![alt](url)` | imagem |
| ` ``` ` | bloco de código |
| `::: justify` | justificado (simétrico nas duas margens) |
| `::: center` | centralizado |
| `::: right` | à direita |

### Alinhamento de texto

O Markdown puro não tem sintaxe de alinhamento. A barra de ferramentas do editor oferece
**quatro** botões — **esquerda**, **centralizado**, **à direita** e **justificado** — que
envolvem o bloco onde o cursor está em marcadores de alinhamento:

```markdown
::: center
## Título centralizado

Texto com **negrito** continua funcionando normalmente.
:::
```

Como funciona, na prática:

- Posicione o cursor no parágrafo (ou selecione vários) e clique no botão.
- O botão do alinhamento atual aparece destacado, e o rodapé do editor mostra o tipo do bloco.
- Clicar no **mesmo** botão de novo **remove** o alinhamento.
- **Esquerda** sempre remove (é o alinhamento padrão).
- Funciona com parágrafos, títulos, listas, citações, imagens e blocos de código.

**Justificado** distribui o texto de forma simétrica entre as duas margens. Como o
justificado abre espaços irregulares em colunas estreitas (celular), ele vem acompanhado de
`hyphens: auto`, que quebra palavras longas corretamente no idioma da página. Listas dentro
de um bloco justificado continuam alinhadas à esquerda, para os marcadores não se
espalharem.

> O alinhamento é aplicado **depois** de o Markdown virar HTML. Fazer o contrário (envolver o
> Markdown) quebraria títulos, listas e citações, porque esses construtores deixam de ser
> interpretados dentro de HTML.
>
> Os marcadores `:::` são removidos automaticamente do resumo e das meta tags.

---

## API REST

### Públicas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/blogs` | Lista de blogs (índice público) |
| `GET` | `/api/blogs/:slug` | Blog + configuração de aparência |
| `GET` | `/api/blogs/:slug/posts` | Publicadas (`page`, `limit`, `category`, `search`, `featured`) |
| `GET` | `/api/blogs/:slug/posts/:postSlug` | Post + relacionados (incrementa visualizações) |
| `GET` | `/api/blogs/:slug/categories` | Categorias com contagem |
| `GET` | `/sitemap.xml`, `/robots.txt` | SEO (cobre todos os blogs) |

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login → `{ token, user }` |
| `GET` | `/api/auth/me` | Usuário atual |
| `PUT` | `/api/auth/credentials` | Trocar usuário/senha |

### Blogs (exigem `Authorization: Bearer <token>`)

| Método | Rota | Descrição |
|---|---|---|
| `GET/POST` | `/api/admin/blogs` | Listar (com contadores) / criar |
| `GET/PUT/DELETE` | `/api/admin/blogs/:blogId` | Obter (+ pastas) / renomear / excluir |
| `DELETE` | `/api/admin/blogs/:blogId?deleteImages=true` | Excluir e também apagar as imagens |

### Conteúdo de um blog (exigem token)

Todas as rotas abaixo operam **dentro de um blog** (`:blogId`):

| Método | Rota | Descrição |
|---|---|---|
| `GET/POST` | `/api/admin/blogs/:blogId/posts` | Listar (inclui rascunhos) / criar |
| `GET/PUT/DELETE` | `/api/admin/blogs/:blogId/posts/:id` | Obter / atualizar / excluir |
| `PATCH` | `/api/admin/blogs/:blogId/posts/:id/status` | Publicar ou despublicar |
| `GET/POST` | `/api/admin/blogs/:blogId/categories` | Listar / criar |
| `PUT/DELETE` | `/api/admin/blogs/:blogId/categories/:id` | Atualizar / excluir |
| `GET` | `/api/admin/blogs/:blogId/stats` | Estatísticas do dashboard |
| `GET/PUT` | `/api/admin/blogs/:blogId/settings` | Ler / atualizar aparência |
| `POST` | `/api/admin/blogs/:blogId/settings/reset` | Restaurar aparência padrão |
| `POST` | `/api/admin/blogs/:blogId/upload` | Upload de imagem (`multipart`, campo `file` + `folder`) |
| `GET` | `/api/admin/blogs/:blogId/upload/status` | Cloudinary pronto? + pastas do blog |

O campo `folder` do upload aceita `logo`, `favicon`, `banner`, `posts` ou `uploads`.

Exemplo:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

# criar um blog
curl -X POST http://localhost:4000/api/admin/blogs \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Meu Blog","slug":"meu-blog"}'

# publicar um post no blog de id 1
curl -X POST http://localhost:4000/api/admin/blogs/1/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Meu post","content":"## Olá\n\nConteúdo.","status":"published","category_id":1}'
```

---

## Segurança

- Senhas com **bcrypt** (10 rounds); token **JWT** assinado com `JWT_SECRET`.
- Todas as rotas de escrita passam por `requireAuth`.
- **Rate limit** de 30 tentativas por 15 min nas rotas de autenticação.
- Queries **sempre parametrizadas** (`$1`, `$2`, ...) — sem concatenação de SQL.
- HTML do Markdown sanitizado com **DOMPurify** (remove `<script>` e atributos `on*`).
- Headers `X-Content-Type-Options` e `Referrer-Policy`; Express sem `x-powered-by`.
- Upload restrito a imagens (PNG/JPG/GIF/WEBP/AVIF/SVG) até **8 MB**.
- Em produção, mensagens de erro internas não são expostas ao cliente.

**Checklist antes de ir ao ar:**
- [ ] `JWT_SECRET` longo e aleatório (não use o valor de exemplo).
- [ ] `ADMIN_PASSWORD` forte.
- [ ] HTTPS (o Render fornece automaticamente).
- [ ] Cloudinary configurado.

---

## Solução de problemas

**"DATABASE_URL nao definida" / o serviço reinicia em loop**
A variável `DATABASE_URL` não foi configurada. Use a *Internal Database URL* do banco.

**Erro de SSL ao conectar no Postgres local**
Adicione `DATABASE_SSL=false` ao `.env` do servidor.

**As imagens não aparecem / upload falha**
Rode `npm run doctor` e veja a linha *Armazenamento de imagens*. Sem as chaves do Cloudinary
o sistema salva em `server/uploads/` automaticamente — se nem isso estiver funcionando,
confira as permissões de escrita nessa pasta. Depois de editar `server/.env`, **reinicie o
servidor**: as variáveis só são lidas na inicialização.

**"Unknown API key" ou "Invalid Signature" ao enviar imagem**
As credenciais do Cloudinary estão erradas, incompletas, ou ainda são os valores de exemplo
do `.env.example` (`SEU_CLOUD_NAME`, `SUA_API_KEY`...). Abra `server/.env` e **deixe as três
linhas `CLOUDINARY_*` vazias** para salvar localmente, ou preencha com os valores reais do
Console. `npm run doctor` aponta exatamente qual é o problema.

**No Render, as imagens somem depois de um tempo**
Esperado: o disco do Render não persiste. Configure as chaves `CLOUDINARY_*` para as imagens
irem para a nuvem.

**404 ao atualizar a página em `/admin/posts`**
O fallback para `index.html` só é registrado quando `client/dist` existe. Garanta que o
build rodou (`npm run build`) — no Render isso é o Build Command.

**O painel pede login novamente toda hora**
O token expira em 7 dias (`JWT_EXPIRES_IN`). Se `JWT_SECRET` mudar, todos os tokens são
invalidados — mantenha o mesmo valor entre deploys.

**Tela em branco depois do deploy**
Confira os logs do Render: normalmente é `DATABASE_URL` ausente ou falha na migração.
O endpoint `/api/health` deve retornar `{"ok":true}`.

**Esqueci a senha do administrador**
Defina `ADMIN_PASSWORD` com a nova senha e `ADMIN_PASSWORD_SYNC=true`, faça o redeploy,
entre no painel e depois remova o `ADMIN_PASSWORD_SYNC`.

---

## Licença

Projeto entregue para uso livre. Personalize e publique como quiser.
