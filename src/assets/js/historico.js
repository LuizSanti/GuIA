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

const CORES_BADGE = {
    resumo:       'background: rgba(42, 124, 118, 0.1); color: var(--teal); border: 1px solid rgba(42, 124, 118, 0.2);',
    quiz:         'background: rgba(59, 130, 246, 0.1); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.2);',
    pontos:       'background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2);',
    questionario: 'background: rgba(139, 92, 246, 0.1); color: #7c3aed; border: 1px solid rgba(139, 92, 246, 0.2);',
    revisao:      'background: rgba(6, 182, 212, 0.1); color: #0891b2; border: 1px solid rgba(6, 182, 212, 0.2);',
    simplificar:  'background: rgba(99, 102, 241, 0.1); color: #4f46e5; border: 1px solid rgba(99, 102, 241, 0.2);',
};

/**
 * Monta e exibe a tela de histórico no #screen-history.
 * Chamado ao clicar no botão "Histórico" do menu lateral.
 */
function renderizarTelaHistorico() {
    const emptyState = document.getElementById('history-empty-state');
    const tableContainer = document.getElementById('history-table-container');
    const tableBody = document.getElementById('history-table-body');
    
    if (!tableBody) return;

    const lista = carregarHistorico();

    if (lista.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (tableContainer) tableContainer.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';

    tableBody.innerHTML = lista.map(entrada => {
        // Estima a contagem de palavras do resultado para mostrar na tabela
        const totalPalavras = entrada.resultado ? entrada.resultado.split(/\s+/).filter(Boolean).length : 0;
        const badgeEstilo = CORES_BADGE[entrada.acao] || 'background: rgba(100, 116, 139, 0.1); color: #64748b;';

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 16px; font-weight: 600; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined" style="color: var(--teal); font-size: 20px;">
                            ${entrada.fileType === 'pdf' ? 'picture_as_pdf' : 'text_snippet'}
                        </span>
                        <span title="${entrada.fileName}">${entrada.fileName}</span>
                    </div>
                </td>
                <td style="padding: 16px;">
                    <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-block; ${badgeEstilo}">
                        ${LABEL_ACAO[entrada.acao] || entrada.acao}
                    </span>
                </td>
                <td style="padding: 16px; font-weight: 500; color: var(--text-muted); font-size: 13px;">
                    ${totalPalavras} palavras
                </td>
                <td style="padding: 16px; color: var(--text-muted); font-size: 13px;">
                    ${formatarData(entrada.data)}
                </td>
                <td style="padding: 16px; text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button
                            class="btn-action"
                            style="min-width: unset; padding: 6px 12px; font-size: 11px; display: flex; align-items: center; gap: 4px;"
                            onclick="window.GuIA.historico.restaurarEntrada(${entrada.id})"
                            title="Visualizar este resultado na tela principal"
                        >
                            <span class="material-symbols-outlined" style="font-size: 14px;">visibility</span>
                            Ver
                        </button>
                        <button
                            class="btn-outline"
                            style="padding: 6px 10px; display: flex; align-items: center; justify-content: center;"
                            onclick="window.GuIA.historico.baixarEntrada(${entrada.id})"
                            title="Baixar PDF do resultado"
                        >
                            <span class="material-symbols-outlined" style="font-size: 14px;">download</span>
                        </button>
                        <button
                            class="btn-action btn-danger"
                            style="min-width: unset; padding: 6px 10px; display: flex; align-items: center; justify-content: center; border: none; color: white !important; background: #ef4444 !important;"
                            onclick="window.GuIA.historico.removerEntrada(${entrada.id})"
                            title="Excluir entrada"
                        >
                            <span class="material-symbols-outlined" style="font-size: 14px; color: white !important;">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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
    // Chunks não restaurado — chat contextual solicitará novo upload para funcionamento
    
    // Atualiza a acaoAtual global para que o cabeçalho do PDF seja correto
    acaoAtual = entrada.acao;

    // Renderiza o resultado e vai para a tela
    renderizarResultado(entrada.resultado, entrada.acao);
    showScreen('results');
}

/**
 * Permite baixar o PDF diretamente do histórico sem afetar a tela ativa
 * @param {number} id
 */
function baixarEntrada(id) {
    const lista = carregarHistorico();
    const entrada = lista.find(e => e.id === id);
    if (!entrada) return;

    // Guarda temporariamente as variáveis globais
    const acaoAnterior = acaoAtual;
    const uploadStateAnterior = window.GuIA.uploadState;

    // Substitui temporariamente para o gerador de PDF
    acaoAtual = entrada.acao;
    window.GuIA.uploadState = {
        fileName: entrada.fileName,
        fileType: entrada.fileType,
        fileSize: entrada.fileSize
    };

    // Invoca a biblioteca jsPDF configurada no index.js
    gerarPDF(entrada.resultado);

    // Restaura os valores anteriores imediatamente
    acaoAtual = acaoAnterior;
    window.GuIA.uploadState = uploadStateAnterior;
}

// ─── Exposição global ─────────────────────────────────────────────────────────

window.GuIA = window.GuIA || {};
window.GuIA.historico = {
    adicionarEntrada,
    removerEntrada,
    limparHistorico,
    restaurarEntrada,
    baixarEntrada,
    renderizarTelaHistorico,
};