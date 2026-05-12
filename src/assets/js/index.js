
/**
 * index.js - Controlador de Interface
 * Faz a ponte entre o HTML e a lógica de processamento.
 *
 * Alterações desta versão:
 *  - PDF com formatação rica: ## vira seção colorida, **texto** vira negrito
 *  - Nome do arquivo de download: {nomeArquivo}_{ACAO}.pdf
 *  - renderizarResultado() interpreta Markdown (##, **) para HTML
 *  - Novos botões sidebar: US05 (revisao) e US06 (simplificar)
 *  - Botão de chat ativo (US08/US09) — dispara chat.js
 */

let acaoAtual      = null;
let ultimoResultado = '';

document.addEventListener('DOMContentLoaded', () => {

    // ── Dropdown de tipo de arquivo ──────────────────────────────────────────
    const dropdownToggle = document.getElementById('dropdownToggle');
    const dropdownMenu   = document.getElementById('dropdownMenu');
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('open');
        });
    }

    // ── Botões de ação da tela de upload ─────────────────────────────────────
    document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            acaoAtual = btn.dataset.action;
            iniciarProcessamento();
        });
    });

    // ── Sidebar: ações sobre o resultado ─────────────────────────────────────

    const sidebarAcoes = {
        'sidebar-btn-quiz':          'quiz',
        'sidebar-btn-pontos':        'pontos',
        'sidebar-btn-questionario':  'questionario',
        'sidebar-btn-revisao':       'revisao',     // US05
        'sidebar-btn-simplificar':   'simplificar', // US06
    };

    Object.entries(sidebarAcoes).forEach(([id, acao]) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => {
            acaoAtual = acao;
            iniciarProcessamento();
        });
    });

    // ── Download PDF ─────────────────────────────────────────────────────────
    const btnBaixar = document.getElementById('sidebar-btn-baixar');
    if (btnBaixar) {
        btnBaixar.addEventListener('click', () => {
            if (!ultimoResultado) return;
            gerarPDF(ultimoResultado);
        });
    }

    // ── Chat (US08/US09) ─────────────────────────────────────────────────────
    const promptInput = document.getElementById('promptInput');
    const micBtn      = document.getElementById('micBtn');

    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagemChat(promptInput.value.trim());
                promptInput.value = '';
            }
        });
    }

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (promptInput) promptInput.focus();
        });
    }
});

// ─── Processamento ────────────────────────────────────────────────────────────

async function iniciarProcessamento() {
    const state = window.GuIA.uploadState;
    if (!state || !state.chunks || state.chunks.length === 0) {
        alert('Por favor, faça o upload de um arquivo primeiro!');
        return;
    }

    const apiKey = obterApiKey();
    if (!apiKey) return;

    showScreen('processing');
    atualizarTelaProcessamento(state.fileName, 0, state.chunks.length);

    try {
        const { resultadoFinal } = await window.GuIA.resumo.gerarConteudoIA(
            state.chunks,
            apiKey,
            acaoAtual,
            { onProgresso: (atual, total) => atualizarTelaProcessamento(state.fileName, atual, total) }
        );

        ultimoResultado = resultadoFinal;
        renderizarResultado(resultadoFinal);
        showScreen('results');
    } catch (erro) {
        console.error(erro);
        alert('Falha: ' + erro.message);
        showScreen('upload');
    }
}

function obterApiKey() {
    if (typeof CONFIG !== 'undefined' && (CONFIG.GROQ_API_KEY || CONFIG.GEMINI_API_KEY)) {
        return CONFIG.GROQ_API_KEY || CONFIG.GEMINI_API_KEY;
    }
    return prompt('API Key não encontrada no config.js. Digite-a:') || null;
}

// ─── Telas ────────────────────────────────────────────────────────────────────

function showScreen(screenId) {
    document.querySelectorAll('.screen-container').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.style.display = 'block';
}

function atualizarTelaProcessamento(fileName, atual, total) {
    const pct    = total > 0 ? Math.round((atual / total) * 100) : 0;
    const fill   = document.querySelector('.progress-fill');
    const status = document.querySelector('.status-text');
    if (fill)   fill.style.width = pct + '%';
    if (status) status.innerHTML = `Processando <strong>${fileName}</strong>... (${atual}/${total})`;
}

// ─── Renderização do resultado (interpreta Markdown leve) ────────────────────

