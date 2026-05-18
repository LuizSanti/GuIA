// historico.js
// Gerencia o histórico de documentos processados, salvando e lendo do localStorage.
// Outros módulos interagem via window.GuIA.historico.

'use strict';

const HISTORICO_KEY    = 'guia_historico';
const HISTORICO_LIMITE = 20; // máximo de entradas salvas

// ─── Leitura e escrita ────────────────────────────────────────────────────────

function carregarHistorico() {
    try {
        return JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
    } catch {
        return [];
    }
}

function salvarHistorico(lista) {
    localStorage.setItem(HISTORICO_KEY, JSON.stringify(lista));
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Adiciona uma entrada ao histórico.
 * Chamado pelo index.js após processamento bem-sucedido.
 *
 * @param {{ fileName: string, fileType: string, fileSize: number }} uploadState
 * @param {string} acao    - 'resumo' | 'quiz' | 'pontos' | etc.
 * @param {string} resultado - texto gerado pela IA
 */
function adicionarEntrada(uploadState, acao, resultado) {
    const lista = carregarHistorico();

    const entrada = {
        id:        Date.now(),
        fileName:  uploadState.fileName,
        fileType:  uploadState.fileType,
        fileSize:  uploadState.fileSize,
        acao,
        resultado,
        data:      new Date().toISOString(),
    };

    // Insere no início (mais recente primeiro) e limita o tamanho
    lista.unshift(entrada);
    if (lista.length > HISTORICO_LIMITE) lista.splice(HISTORICO_LIMITE);

    salvarHistorico(lista);
}

/**
 * Remove uma entrada pelo id.
 * @param {number} id
 */
function removerEntrada(id) {
    const lista = carregarHistorico().filter(e => e.id !== id);
    salvarHistorico(lista);
    renderizarTelaHistorico();
}

/**
 * Apaga todo o histórico.
 */
function limparHistorico() {
    localStorage.removeItem(HISTORICO_KEY);
    renderizarTelaHistorico();
}

// ─── Formatação ───────────────────────────────────────────────────────────────

const LABEL_ACAO = {
    resumo:       'Resumo',
    quiz:         'Quiz',
    pontos:       'Pontos-chave',
    questionario: 'Questionário',
    revisao:      'Perguntas de Revisão',
    simplificar:  'Texto Simplificado',
};

function formatarData(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' às '
        + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarTamanho(bytes) {
    return bytes < 1024 * 1024
        ? (bytes / 1024).toFixed(1) + ' KB'
        : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── Renderização da tela de histórico ───────────────────────────────────────

/**
 * Monta e exibe a tela de histórico no #screen-history.
 * Chamado ao clicar no botão "Histórico" do menu lateral.
 */
function renderizarTelaHistorico() {
    const container = document.getElementById('screen-history');
    if (!container) return;

    const lista = carregarHistorico();

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="card card-center">
                <span class="material-symbols-outlined" style="font-size:48px;color:var(--text-muted)">history</span>
                <h2 style="color:var(--text-muted);font-size:16px;font-weight:600;margin-top:12px;">
                    Nenhum documento processado ainda
                </h2>
                <p style="color:var(--text-muted);font-size:14px;">
                    Faça o upload de um arquivo e processe-o para vê-lo aqui.
                </p>
            </div>
        `;
        return;
    }

    const itens = lista.map(entrada => `
        <div class="historico-item" data-id="${entrada.id}">
            <div class="historico-item__icone historico-item__icone--${entrada.fileType}">
                <span class="material-symbols-outlined">
                    ${entrada.fileType === 'pdf' ? 'picture_as_pdf' : 'text_snippet'}
                </span>
            </div>
            <div class="historico-item__info">
                <span class="historico-item__nome" title="${entrada.fileName}">
                    ${entrada.fileName}
                </span>
                <span class="historico-item__meta">
                    ${LABEL_ACAO[entrada.acao] || entrada.acao}
                    &nbsp;·&nbsp;
                    ${formatarTamanho(entrada.fileSize)}
                    &nbsp;·&nbsp;
                    ${formatarData(entrada.data)}
                </span>
            </div>
            <div class="historico-item__acoes">
                <button
                    class="btn-action"
                    style="min-width:unset;padding:8px 16px;font-size:11px;"
                    onclick="window.GuIA.historico.restaurarEntrada(${entrada.id})"
                >
                    Ver resultado
                </button>
                <button
                    class="btn-outline"
                    style="padding:8px 12px;"
                    title="Remover do histórico"
                    onclick="window.GuIA.historico.removerEntrada(${entrada.id})"
                >
                    <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
                <h1 style="font-size:18px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:var(--text);">
                    Histórico
                </h1>
                <button
                    class="btn-outline"
                    style="padding:8px 16px;font-size:11px;"
                    onclick="window.GuIA.historico.limparHistorico()"
                >
                    Limpar tudo
                </button>
            </div>
            <div class="historico-lista">
                ${itens}
            </div>
        </div>
    `;
}

/**
 * Restaura uma entrada do histórico:
 * injeta o resultado na tela de resultados e navega até ela.
 * @param {number} id
 */
function restaurarEntrada(id) {
    const lista   = carregarHistorico();
    const entrada = lista.find(e => e.id === id);
    if (!entrada) return;

    // Reaplica o resultado nas variáveis globais do index.js
    // para que os botões de download funcionem corretamente
    window.GuIA.resultadosPorAcao        = window.GuIA.resultadosPorAcao || {};
    window.GuIA.resultadosPorAcao[entrada.acao] = entrada.resultado;

    // Simula o uploadState mínimo necessário para o gerarPDF funcionar
    window.GuIA.uploadState = window.GuIA.uploadState || {};
    window.GuIA.uploadState.fileName = entrada.fileName;
    window.GuIA.uploadState.fileType = entrada.fileType;
    window.GuIA.uploadState.fileSize = entrada.fileSize;
    // chunks não é restaurado — o chat precisará de novo upload para funcionar

    // Renderiza o resultado e vai para a tela
    renderizarResultado(entrada.resultado, entrada.acao);
    showScreen('results');
}

// ─── Exposição global ─────────────────────────────────────────────────────────

window.GuIA = window.GuIA || {};
window.GuIA.historico = {
    adicionarEntrada,
    removerEntrada,
    limparHistorico,
    restaurarEntrada,
    renderizarTelaHistorico,
};