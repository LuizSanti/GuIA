// [Sprint 2] US04 — Integração com API de IA: geração de conteúdo automático por chunks.
// [Sprint 2] US05 — Geração de perguntas de revisão (acao: 'revisao')
// [Sprint 3] US06 — Explicações simplificadas (acao: 'simplificar')
// [Sprint 3] US24 — Timeout nas chamadas à API (30s)
// [Sprint 3] US25 — Detecção de resposta vazia
// Responsável: Rejane e Mariah

'use strict';

// Chama o proxy do servidor — a chave fica no .env do backend, nunca exposta.
const API_URL = '/api/groq';

function obterModelo() {
    return localStorage.getItem('guia_model') || MODELO_PADRAO;
}

function obterHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const customKey = localStorage.getItem('guia_api_key');
    if (customKey) {
        headers['Authorization'] = `Bearer ${customKey}`;
    }
    return headers;
}

// Tempo máximo de espera por resposta da API (ms)
const API_TIMEOUT_MS = 30000;

const SYSTEM_PROMPT = `Você é um assistente especializado em análise de documentos acadêmicos.
REGRAS OBRIGATÓRIAS — siga-as sem exceção:
1. Responda SEMPRE em português brasileiro.
2. Baseie-se EXCLUSIVAMENTE no texto fornecido pelo usuário — nunca acrescente informações externas.
3. Não invente fatos, exemplos, citações ou dados que não estejam explicitamente no texto.
4. Seja claro, objetivo e profissional.
5. Use a formatação Markdown especificada no prompt: ## para títulos de seção, **texto** para negrito, • para listas.`;

function montarPromptChunk(texto, acao) {
    const comandos = {
        'resumo': `Com base EXCLUSIVAMENTE no texto abaixo, escreva um resumo detalhado em português brasileiro.
Formate a saída EXATAMENTE assim (use estes marcadores, não outros):
TÍTULO: <insira aqui o tema principal em maiúsculas>
## Introdução
Texto corrido do parágrafo introdutório.
## Desenvolvimento
• **Conceito importante:** explicação direta.
• **Outro conceito:** explicação direta.
## Conclusão
Texto corrido do parágrafo conclusivo.
Não adicione informações externas. Texto:`,

        'quiz': `Com base EXCLUSIVAMENTE no texto abaixo, crie um quiz em português brasileiro.
Formate a saída EXATAMENTE assim:
## QUIZ
**Q1.** Pergunta?
a) opção  b) opção  c) opção  d) opção
**Q2.** Pergunta?
a) opção  b) opção  c) opção  d) opção
**Q3.** Pergunta?
a) opção  b) opção  c) opção  d) opção
**Q4.** Pergunta?
a) opção  b) opção  c) opção  d) opção
**Q5.** Pergunta?
a) opção  b) opção  c) opção  d) opção
## GABARITO
**Q1:** letra — justificativa breve.
**Q2:** letra — justificativa breve.
**Q3:** letra — justificativa breve.
**Q4:** letra — justificativa breve.
**Q5:** letra — justificativa breve.
Não invente perguntas sobre conteúdo ausente. Texto:`,

        'pontos': `Com base EXCLUSIVAMENTE no texto abaixo, liste os pontos principais em português brasileiro.
Formate a saída EXATAMENTE assim:
## PONTOS-CHAVE
• **Tema:** descrição objetiva em uma frase.
• **Tema:** descrição objetiva em uma frase.
(repita para todos os pontos relevantes; agrupe por subtema se houver mais de 5)
Não inclua informações que não estejam no texto. Texto:`,

        'questionario': `Com base EXCLUSIVAMENTE no texto abaixo, crie um guia de perguntas e respostas em português brasileiro.
Formate a saída EXATAMENTE assim:
## QUESTIONÁRIO (grande e em negrito)

em negrito - **Pergunta 1:** texto da pergunta? 

em negrito - **Pergunta 2:** texto da pergunta?


## RESPOSTAS (NO FINAL)

em negrito - **Resposta:** texto da resposta.

em negrito -**Resposta:** texto da resposta.
(continue para todas as perguntas relevantes)
Use somente o que está no texto. Texto:`,

        'revisao': `Com base EXCLUSIVAMENTE no texto abaixo, crie exatamente 5 perguntas de revisão em português brasileiro.
Critérios:
- Varie o nível: 2 perguntas simples (recall), 2 de compreensão, 1 de aplicação.
- Todas devem ser respondíveis apenas com o conteúdo do texto.
- Não crie alternativas — apenas as perguntas abertas.
Formate a saída EXATAMENTE assim:
## PERGUNTAS DE REVISÃO
**1.** Texto da primeira pergunta?
**2.** Texto da segunda pergunta?
**3.** Texto da terceira pergunta?
**4.** Texto da quarta pergunta?
**5.** Texto da quinta pergunta?
Texto:`,

        'simplificar': `Com base EXCLUSIVAMENTE no texto abaixo, reescreva o conteúdo em linguagem simples e acessível em português brasileiro.
Regras:
- Substitua termos técnicos por explicações diretas (ex: "homeostase" → "equilíbrio do corpo").
- Mantenha todas as informações do texto original — não omita nada.
- Use frases curtas e parágrafos pequenos.
- Fidelidade total ao conteúdo: não adicione nem invente informações.
Formate a saída EXATAMENTE assim:
## TEXTO SIMPLIFICADO
Parágrafo 1 simplificado.

Parágrafo 2 simplificado.
(continue para todo o conteúdo)
Texto:`
    };

    const cmd = comandos[acao] || comandos['resumo'];
    return `${cmd}\n\n"${texto}"`;
}