function renderizarResultado(texto) {
    const output = document.querySelector('.text-output');
    if (!output) return;

    // Limpa o histórico do chat a cada novo resultado gerado
    const historico = document.getElementById('chat-historico');
    if (historico) historico.innerHTML = '';

    output.innerHTML = texto.split('\n')
        .filter(l => l.trim())
        .map(linha => {
            // ## Seção → h2
            if (linha.startsWith('## ')) {
                return `<h2 class="result-section-title">${linha.slice(3)}</h2>`;
            }
            // TÍTULO: ... → destaque
            if (linha.startsWith('TÍTULO:')) {
                return `<p class="result-doc-title">${linha}</p>`;
            }
            // inline **negrito**
            const parsed = linha.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            // • listas → <li>
            if (linha.startsWith('•')) {
                return `<li>${parsed.slice(1).trim()}</li>`;
            }
            return `<p>${parsed}</p>`;
        })
        .join('');
}

// ─── Geração de PDF com formatação rica ──────────────────────────────────────

function gerarPDF(texto) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const VERDE       = [42, 124, 118];
    const CINZA_LEVE  = [240, 247, 246];
    const TEXTO_ESCURO = [30, 30, 30];
    const TEXTO_MEDIO  = [80, 80, 80];
    const TEXTO_CLARO  = [150, 150, 150];

    const margemEsq  = 15;
    const margemDir  = 15;
    const margemTopo = 20;
    const larguraUtil = 210 - margemEsq - margemDir;

    // ── Cabeçalho ──
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GuIA — Inteligência Documental', margemEsq, 9);

    // ── Título da ação ──
    const titulos = {
        resumo:      'RESUMO',
        quiz:        'QUIZ',
        pontos:      'PONTOS-CHAVE',
        questionario:'QUESTIONÁRIO',
        revisao:     'PERGUNTAS DE REVISÃO', // US05
        simplificar: 'TEXTO SIMPLIFICADO',   // US06
    };
    doc.setTextColor(...VERDE);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text(titulos[acaoAtual] || 'RESULTADO', margemEsq, margemTopo + 10);

    // ── Nome do arquivo fonte ──
    const state = window.GuIA?.uploadState;
    if (state?.fileName) {
        doc.setTextColor(...TEXTO_MEDIO);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Documento: ${state.fileName}`, margemEsq, margemTopo + 16);
    }

    // ── Linha separadora ──
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.5);
    doc.line(margemEsq, margemTopo + 19, 210 - margemDir, margemTopo + 19);

    // ── Corpo com interpretação de Markdown ──
    let y = margemTopo + 27;
    const alturaLinha    = 6;
    const alturaMaxPagina = 275;

    function novaPagina() {
        doc.addPage();
        doc.setFillColor(...VERDE);
        doc.rect(0, 0, 210, 10, 'F');
        y = 20;
    }

    const linhas = texto.split('\n').filter(l => l.trim());

    linhas.forEach(linha => {
        if (y + alturaLinha > alturaMaxPagina) novaPagina();

        // ## Seção → título colorido com fundo suave
        if (linha.startsWith('## ')) {
            y += 3; // espaço antes
            doc.setFillColor(...CINZA_LEVE);
            doc.rect(margemEsq - 2, y - 5, larguraUtil + 4, 8, 'F');
            doc.setTextColor(...VERDE);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(linha.slice(3).toUpperCase(), margemEsq, y);
            y += alturaLinha + 2;
            return;
        }

        // TÍTULO: → destaque maior
        if (linha.startsWith('TÍTULO:')) {
            doc.setTextColor(...VERDE);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            const textoLimpo = linha.replace(/\*\*(.+?)\*\*/g, '$1');
            const wraps = doc.splitTextToSize(textoLimpo, larguraUtil);
            wraps.forEach(sub => {
                if (y + alturaLinha > alturaMaxPagina) novaPagina();
                doc.text(sub, margemEsq, y);
                y += alturaLinha;
            });
            y += 2;
            return;
        }

        // Linha inteiramente **negrito** ou com inline bold
        const isBoldLine = linha.startsWith('**') && linha.endsWith('**');
        const textoLimpo = linha.replace(/\*\*(.+?)\*\*/g, '$1');

        // • Lista
        if (linha.startsWith('•') || linha.startsWith('**Q') || linha.startsWith('**Pergunta') || linha.startsWith('**Resposta')) {
            doc.setTextColor(...TEXTO_ESCURO);
            doc.setFont('helvetica', isBoldLine ? 'bold' : 'normal');
            doc.setFontSize(11);
            const wraps = doc.splitTextToSize(textoLimpo, larguraUtil - 4);
            wraps.forEach((sub, idx) => {
                if (y + alturaLinha > alturaMaxPagina) novaPagina();
                doc.text(idx === 0 ? sub : '   ' + sub, margemEsq + (linha.startsWith('•') ? 3 : 0), y);
                y += alturaLinha;
            });
            return;
        }

        // Parágrafo normal
        doc.setTextColor(...TEXTO_ESCURO);
        doc.setFont('helvetica', isBoldLine ? 'bold' : 'normal');
        doc.setFontSize(11);
        const wraps = doc.splitTextToSize(textoLimpo, larguraUtil);
        wraps.forEach(sub => {
            if (y + alturaLinha > alturaMaxPagina) novaPagina();
            doc.text(sub, margemEsq, y);
            y += alturaLinha;
        });
    });

    // ── Rodapé em todas as páginas ──
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setTextColor(...TEXTO_CLARO);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado por GuIA  •  Página ${i} de ${totalPaginas}`, 105, 290, { align: 'center' });
    }

    // ── Nome do arquivo: {nomeArquivo}_{ACAO}.pdf ──
    const nomeBase = (state?.fileName || 'documento')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '_');
    const nomeAcao = (acaoAtual || 'resultado').toUpperCase();
    doc.save(`${nomeBase}_${nomeAcao}.pdf`);
}

