# 📋 Regras do Repositório

Leia antes de começar a contribuir com o projeto.

---

## 🔒 Regra principal

**Ninguém commita direto na branch `main`.**

A `main` é a versão oficial do projeto. Ela só recebe código revisado e funcionando.

---

## 🌿 Como trabalhar

### 1. Antes de começar qualquer coisa

Sempre puxe a versão mais recente do projeto:

```bash
git pull origin main
```

### 2. Crie uma branch para o seu trabalho

O nome da branch deve ser claro e descrever o que você está fazendo:

```bash
git checkout -b feature/nome-da-funcionalidade
```

**Exemplos de nomes:**
- `feature/tela-upload`
- `feature/chat-interface`
- `feature/integracao-api`
- `fix/correcao-botao-envio`

### 3. Faça seus commits com mensagens claras

```bash
git add .
git commit -m "Adiciona tela de upload de arquivos"
```

Mensagens de commit devem descrever **o que foi feito**, não "atualização" ou "ajustes".

### 4. Suba sua branch

```bash
git push origin feature/nome-da-funcionalidade
```

### 5. Abra um Pull Request

- Acesse o repositório no GitHub
- Clique em **"Compare & pull request"**
- Descreva brevemente o que foi feito
- Avise no grupo que abriu um PR para revisão

### 6. Aguarde revisão antes de fazer o merge

Luiz Gabriel ou Pedro Roberto vai revisar. Só após aprovação o código entra na `main`.

---

## ⚠️ Regras importantes

- Nunca force um push na `main` (`git push --force`)
- Não suba arquivos desnecessários (node_modules, .env, etc.), o `.gitignore` já cuida disso
- Se tiver dúvida se algo está pronto para subir, avise no grupo antes
- Evite mexer nas pastas do outro grupo sem avisar.