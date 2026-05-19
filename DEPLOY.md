# GuIA — Como rodar com backend (chave protegida)

## Por que isso foi feito?

O projeto original colocava a chave da Groq no `config.js`, que ficava exposto
no browser para qualquer pessoa ver. Agora a chave fica **apenas no servidor**,
em um arquivo `.env` que nunca vai pro Git.

O fluxo ficou assim:

```
Browser  →  POST /api/groq  →  Servidor Node.js  →  API Groq
                               (injeta a chave aqui)
```

---

## Rodando localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o arquivo `.env`

```bash
cp .env.example .env
```

Abra o `.env` e coloque sua chave real:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
PORT=3000
```

### 3. Iniciar o servidor

```bash
npm start
```

Acesse **http://localhost:3000** — o GuIA vai abrir normalmente, sem pedir chave.

---

## Deploy em produção (Render, Railway, Fly.io etc.)

Todas essas plataformas têm um painel de **variáveis de ambiente**. Basta:

1. Fazer push do projeto **sem o `.env`** (ele já está no `.gitignore`)
2. No painel da plataforma, adicionar a variável `GROQ_API_KEY` com sua chave
3. A plataforma injeta a variável automaticamente ao subir o servidor

### Render (gratuito)

1. Crie um **Web Service** apontando para o repositório
2. Build command: `npm install`
3. Start command: `npm start`
4. Em **Environment** → add `GROQ_API_KEY`

### Railway

1. `railway init` na pasta do projeto
2. `railway up`
3. Adicione `GROQ_API_KEY` em **Variables**

---

## O que mudou no código

| Arquivo | O que foi alterado |
|---|---|
| `src/assets/js/config.js` | Removida a chave; agora só tem `USE_BACKEND_PROXY: true` |
| `src/assets/js/resumo.js` | `API_URL` mudou de `api.groq.com` para `/api/groq`; removido o header `Authorization` |
| `src/assets/js/index.js` | Removida a função `obterApiKey()` e todas as referências a `apiKey` |
| `backend/server.js` | **Novo arquivo** — servidor Express que injeta a chave e faz proxy das chamadas |
| `package.json` | **Novo arquivo** — dependências do servidor (express, cors, dotenv) |
| `.env.example` | **Novo arquivo** — template para o `.env` local |

---

## Segurança

- O `.env` está no `.gitignore` — nunca vai pro repositório
- O browser **nunca vê** a chave; ela só existe na memória do servidor
- Se precisar rotacionar a chave, basta trocar no `.env` ou no painel da plataforma
