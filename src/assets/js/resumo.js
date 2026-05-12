// [Sprint 2] US04 — Integração com API de IA: geração de conteúdo automático por chunks.
// [Sprint 2] US05 — Geração de perguntas de revisão (acao: 'revisao')
// [Sprint 3] US06 — Explicações simplificadas (acao: 'simplificar')
// Responsável: Rejane e Mariah

'use strict';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO  = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `Você é um assistente especializado em análise de documentos acadêmicos.
REGRAS OBRIGATÓRIAS — siga-as sem exceção:
1. Responda SEMPRE em português brasileiro.
2. Baseie-se EXCLUSIVAMENTE no texto fornecido pelo usuário — nunca acrescente informações externas.
3. Não invente fatos, exemplos, citações ou dados que não estejam explicitamente no texto.
4. Seja claro, objetivo e profissional.
5. Use a formatação Markdown especificada no prompt: ## para títulos de seção, **texto** para negrito, • para listas.`;

// [US04/US05/US06] Prompts por ação — todos com formatação rica para o PDF
function montarPromptChunk(texto, acao) {
    const comandos = {

        // ── US04 ────────────────────────────────────────────────────────────
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
## QUESTIONÁRIO
**Pergunta 1:** texto da pergunta?
**Resposta:** texto da resposta.

**Pergunta 2:** texto da pergunta?
**Resposta:** texto da resposta.
(continue para todas as perguntas relevantes)
Use somente o que está no texto. Texto:`,

        // ── US05 ────────────────────────────────────────────────────────────
        // 5 perguntas de revisão numeradas, sem gabarito, baseadas no documento
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

        // ── US06 ────────────────────────────────────────────────────────────
        // Reescreve em linguagem acessível, sem termos técnicos desnecessários
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

async function chamarAPI(promptUsuario, apiKey) {
    const payload = {
        model: MODELO,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: promptUsuario  }
        ],
        temperature: 0.3,
        max_tokens: 800  // aumentado para acomodar formatação rica e US05/US06
    };

    const resposta = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
        const erroJson = await resposta.json();
        throw new Error(`Erro Groq: ${erroJson.error?.message || resposta.statusText}`);
    }

    const dados = await resposta.json();
    return dados.choices[0].message.content;
}

// Chamada dedicada para o chat contextual (US08/US09) — sem prompt de formatação de documento
async function chamarAPIChat(mensagens, apiKey) {
    const payload = {
        model: MODELO,
        messages: mensagens,
        temperature: 0.4,
        max_tokens: 600
    };

    const resposta = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
        const erroJson = await resposta.json();
        throw new Error(`Erro Groq: ${erroJson.error?.message || resposta.statusText}`);
    }

    const dados = await resposta.json();
    return dados.choices[0].message.content;
}

async function gerarConteudoIA(chunks, apiKey, acao, { onProgresso } = {}) {
    const resultadosParciais = [];

    for (let i = 0; i < chunks.length; i++) {
        if (onProgresso) onProgresso(i + 1, chunks.length);
        const prompt   = montarPromptChunk(chunks[i], acao);
        const resultado = await chamarAPI(prompt, apiKey);
        resultadosParciais.push(resultado);
    }

    const resultadoFinal = resultadosParciais.length === 1
        ? resultadosParciais[0]
        : await chamarAPI(
            `Consolide os trechos abaixo em um único resultado coeso em português brasileiro.\n` +
            `Mantenha toda a formatação Markdown (##, **, •) presente nos trechos.\n` +
            `Use APENAS as informações presentes nos trechos. Não adicione nada externo.\n\n` +
            resultadosParciais.join('\n\n'),
            apiKey
          );

    return { resultadoFinal };
}

if (!window.GuIA) window.GuIA = {};
window.GuIA.resumo = { gerarConteudoIA, chamarAPIChat };