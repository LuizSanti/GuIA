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

    // Mapa de resultados gerados por ação (para download individual)
    window.GuIA = window.GuIA || {};
    window.GuIA.resultadosPorAcao = {};

    const sidebarAcoes = {
        'sidebar-btn-quiz':          'quiz',
        'sidebar-btn-pontos':        'pontos',
        'sidebar-btn-questionario':  'questionario',
        'sidebar-btn-revisao':       'revisao',     // US05
        'sidebar-btn-simplificar':   'simplificar', // US06
    };

    Object.entries(sidebarAcoes).forEach(([id, acao]) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Clique no label → gera conteúdo
        const label = btn.querySelector('.btn-label') || btn;
        label.addEventListener('click', (e) => {
            e.stopPropagation();
            acaoAtual = acao;
            iniciarProcessamento();
        });

        // Clique no ícone de download → baixa resultado já gerado
        const iconeDownload = btn.querySelector('.btn-download-icon');
        if (iconeDownload) {
            iconeDownload.classList.add('sem-conteudo'); // começa desabilitado
            iconeDownload.addEventListener('click', (e) => {
                e.stopPropagation();
                const texto = window.GuIA.resultadosPorAcao[acao];
                if (!texto) return;
                acaoAtual = acao;
                gerarPDF(texto);
            });
        }
    });

    // ── Download PDF ─────────────────────────────────────────────────────────
    const btnBaixar = document.getElementById('sidebar-btn-baixar');
    if (btnBaixar) {
        btnBaixar.addEventListener('click', () => {
            // Baixa sempre o resumo, independente do que está sendo exibido
            const textoResumo = window.GuIA.resultadosPorAcao?.['resumo'] || ultimoResultado;
            if (!textoResumo) {
                alert('Nenhum resumo gerado ainda. Gere um resumo primeiro.');
                return;
            }
            const acaoAnterior = acaoAtual;
            acaoAtual = 'resumo';
            gerarPDF(textoResumo);
            acaoAtual = acaoAnterior; // restaura ação atual
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

        // Salva resultado por ação para download individual
        window.GuIA.resultadosPorAcao = window.GuIA.resultadosPorAcao || {};
        window.GuIA.resultadosPorAcao[acaoAtual] = resultadoFinal;

        // Habilita o ícone de download do botão correspondente (se existir)
        const btnAtual = document.querySelector(`[data-download="${acaoAtual}"]`);
        if (btnAtual) btnAtual.classList.remove('sem-conteudo');

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

    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        if (screenId === 'results') {
            // Ajusta a área de conteúdo para ocupar o espaço disponível sem quebrar o chat
            contentArea.style.justifyContent = 'flex-start';
            contentArea.style.overflow = 'hidden'; 
        } else {
            contentArea.style.justifyContent = 'center';
            contentArea.style.overflowY = 'auto';
        }
    }
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

    // Limpa e oculta o histórico do chat a cada novo resultado gerado
    const historico = document.getElementById('chat-historico');
    if (historico) {
        historico.innerHTML = '';
        historico.style.display = 'none';
    }

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

// ─── Geração de PDF — design moderno ─────────────────────────────────────────

function gerarPDF(texto) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // ── Paleta ──────────────────────────────────────────────────────────────
    const VERDE        = [42, 124, 118];
    const VERDE_ESCURO = [28, 90, 86];
    const VERDE_SUAVE  = [232, 245, 244];
    const CINZA_BG     = [248, 249, 250];
    const PRETO        = [17, 24, 39];
    const CINZA_TEXTO  = [55, 65, 81];
    const CINZA_MEDIO  = [107, 114, 128];
    const CINZA_CLARO  = [209, 213, 219];
    const BRANCO       = [255, 255, 255];

    const MEsq = 18;
    const MDir = 18;
    const LU   = 210 - MEsq - MDir;   // largura útil
    const YMAX = 278;

    const state = window.GuIA?.uploadState;

    const titulos = {
        resumo:       'Resumo',
        quiz:         'Quiz',
        pontos:       'Pontos-chave',
        questionario: 'Questionário',
        revisao:      'Perguntas de Revisão',
        simplificar:  'Texto Simplificado',
    };
    const tituloDoc = titulos[acaoAtual] || 'Resultado';

    // ════════════════════════════════════════════════════════════════════════
    // PÁGINA DE CAPA
    // ════════════════════════════════════════════════════════════════════════

    // Fundo branco limpo
    doc.setFillColor(...BRANCO);
    doc.rect(0, 0, 210, 297, 'F');

    // Barra lateral esquerda colorida
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, 6, 297, 'F');

    // Bloco de topo com gradiente simulado (dois retângulos)
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, 210, 72, 'F');
    doc.setFillColor(...VERDE_ESCURO);
    doc.rect(0, 62, 210, 10, 'F');

    // Logo / marca — círculo branco com inicial
    doc.setFillColor(...BRANCO);
    doc.circle(MEsq + 10, 28, 10, 'F');
    doc.setTextColor(...VERDE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('G', MEsq + 7, 32);

    // Nome do app
    doc.setTextColor(...BRANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('GuIA', MEsq + 24, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 235, 233);
    doc.text('Inteligência Documental', MEsq + 24, 33);

    // Tipo de conteúdo (badge)
    const badgeW = doc.getTextWidth(tituloDoc.toUpperCase()) + 10;
    doc.setFillColor(...BRANCO);
    doc.roundedRect(MEsq, 44, badgeW, 8, 2, 2, 'F');
    doc.setTextColor(...VERDE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(tituloDoc.toUpperCase(), MEsq + 5, 49.5);

    // Linha separadora abaixo do header
    doc.setDrawColor(...VERDE_SUAVE);
    doc.setLineWidth(0);

    // Área central da capa
    const capaY = 95;

    // Título principal grande
    doc.setTextColor(...PRETO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text(tituloDoc, MEsq, capaY);

    // Subtítulo / nome do documento
    if (state?.fileName) {
        const nomeArquivo = state.fileName.replace(/\.[^/.]+$/, '');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.setTextColor(...CINZA_MEDIO);
        const nomeWrapped = doc.splitTextToSize(nomeArquivo, LU);
        doc.text(nomeWrapped, MEsq, capaY + 12);
    }

    // Linha divisória elegante
    doc.setDrawColor(...CINZA_CLARO);
    doc.setLineWidth(0.4);
    doc.line(MEsq, capaY + 26, MEsq + LU, capaY + 26);

    // Metadados
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...CINZA_MEDIO);
    doc.text(`Gerado em  ${dataStr} às ${horaStr}`, MEsq, capaY + 34);

    // Rodapé da capa
    doc.setFillColor(...CINZA_BG);
    doc.rect(0, 272, 210, 25, 'F');
    doc.setTextColor(...CINZA_MEDIO);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Gerado por GuIA — Inteligência Documental', MEsq, 283);
    doc.text('Página 1', 210 - MDir, 283, { align: 'right' });

    // ════════════════════════════════════════════════════════════════════════
    // PÁGINAS DE CONTEÚDO
    // ════════════════════════════════════════════════════════════════════════

    doc.addPage();

    function desenharCabecalhoConteudo() {
        // Barra lateral esquerda fina
        doc.setFillColor(...VERDE);
        doc.rect(0, 0, 3, 297, 'F');

        // Topo compacto
        doc.setFillColor(...CINZA_BG);
        doc.rect(3, 0, 207, 14, 'F');

        doc.setTextColor(...VERDE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('GuIA', MEsq, 9);

        doc.setTextColor(...CINZA_MEDIO);
        doc.setFont('helvetica', 'normal');
        doc.text(tituloDoc, 210 - MDir, 9, { align: 'right' });

        // Linha abaixo do topo
        doc.setDrawColor(...CINZA_CLARO);
        doc.setLineWidth(0.3);
        doc.line(3, 14, 210, 14);
    }

    function desenharRodapeConteudo(pagina, total) {
        doc.setFillColor(...CINZA_BG);
        doc.rect(3, 284, 207, 13, 'F');
        doc.setDrawColor(...CINZA_CLARO);
        doc.setLineWidth(0.3);
        doc.line(3, 284, 210, 284);
        doc.setTextColor(...CINZA_MEDIO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('Gerado por GuIA — Inteligência Documental', MEsq, 291);
        doc.text(`Página ${pagina} de ${total}`, 210 - MDir, 291, { align: 'right' });
    }

    desenharCabecalhoConteudo();

    let y = 26;
    let paginaAtual = 2;

    function novaPagina() {
        doc.addPage();
        paginaAtual++;
        desenharCabecalhoConteudo();
        y = 26;
    }

    function checarEspaco(altura) {
        if (y + altura > YMAX) novaPagina();
    }

    const linhas = texto.split('\n').filter(l => l.trim());

    linhas.forEach(linha => {

        // ── ## Seção ──────────────────────────────────────────────────────
        if (linha.startsWith('## ')) {
            checarEspaco(14);
            y += 4;
            // Bloco colorido de fundo
            doc.setFillColor(...VERDE_SUAVE);
            doc.roundedRect(MEsq - 3, y - 5.5, LU + 6, 9, 1.5, 1.5, 'F');
            // Marcador lateral
            doc.setFillColor(...VERDE);
            doc.roundedRect(MEsq - 3, y - 5.5, 3, 9, 1, 1, 'F');
            // Texto
            doc.setTextColor(...VERDE);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(linha.slice(3).toUpperCase(), MEsq + 3, y);
            y += 10;
            return;
        }

        // ── TÍTULO: ───────────────────────────────────────────────────────
        if (linha.startsWith('TÍTULO:')) {
            checarEspaco(10);
            const limpo = linha.replace('TÍTULO:', '').replace(/\*\*(.+?)\*\*/g, '$1').trim();
            doc.setTextColor(...VERDE);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            const ws = doc.splitTextToSize(limpo, LU);
            ws.forEach(s => { checarEspaco(7); doc.text(s, MEsq, y); y += 7; });
            y += 3;
            return;
        }

        // ── ### Subtítulo (Pergunta, Resposta, Q1...) ─────────────────────
        if (linha.startsWith('### ')) {
            checarEspaco(10);
            y += 3;
            const limpo = linha.slice(4).replace(/\*\*(.+?)\*\*/g, '$1');
            doc.setTextColor(...CINZA_TEXTO);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            const ws = doc.splitTextToSize(limpo, LU);
            ws.forEach(s => { checarEspaco(6); doc.text(s, MEsq, y); y += 6; });
            y += 1;
            return;
        }

        // ── Número + opção (a, b, c, d) ───────────────────────────────────
        if (/^[a-d]\)/.test(linha.trim())) {
            checarEspaco(6);
            const limpo = linha.replace(/\*\*(.+?)\*\*/g, '$1').trim();
            doc.setTextColor(...CINZA_MEDIO);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            const ws = doc.splitTextToSize(limpo, LU - 8);
            ws.forEach((s, i) => {
                checarEspaco(5.5);
                doc.text(s, MEsq + (i === 0 ? 5 : 10), y);
                y += 5.5;
            });
            return;
        }

        // ── Listas com • ou - ─────────────────────────────────────────────
        if (linha.startsWith('•') || linha.startsWith('- ')) {
            checarEspaco(6);
            const limpo = linha.replace(/^[•\-]\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1');
            // Bullet colorido
            doc.setFillColor(...VERDE);
            doc.circle(MEsq + 1.5, y - 1.5, 1.2, 'F');
            doc.setTextColor(...CINZA_TEXTO);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const ws = doc.splitTextToSize(limpo, LU - 7);
            ws.forEach((s, i) => {
                checarEspaco(5.8);
                doc.text(s, MEsq + 6, y);
                y += 5.8;
            });
            y += 1;
            return;
        }

        // ── Linha bold completa (subtítulos livres) ────────────────────────
        const isBoldLine = /^\*\*.+\*\*$/.test(linha.trim());
        const limpo = linha.replace(/\*\*(.+?)\*\*/g, '$1').trim();

        if (isBoldLine) {
            checarEspaco(8);
            y += 2;
            doc.setTextColor(...PRETO);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            const ws = doc.splitTextToSize(limpo, LU);
            ws.forEach(s => { checarEspaco(6); doc.text(s, MEsq, y); y += 6; });
            y += 1;
            return;
        }

        // ── Parágrafo normal ──────────────────────────────────────────────
        checarEspaco(6);
        doc.setTextColor(...CINZA_TEXTO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const ws = doc.splitTextToSize(limpo, LU);
        ws.forEach(s => { checarEspaco(5.8); doc.text(s, MEsq, y); y += 5.8; });
        y += 2;
    });

    // ── Rodapé em todas as páginas de conteúdo ──
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 2; i <= totalPaginas; i++) {
        doc.setPage(i);
        desenharRodapeConteudo(i, totalPaginas);
    }
    // Atualiza rodapé da capa com total correto
    doc.setPage(1);
    doc.setFillColor(...CINZA_BG);
    doc.rect(160, 278, 50, 8, 'F');
    doc.setTextColor(...CINZA_MEDIO);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Página 1 de ${totalPaginas}`, 210 - MDir, 283, { align: 'right' });

    // ── Salvar ──
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
    // O #chat-historico já existe no DOM fixo — só precisamos mostrá-lo
    const historico = document.getElementById('chat-historico');
    if (!historico) return;

    // Torna visível na primeira mensagem
    historico.style.display = 'flex';

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