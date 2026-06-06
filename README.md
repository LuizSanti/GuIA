# GuIA — Inteligência Documental

Assistente Educacional com IA para análise de arquivos PDF e TXT. Aplicação web que utiliza inteligência artificial para auxiliar estudantes e professores na compreensão de conteúdos acadêmicos.

> **Residência Porto Digital — RISEUP | Avanade | Squad 5 | 2026.1**

-----

## Descrição do Projeto

O usuário faz upload de um PDF ou TXT e recebe automaticamente, via IA:

- Resumo estruturado do conteúdo
- Quiz de múltipla escolha com gabarito
- Extração de pontos-chave
- Perguntas de revisão abertas
- Simplificação de linguagem técnica
- Chat interativo com o documento

-----

## Acesso ao Sistema

O sistema está disponível publicamente. Nenhuma configuração é necessária — basta acessar:

```
guia-app-h5hue0bgg0f8cpem.centralus-01.azurewebsites.net
```

> A chave de API já está configurada no servidor. Não é necessário nenhuma configuração adicional.

-----

## Estrutura de Pastas

```
GuIA/
├── .github/
│   └── workflows/
│       └── azure-deploy.yml        # Pipeline de deploy automático no Azure
├── backend/
│   └── server.js                   # Proxy seguro para chamadas à API GroqCloud
├── src/
│   └── assets/
│       ├── css/
│       │   ├── responsive.css      # Estilos de responsividade (mobile/desktop)
│       │   ├── results.css         # Estilos da página de resultados
│       │   ├── style.css           # Estilos globais da aplicação
│       │   └── upload.css          # Estilos da área de upload
│       ├── images/
│       │   ├── arquivo-analise.png # Ícone de análise de arquivo
│       │   ├── arquivo-erro.png    # Ícone de erro no arquivo
│       │   ├── logo-guia.png       # Logo principal do GuIA
│       │   └── logo-icon.png       # Ícone reduzido do GuIA
│       ├── js/
│       │   ├── config.js           # Configurações globais da aplicação
│       │   ├── extractor.js        # Extração de texto de arquivos PDF e TXT
│       │   ├── historico.js        # Gerenciamento do histórico do chat
│       │   ├── index.js            # Controlador principal da aplicação
│       │   ├── resumo.js           # Prompts e chamadas à API GroqCloud
│       │   ├── textProcessor.js    # Processamento e divisão em chunks
│       │   └── upload.js           # Gerenciamento do upload de arquivos
│       └── pages/
│           ├── erro.html           # Página de erro
│           ├── processamentos.html # Página de carregamento
│           └── resultados.html     # Página de exibição dos resultados
├── .gitignore
├── DEPLOY.md
├── README.md
├── contributing.md
├── index.html                      # Página principal da aplicação
├── package.json
└── package-lock.json
```

-----

## Decisões Técnicas — Sprint 1

### 1. Biblioteca de leitura de PDF: pdf.js

Foi escolhida a biblioteca **pdf.js** (Mozilla) para extração de texto dos arquivos PDF enviados pelos usuários.

**Motivos da escolha:**

- Roda 100% no navegador, sem necessidade de backend para leitura do arquivo
- Código aberto, mantido ativamente pela Mozilla
- Suporte a múltiplos formatos de PDF
- Amplamente documentada e com grande comunidade

**Limitação identificada:** PDFs gerados a partir de imagens escaneadas não possuem camada de texto legível. Para o MVP, este tipo de arquivo exibirá mensagem de erro amigável. Suporte a OCR previsto para versão futura.

-----

### 2. Estratégia de Chunking

Documentos longos ultrapassam o limite de tokens da API. O texto extraído é dividido em **partes menores (chunks)** antes de ser enviado à API GroqCloud.

**Estratégia adotada:**

- Divisão por limite de tokens (~4000 tokens por chunk)
- Cada chunk é processado separadamente pela IA
- Os resultados parciais são consolidados em um único documento coeso
- Implementado em `src/assets/js/textProcessor.js`

-----

### 3. Segurança da Chave de API

