/**
 * textProcessor.js
 * Sprint 2 — Pipeline de preparação de texto
 * Responsável: Rejane
 *
 * Funções exportadas:
 *   prepararTexto(textoRaw)  → { textoLimpo, chunks }
 *   limparTexto(texto)       → string
 *   normalizarTexto(texto)   → string
 *   dividirEmChunks(texto)   → string[]
 *
 * Critérios de aceite:
 *   - Chunks entre 500 e 1000 tokens (aprox. 375–750 palavras)
 *   - Nenhum chunk vazio
 *   - Nenhum chunk cortado no meio de uma frase
 */

'use strict';

// ─── Configuração ──────────────────────────────────────────────────────────────

const CHUNK_CONFIG = {
    MIN_WORDS: 375,   // ~500 tokens  (1 token ≈ 0,75 palavra)
    MAX_WORDS: 750,   // ~1000 tokens
    TARGET_WORDS: 560, // alvo padrão: ~750 tokens
};

// ─── 1. Limpeza ────────────────────────────────────────────────────────────────

/**
 * Remove artefatos comuns de extração de PDF:
 *  - Cabeçalhos e rodapés repetidos (linhas idênticas que aparecem ≥ 3 vezes)
 *  - Caracteres de controle e símbolos estranhos (exceto pontuação normal)
 *  - Hifens de quebra de linha (word- \nwrap → wordwrap)
 *  - Números de página isolados (linhas que só contêm dígitos)
 * @param {string} texto
 * @returns {string}
 */
function limparTexto(texto) {
    if (!texto || typeof texto !== 'string') return '';

    // 1a. Normaliza quebras de linha para \n
    let resultado = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 1b. Remove hifens de quebra de linha: "pala-\nvra" → "palavra"
    resultado = resultado.replace(/-\n(\S)/g, '$1');

    // 1c. Remove linhas que contêm apenas números (números de página)
    resultado = resultado.replace(/^\s*\d+\s*$/gm, '');

    // 1d. Remove caracteres de controle e caracteres estranhos
    //     Mantém letras, dígitos, pontuação básica, acentos e espaços
    resultado = resultado.replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, ' ');

    // 1e. Detecta e remove cabeçalhos/rodapés repetidos
    //     (qualquer linha não vazia que aparece 3 ou mais vezes)
    resultado = removerLinhasRepetidas(resultado, 3);

    return resultado;
}

/**
 * Remove linhas que se repetem `limiar` ou mais vezes no documento.
 * @param {string} texto
 * @param {number} limiar - número mínimo de repetições para remover
 * @returns {string}
 */
function removerLinhasRepetidas(texto, limiar = 3) {
    const linhas = texto.split('\n');
    const contagem = new Map();

    for (const linha of linhas) {
        const chave = linha.trim();
        if (chave.length > 3) { // ignora linhas muito curtas
            contagem.set(chave, (contagem.get(chave) || 0) + 1);
        }
    }

    const linhasFiltradas = linhas.filter(linha => {
        const chave = linha.trim();
        return chave.length <= 3 || (contagem.get(chave) || 0) < limiar;
    });

    return linhasFiltradas.join('\n');
}

// ─── 2. Normalização ───────────────────────────────────────────────────────────

/**
 * Normaliza espaçamento e quebras de linha:
 *  - Colapsa múltiplos espaços/tabs em um único espaço
 *  - Colapsa mais de duas quebras de linha consecutivas em duas
 *  - Remove espaços no início/fim de cada linha
 *  - Remove espaços antes de pontuação
 * @param {string} texto
 * @returns {string}
 */
function normalizarTexto(texto) {
    if (!texto || typeof texto !== 'string') return '';

    let resultado = texto;

    // 2a. Espaços e tabs → um único espaço (exceto quebras de linha)
    resultado = resultado.replace(/[^\S\n]+/g, ' ');

    // 2b. Espaço no início e fim de cada linha
    resultado = resultado.replace(/^ +| +$/gm, '');

    // 2c. Mais de duas quebras consecutivas → parágrafo duplo
    resultado = resultado.replace(/\n{3,}/g, '\n\n');

    // 2d. Espaço antes de pontuação: "palavra ." → "palavra."
    resultado = resultado.replace(/ ([.,;:!?])/g, '$1');

    // 2e. Remove espaços no início e fim do texto completo
    resultado = resultado.trim();

    return resultado;
}

// ─── 3. Chunking ───────────────────────────────────────────────────────────────

/**
 * Divide o texto em chunks de 500–1000 tokens respeitando fronteiras de frase.
 *
 * Estratégia:
 *  1. Divide em sentenças (. ! ?)
 *  2. Acumula sentenças até atingir o alvo (TARGET_WORDS)
 *  3. Antes de fechar um chunk, tenta não ultrapassar MAX_WORDS
 *  4. Nenhum chunk fica abaixo de MIN_WORDS (exceto o último, que é fundido
 *     com o anterior caso seja muito pequeno)
 *
 * @param {string} texto - texto já limpo e normalizado
 * @returns {string[]} array de chunks
 */
