# 🤝 Guia de Contribuição — GuIA Assistente Educacional

Leia este guia **antes de começar qualquer tarefa**. Ele define como o time
trabalha junto no repositório para evitar conflitos, perda de código e
retrabalho.

---

## 👥 Responsabilidades no repositório

| Pessoa | Papel |
|---|---|
| **Gabriel (você)** | Dono do repositório — cria branches, revisa PRs, aprova merges |
| **Rejane** | Contribuidora — integração com API e upload |
| **Mariah** | Contribuidora — extração de texto e explicações |
| **Pedro** | Documentação — mantém `/docs`, README e Prompt Ops |
| **Mayara** | QA — abre issues de bug, mantém `/docs/testes.md` |

---

## 🔒 Regra principal

**Ninguém commita direto na `main` ou na `develop`.**

| Branch | Descrição |
|---|---|
| `main` | Versão estável e entregável. Só recebe merge de `develop` ao fim de cada sprint. |
| `develop` | Branch de integração. Recebe os PRs das features da sprint. |
| `feat/*` | Novas funcionalidades (uma por tarefa do Jira). |
| `fix/*` | Correção de bugs reportados. |
| `docs/*` | Alterações exclusivamente de documentação. |

---

## 🌿 Fluxo de trabalho passo a passo

### 1. Antes de começar qualquer tarefa

Sempre atualize sua cópia local a partir da `develop`:

```bash
git checkout develop
git pull origin develop
```

> ⚠️ **Nunca** parta da `main` para criar uma branch de feature.

---

### 2. Crie uma branch para a sua tarefa
O nome da branch deve seguir o padrão: 
**Exemplos reais do projeto:**

```bash
git checkout -b feat/tela-upload-gabriel
git checkout -b feat/extrator-pdf-mariah
git checkout -b feat/api-resumo-rejane
git checkout -b feat/chat-contextual-rejane
git checkout -b fix/validacao-arquivo-mariah
git checkout -b docs/prompt-ops-sprint2-pedro
git checkout -b docs/testes-us04-mayara
```

> 💡 O sufixo com o nome evita conflitos quando duas pessoas mexem em áreas parecidas.

---

### 3. Faça commits com mensagens padronizadas

Use o prefixo que descreve o tipo de mudança:

```bash
git commit -m "feat: adiciona componente de upload com drag-and-drop"
git commit -m "fix: corrige validação de tipo de arquivo .jpg"
git commit -m "style: ajusta cores do botão conforme wireframe"
git commit -m "docs: adiciona prompt-ops da sprint 2"
git commit -m "test: registra resultados dos testes de US04 e US05"
git commit -m "refactor: extrai lógica de chunking para arquivo separado"
```

| Prefixo | Quando usar |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `style:` | Mudança visual, CSS, formatação |
| `docs:` | Documentação, README, Prompt Ops |
| `test:` | Testes manuais ou registro de resultados |
| `refactor:` | Melhoria de código sem mudar comportamento |
| `chore:` | Tarefas de configuração (gitignore, .env.example) |

> ❌ Evite mensagens vagas como `"atualização"`, `"ajustes"` ou `"wip"`.

---

### 4. Suba sua branch

```bash
git push origin feat/nome-da-sua-branch
```

---

### 5. Abra um Pull Request para `develop`

- Acesse o repositório no GitHub
- Clique em **"Compare & pull request"**
- Preencha o título seguindo o mesmo padrão dos commits
- Na descrição, responda:
  - **O que foi feito?** (resumo da tarefa)
  - **Como testar?** (passos para validar)
  - **Tarefa relacionada no Jira:** (ex: KAN-12)
- Marque **Gabriel** como revisor
- Avise no grupo que o PR está aberto

**Exemplo de descrição de PR:**

---

### 6. Aguarde a revisão

- **Gabriel** revisa e aprova ou solicita ajustes
- Se houver pedido de ajuste, faça as correções na mesma branch e faça novo push — o PR atualiza automaticamente
- Só após aprovação o código entra na `develop`

---

### 7. Fim de sprint — merge para `main`

Ao fim de cada sprint, **Gabriel** faz o merge de `develop` para `main`:

```bash
git checkout main
git merge develop
git push origin main
```

Esse merge dispara o deploy automático no Azure Static Web Apps.

---

## ⚠️ Regras importantes

- **Nunca** use `git push --force` em `main` ou `develop`
- **Nunca** suba o arquivo `.env` com a chave da API — o `.gitignore` já bloqueia, mas fique atento
- Se tiver dúvida se algo está pronto para subir, avise no grupo antes de abrir o PR
- Não altere arquivos de outra pessoa sem combinar antes — se precisar, abra uma issue ou converse no grupo
- **Mariah:** antes de abrir um PR, peça para Rejane dar uma olhada no código — ela pode te ajudar a pegar algo antes da revisão oficial

---

## 🐛 Como reportar um bug (Mayara e demais)

1. Abra uma **Issue** no GitHub com o título: `[BUG] Descrição curta do problema`
2. Descreva: o que aconteceu, o que era esperado e como reproduzir
3. Se possível, adicione um print ou mensagem de erro do console
4. Gabriel ou a pessoa responsável pela área abre uma branch `fix/` para corrigir

---

## 📁 O que não deve ir para o repositório

O `.gitignore` já está configurado, mas é bom saber o motivo:

| Arquivo/pasta | Motivo |
|---|---|
| `.env` | Contém a chave da API — nunca expor publicamente |
| `node_modules/` | Dependências instaladas localmente, não versionadas |
| `.DS_Store` | Arquivo interno do macOS, sem utilidade no projeto |
| `Thumbs.db` | Arquivo interno do Windows |

---

## 🙋 Dúvidas?

Antes de fazer qualquer coisa que não está descrita aqui, avise no grupo.
É melhor perguntar do que reverter um merge quebrado. 😄