// ─── Fetch com timeout ────────────────────────────────────────────────────────
//
// Cria um AbortController e dispara um timer de API_TIMEOUT_MS.
// Se a API não responder a tempo, o controller aborta o fetch,
// o que lança um DOMException com name === 'AbortError'.
// O chamador (chamarAPI) captura esse erro e relança como ErroGuIA
// com tipo 'timeout', que o index.js traduz para mensagem amigável.

async function fetchComTimeout(url, opcoes) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const resposta = await fetch(url, { ...opcoes, signal: controller.signal });
        return resposta;
    } catch (erro) {
        if (erro.name === 'AbortError') {
            throw new ErroGuIA('timeout');
        }
        throw erro;
    } finally {
        clearTimeout(timer);
    }
}

// ─── Classe de erro tipado ────────────────────────────────────────────────────
//
// Permite que o index.js distinga o tipo de falha sem parsear strings.
// Tipos possíveis: 'timeout' | 'resposta_vazia' | 'api' | 'desconhecido'

class ErroGuIA extends Error {
    constructor(tipo, detalhe = '') {
        super(detalhe || tipo);
        this.tipo   = tipo;
        this.detalhe = detalhe;
    }
}

// ─── Chamada principal à API ──────────────────────────────────────────────────

async function chamarAPI(promptUsuario) {
    const payload = {
        model: obterModelo(),
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: promptUsuario  }
        ],
        temperature: 0.3,
        max_tokens: 800
    };

    const resposta = await fetchComTimeout(API_URL, {
        method: 'POST',
        headers: obterHeaders(),
        body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
        const erroJson = await resposta.json().catch(() => ({}));
        throw new ErroGuIA('api', erroJson.error?.message || resposta.statusText);
    }

    const dados = await resposta.json();
    const conteudo = dados.choices?.[0]?.message?.content?.trim();

    // US25 — resposta vazia: API respondeu 200 mas não gerou texto útil
    if (!conteudo) {
        throw new ErroGuIA('resposta_vazia');
    }

    return conteudo;
}

// ─── Chamada dedicada para o chat contextual (US08/US09) ─────────────────────

async function chamarAPIChat(mensagens) {
    const payload = {
        model: obterModelo(),
        messages: mensagens,
        temperature: 0.4,
        max_tokens: 600
    };

    const resposta = await fetchComTimeout(API_URL, {
        method: 'POST',
        headers: obterHeaders(),
        body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
        const erroJson = await resposta.json().catch(() => ({}));
        throw new ErroGuIA('api', erroJson.error?.message || resposta.statusText);
    }

    const dados = await resposta.json();
    const conteudo = dados.choices?.[0]?.message?.content?.trim();

    if (!conteudo) {
        throw new ErroGuIA('resposta_vazia');
    }

    return conteudo;
}

// ─── Geração de conteúdo por chunks ──────────────────────────────────────────

async function gerarConteudoIA(chunks, acao, { onProgresso } = {}) {
    const resultadosParciais = [];

    for (let i = 0; i < chunks.length; i++) {
        if (onProgresso) onProgresso(i + 1, chunks.length);
        const prompt    = montarPromptChunk(chunks[i], acao);
        const resultado = await chamarAPI(prompt);
        resultadosParciais.push(resultado);
    }

    const resultadoFinal = resultadosParciais.length === 1
        ? resultadosParciais[0]
        : await chamarAPI(
            `Consolide os trechos abaixo em um único resultado coeso em português brasileiro.\n` +
            `Mantenha toda a formatação Markdown (##, **, •) presente nos trechos.\n` +
            `Use APENAS as informações presentes nos trechos. Não adicione nada externo.\n\n` +
            resultadosParciais.join('\n\n')
          );

    return { resultadoFinal };
}

if (!window.GuIA) window.GuIA = {};
window.GuIA.resumo = { gerarConteudoIA, chamarAPIChat };