A chave de API do GroqCloud é armazenada no servidor (`backend/server.js`) e **nunca exposta ao front-end**. O front-end faz chamadas para o endpoint `/api/groq` do próprio servidor, que age como proxy seguro.

```
Front-end → /api/groq (backend) → GroqCloud API
```

-----

### 4. API de IA utilizada

|Item       |Detalhe                           |
|-----------|----------------------------------|
|Provedor   |GroqCloud                         |
|Modelo     |`llama-3.1-8b-instant`            |
|Endpoint   |`/api/groq` (via proxy no backend)|
|Timeout    |30 segundos (AbortController)     |
|Temperatura|0.3 (respostas mais consistentes) |
|Max tokens |800 por chamada                   |

-----

### 5. Configuração do Repositório GitHub

- **Repositório:** [github.com/LuizSanti/GuIA](https://github.com/LuizSanti/GuIA)
- **Branch principal:** `main`
- **Visibilidade:** Público
- **CI/CD:** GitHub Actions — cada push na branch `main` aciona deploy automático no Azure

-----

## Deploy — Azure Web Apps

- **URL pública:** `guia-app-h5hue0bgg0f8cpem.centralus-01.azurewebsites.net`
- **Plano:** Free
- **Pipeline:** push na `main` → GitHub Actions (`azure-deploy.yml`) → build → deploy automático

-----

## Personas do Projeto

|Persona          |Perfil                           |Necessidade                                   |
|-----------------|---------------------------------|----------------------------------------------|
|Lucas Ferreira   |Estudante de ADS, 19 anos        |Resumir PDFs rapidamente antes das provas     |
|Ana Beatriz Souza|Aluna do ENEM, 16 anos           |Resumo claro e perguntas objetivas de revisão |
|Marcos Andrade   |Professor de informática, 38 anos|Gerar resumos e questionários a partir de PDFs|

-----

## Cenários de Falha Conhecidos

|Cenário                        |Comportamento esperado                                          |
|-------------------------------|----------------------------------------------------------------|
|PDF escaneado (sem texto)      |Mensagem de erro amigável orientando o usuário                  |
|Arquivo corrompido ou protegido|Mensagem de erro com instruções                                 |
|Documento muito longo          |Chunking automático (~4000 tokens por parte)                    |
|Timeout na API (>30s)          |AbortController cancela a requisição com mensagem de erro       |
|Resposta vazia da API          |Erro tipado `ErroGuIA('resposta_vazia')` com mensagem ao usuário|

-----

## MVP — Funcionalidades Priorizadas

- [x] Upload de arquivo PDF/TXT
- [x] Extração de texto via pdf.js
- [x] Geração de resumo automático via IA
- [x] Quiz de múltipla escolha com gabarito
- [x] Extração de pontos-chave
- [x] Perguntas de revisão abertas
- [x] Simplificação de texto técnico
- [x] Chat interativo com o documento
- [ ] Suporte a PDFs escaneados via OCR *(versão futura)*
- [ ] Flashcards com revisão espaçada *(versão futura)*
- [ ] Funcionalidades do professor *(versão futura)*
- [ ] Autenticação de usuário *(versão futura)*

-----

## Como Atualizar o Projeto

```bash
# 1. Faça as alterações nos arquivos localmente
# 2. Abra o terminal na pasta do projeto
cd caminho/para/GuIA

# 3. Envie as alterações
git add .
git commit -m "descreva o que mudou"
git push
```

O site atualiza automaticamente em ~2 minutos após o push. ✅

-----

## Squad 5

|Membro         |Responsabilidade                                       |
|---------------|-------------------------------------------------------|
|Luiz Gabriel   |Scrum Master, Tech Lead e Desenvolvedor Front-End      |
|Pedro Roberto  |Configuração do repositório, deploy Azure, documentação|
|Mariah Navarro |Desenvolvedora Front-End, integração com API GroqCloud |
|Rejane Ferreira|Desenvolvedora Front-End, integração com API GroqCloud |
|Mayara Marina  |QA e Design da interface                               |
|Mariana        |Design e Desenvolvedora Front-End                      |
|Lorena         |Design e Desenvolvedora Front-End                      |