function dividirEmChunks(texto) {
    if (!texto || typeof texto !== 'string') return [];

    const sentencas = segmentarEmSentencas(texto);
    if (sentencas.length === 0) return [];

    const chunks = [];
    let acumulado = [];
    let palavrasAcumuladas = 0;

    for (let i = 0; i < sentencas.length; i++) {
        const sentenca = sentencas[i];
        const palavrasSentenca = contarPalavras(sentenca);

        // Caso extremo: sentença única maior que MAX_WORDS → chunk próprio
        if (palavrasSentenca >= CHUNK_CONFIG.MAX_WORDS) {
            if (acumulado.length > 0) {
                chunks.push(acumulado.join(' ').trim());
                acumulado = [];
                palavrasAcumuladas = 0;
            }
            chunks.push(sentenca.trim());
            continue;
        }

        acumulado.push(sentenca);
        palavrasAcumuladas += palavrasSentenca;

        // Verifica se deve fechar o chunk
        const deveFechar =
            palavrasAcumuladas >= CHUNK_CONFIG.TARGET_WORDS &&
            palavrasAcumuladas >= CHUNK_CONFIG.MIN_WORDS;

        const vaiUltrapassar =
            i + 1 < sentencas.length &&
            palavrasAcumuladas + contarPalavras(sentencas[i + 1]) > CHUNK_CONFIG.MAX_WORDS;

        if (deveFechar || vaiUltrapassar) {
            chunks.push(acumulado.join(' ').trim());
            acumulado = [];
            palavrasAcumuladas = 0;
        }
    }

    // Processa o restante
    if (acumulado.length > 0) {
        const resto = acumulado.join(' ').trim();
        if (chunks.length > 0 && contarPalavras(resto) < CHUNK_CONFIG.MIN_WORDS) {
            // Funde com o último chunk se o resto for muito pequeno
            chunks[chunks.length - 1] += ' ' + resto;
        } else {
            chunks.push(resto);
        }
    }

    // Garante que não haja chunks vazios
    return chunks.filter(c => c.trim().length > 0);
}

/**
 * Segmenta o texto em sentenças usando pontuação final.
 * Cuida de abreviações comuns para não cortar no lugar errado.
 * @param {string} texto
 * @returns {string[]}
 */
function segmentarEmSentencas(texto) {
    // Protege abreviações comuns (Dr., Sr., Art., etc.)
    const protegido = texto
        .replace(/\b(Dr|Sr|Sra|Prof|Art|Av|Pág|p|pp|vs|etc|nº|n°)\.\s/gi,
            (match) => match.replace('. ', '.<PONTO_PROTEGIDO>'));

    // Divide em sentenças
    const partes = protegido.split(/(?<=[.!?])\s+/);

    // Restaura abreviações
    return partes
        .map(s => s.replace(/<PONTO_PROTEGIDO>/g, ' ').trim())
        .filter(s => s.length > 0);
}

/**
 * Conta palavras em uma string (estimativa rápida por espaços).
 * @param {string} texto
 * @returns {number}
 */
function contarPalavras(texto) {
    return texto.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ─── 4. Pipeline principal ────────────────────────────────────────────────────

/**
 * Executa o pipeline completo: limpeza → normalização → chunking.
 *
 * @param {string} textoRaw - texto bruto vindo do extractor.js
 * @returns {{ textoLimpo: string, chunks: string[], stats: object }}
 */
function prepararTexto(textoRaw) {
    if (!textoRaw || typeof textoRaw !== 'string') {
        return { textoLimpo: '', chunks: [], stats: { totalChunks: 0, palavrasTotal: 0 } };
    }

    const textoPosLimpeza     = limparTexto(textoRaw);
    const textoPosNormalizacao = normalizarTexto(textoPosLimpeza);
    const chunks               = dividirEmChunks(textoPosNormalizacao);

    const stats = {
        totalChunks:   chunks.length,
        palavrasTotal: contarPalavras(textoPosNormalizacao),
        mediaTokensChunk: chunks.length > 0
            ? Math.round((contarPalavras(textoPosNormalizacao) / chunks.length) / 0.75)
            : 0,
        chunksVazios: chunks.filter(c => !c.trim()).length,
    };

    return {
        textoLimpo: textoPosNormalizacao,
        chunks,
        stats,
    };
}

// ─── 5. Expõe ao escopo global (mesmo padrão do projeto) ──────────────────────

window.GuIA = window.GuIA || {};
window.GuIA.textProcessor = {
    prepararTexto,
    limparTexto,
    normalizarTexto,
    dividirEmChunks,
};