// ─── Chat contextual (US08/US09) ─────────────────────────────────────────────

async function enviarMensagemChat(pergunta) {
    if (!pergunta) return;

    const state = window.GuIA?.uploadState;
    if (!state || !state.chunks || state.chunks.length === 0) {
        exibirMensagemChat('sistema', 'Faça o upload de um documento primeiro para usar o chat.');
        return;
    }

    const apiKey = obterApiKey();
    if (!apiKey) return;

    exibirMensagemChat('usuario', pergunta);

    // Seleciona chunks relevantes pela presença de palavras-chave da pergunta
    const palavras   = pergunta.toLowerCase().split(/\s+/).filter(p => p.length > 3);
    const chunksRel  = state.chunks
        .map((c, i) => ({ c, score: palavras.filter(p => c.toLowerCase().includes(p)).length, i }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.c);

    // Fallback: usa os 2 primeiros chunks se nenhum foi relevante
    const contexto = chunksRel.length > 0
        ? chunksRel.join('\n\n')
        : state.chunks.slice(0, 2).join('\n\n');

    const mensagens = [
        {
            role: 'system',
            content: `Você é um assistente que responde perguntas sobre um documento.
REGRAS:
1. Responda SEMPRE em português brasileiro.
2. Use EXCLUSIVAMENTE as informações do trecho de documento abaixo.
3. Se a resposta não estiver no trecho, diga "Não encontrei essa informação no documento."
4. Seja direto e objetivo.

TRECHO DO DOCUMENTO:
"""
${contexto}
"""`
        },
        { role: 'user', content: pergunta }
    ];

    exibirMensagemChat('sistema', '⏳ Consultando o documento...');

    try {
        const resposta = await window.GuIA.resumo.chamarAPIChat(mensagens, apiKey);
        removerUltimaMensagemSistema();
        exibirMensagemChat('assistente', resposta);
    } catch (erro) {
        removerUltimaMensagemSistema();
        exibirMensagemChat('sistema', '⚠️ Erro ao consultar a IA: ' + erro.message);
    }
}

function exibirMensagemChat(tipo, texto) {
    let historico = document.getElementById('chat-historico');

    // Cria o histórico se não existir (pode ser necessário na tela de resultados)
    if (!historico) {
        const promptBar = document.querySelector('.prompt-bar');
        if (!promptBar) return;
        historico = document.createElement('div');
        historico.id        = 'chat-historico';
        historico.className = 'chat-historico';
        promptBar.parentElement.insertBefore(historico, promptBar);
    }

    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${tipo}`;

    // Interpreta Markdown leve na resposta do assistente
    const html = tipo === 'assistente'
        ? texto.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
        : texto;

    msg.innerHTML = html;
    historico.appendChild(msg);
    historico.scrollTop = historico.scrollHeight;
}

function removerUltimaMensagemSistema() {
    const historico = document.getElementById('chat-historico');
    if (!historico) return;
    const msgs = historico.querySelectorAll('.chat-msg--sistema');
    if (msgs.length) msgs[msgs.length - 1].remove();
}