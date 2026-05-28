/**
 * index.js - Controlador de Interface
 *
 * [Sprint 3] US24 — Loading controlado em todas as chamadas à API
 * [Sprint 3] US25 — Mensagens de erro amigáveis por tipo de falha
 */

let acaoAtual       = null;
let ultimoResultado = '';

// ─── Mensagens amigáveis por tipo de erro (US25) ──────────────────────────────
//
// Cada chave corresponde ao .tipo lançado pelo ErroGuIA em resumo.js.
// 'default' cobre qualquer situação não mapeada.

const MENSAGENS_ERRO = {
    timeout:        'A análise demorou mais do que o esperado. Verifique sua conexão e tente novamente.',
    resposta_vazia: 'A inteligência artificial não conseguiu gerar um resultado para este documento. Tente com um arquivo diferente.',
    api:            'Não foi possível se conectar ao serviço de análise. Tente novamente em alguns instantes.',
    desconhecido:   'Algo deu errado durante o processamento. Tente novamente.',
};

function traduzirErro(erro) {
    return MENSAGENS_ERRO[erro?.tipo] || MENSAGENS_ERRO.desconhecido;
}

// ─── Tela de erro (US25) ──────────────────────────────────────────────────────

function mostrarTelaErro(mensagemAmigavel) {
    const helperEl = document.querySelector('#screen-error .helper-text');
    if (helperEl) helperEl.textContent = mensagemAmigavel;
    showScreen('error');
}

// ─── Inicialização ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    const dropdownToggle = document.getElementById('dropdownToggle');
    const dropdownMenu   = document.getElementById('dropdownMenu');
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('open');
        });
    }

    document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            acaoAtual = btn.dataset.action;
            iniciarProcessamento();
        });
    });

    window.GuIA = window.GuIA || {};
    window.GuIA.resultadosPorAcao = {};

    const sidebarAcoes = {
        'sidebar-btn-resumo':        'resumo',
        'sidebar-btn-quiz':          'quiz',
        'sidebar-btn-pontos':        'pontos',
        'sidebar-btn-questionario':  'questionario',
        'sidebar-btn-revisao':       'revisao',
        'sidebar-btn-simplificar':   'simplificar',
    };

    Object.entries(sidebarAcoes).forEach(([id, acao]) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const label = btn.querySelector('.btn-label') || btn;
        label.addEventListener('click', (e) => {
            e.stopPropagation();
            acaoAtual = acao;
            iniciarProcessamento();
        });

        const iconeDownload = btn.querySelector('.btn-download-icon');
        if (iconeDownload) {
            iconeDownload.classList.add('sem-conteudo');
            iconeDownload.addEventListener('click', (e) => {
                e.stopPropagation();
                const texto = window.GuIA.resultadosPorAcao[acao];
                if (!texto) return;
                acaoAtual = acao;
                gerarPDF(texto);
            });
        }
    });

    const btnBaixar = document.getElementById('sidebar-btn-baixar');
    if (btnBaixar) {
        btnBaixar.addEventListener('click', () => {
            const acao = btnBaixar.dataset.acaoAtual;
        if (!acao) return;
        const texto = window.GuIA.resultadosPorAcao?.[acao];
        if (!texto) {
            mostrarTelaErro('Nenhum conteúdo foi gerado ainda.');
            return;
        }
        const acaoAnterior = acaoAtual;
        acaoAtual = acao;
        gerarPDF(texto);
        acaoAtual = acaoAnterior;
    });
}

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
    // --- INICIALIZAÇÃO DE PERFIL E CONFIGURAÇÕES NO DOM ---
    
    // Aplica o tema salvo logo na inicialização
    const savedTheme = localStorage.getItem('guia_theme') || 'default';
    aplicarTema(savedTheme);

    // Event listeners para tela de configurações
    document.querySelectorAll('.theme-option-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.theme-option-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    const btnToggleKey = document.getElementById('btn-toggle-key');
    const inputKey = document.getElementById('settings-api-key');
    if (btnToggleKey && inputKey) {
        btnToggleKey.addEventListener('click', () => {
            const isPassword = inputKey.type === 'password';
            inputKey.type = isPassword ? 'text' : 'password';
            btnToggleKey.querySelector('.material-symbols-outlined').textContent = isPassword ? 'visibility_off' : 'visibility';
        });
    }

    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', salvarConfiguracoes);
    }

    const btnResetSettings = document.getElementById('btn-reset-settings');
    if (btnResetSettings) {
        btnResetSettings.addEventListener('click', resetarConfiguracoes);
    }

    const sliderChunk = document.getElementById('settings-chunk-size');
    const valChunk = document.getElementById('chunk-size-val');
    if (sliderChunk && valChunk) {
        sliderChunk.addEventListener('input', (e) => {
            valChunk.textContent = e.target.value + ' carac.';
        });
    }

    // Event listeners para tela de perfil
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', salvarPerfil);
    }

    const btnChangeAvatar = document.getElementById('btn-change-avatar');
    if (btnChangeAvatar) {
        btnChangeAvatar.addEventListener('click', () => {
            const cores = [
                'linear-gradient(135deg, var(--teal), var(--teal-light))',
                'linear-gradient(135deg, #d97706, #f59e0b)',
                'linear-gradient(135deg, #a855f7, #c084fc)',
                'linear-gradient(135deg, #ef4444, #f87171)',
                'linear-gradient(135deg, #3b82f6, #60a5fa)',
                'linear-gradient(135deg, #10b981, #34d399)'
            ];
            const avatarDisplay = document.getElementById('profile-avatar-display');
            if (avatarDisplay) {
                let index = parseInt(localStorage.getItem('guia_avatar_color_idx') || '0', 10);
                index = (index + 1) % cores.length;
                localStorage.setItem('guia_avatar_color_idx', index);
                avatarDisplay.style.background = cores[index];
            }
        });
    }

    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todo o seu histórico de estudos?')) {
                window.GuIA.historico.limparHistorico();
            }
        });
    }
});

function atualizarVisibilidadeSidebar(acao) {
    const mapa = {
        'sidebar-btn-resumo':       'resumo',
        'sidebar-btn-quiz':         'quiz',
        'sidebar-btn-pontos':       'pontos',
        'sidebar-btn-questionario': 'questionario',
        'sidebar-btn-revisao':      'revisao',
        'sidebar-btn-simplificar':  'simplificar',
    };

    Object.keys(mapa).forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Garante que o botão esteja sempre visível
        btn.style.display = 'flex';

        // Aplica ou remove o destaque
        if (mapa[id] === acao) {
            btn.classList.add('btn-ativo');
        } else {
            btn.classList.remove('btn-ativo');
        }
    });

    // Se a ação atual não for resumo, mostra o botão de gerar resumo na sidebar
    const btnResumoSidebar = document.getElementById('sidebar-btn-resumo');
    // if (btnResumoSidebar) {
    //     btnResumoSidebar.style.display = acao === 'resumo' ? 'none' : '';
    // }
}

// ─── Processamento ────────────────────────────────────────────────────────────
//
// US24: showScreen('processing') é sempre chamado ANTES de qualquer await.
// Isso garante que o spinner apareça para TODAS as chamadas —
// tanto o fluxo de upload quanto os botões da sidebar (quiz, pontos, revisão...).
//
// US25: o catch captura ErroGuIA (com .tipo definido) ou erros genéricos,
// traduz para mensagem legível e exibe na tela de erro. Zero alert().

async function iniciarProcessamento() {
    const state = window.GuIA.uploadState;
    if (!state || !state.chunks || state.chunks.length === 0) {
        mostrarTelaErro('Nenhum documento foi carregado. Faça o upload de um arquivo antes de continuar.');
        return;
    }

    // US24 — exibe processing ANTES do await
    showScreen('processing');
    atualizarTelaProcessamento(state.fileName, 0, state.chunks.length);

    try {
        const { resultadoFinal } = await window.GuIA.resumo.gerarConteudoIA(
            state.chunks,
            acaoAtual,
            { onProgresso: (atual, total) => atualizarTelaProcessamento(state.fileName, atual, total) }
        );

        ultimoResultado = resultadoFinal;
        window.GuIA.resultadosPorAcao = window.GuIA.resultadosPorAcao || {};
        window.GuIA.resultadosPorAcao[acaoAtual] = resultadoFinal;

        const btnAtual = document.querySelector(`[data-download="${acaoAtual}"]`);
        if (btnAtual) btnAtual.classList.remove('sem-conteudo');

        renderizarResultado(resultadoFinal, acaoAtual);
        atualizarBotaoBaixar(acaoAtual);
        atualizarVisibilidadeSidebar(acaoAtual);
        showScreen('results');
        window.GuIA.historico.adicionarEntrada(state, acaoAtual, resultadoFinal);
        
        // Incrementa as estatísticas e medalhas da estudante
        incrementarMetricas(state, resultadoFinal);

    } catch (erro) {
        console.error('[GuIA]', erro);
        mostrarTelaErro(traduzirErro(erro));
    }
}

function atualizarBotaoBaixar(acao) {
    const btnResumo = document.getElementById('sidebar-btn-resumo');
    if (!btnResumo) return;

    btnResumo.classList.add('btn-danger-custom');

    const label = btnResumo.querySelector('.btn-label');

    if (acao === 'resumo') {
        label.innerText = 'BAIXAR RESUMO';
        btnResumo.onclick = () => {
            const texto = window.GuIA.resultadosPorAcao?.['resumo'];
            if (texto) {
                gerarPDF(texto);
            } else {
                // Caso não tenha gerado nada ainda
                processarConteudo('resumo'); 
            }
        };
    } else {
        label.innerText = 'GERAR RESUMO';
        btnResumo.onclick = () => {
            processarConteudo('resumo'); // Função que inicia a geração
        };
    }
}

// ─── Telas ────────────────────────────────────────────────────────────────────

function showScreen(screenId) {
    document.querySelectorAll('.screen-container').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.style.display = 'block';

    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        if (screenId === 'results') {
            contentArea.style.justifyContent = 'flex-start';
            contentArea.style.overflow = 'hidden';
        } else {
            contentArea.style.justifyContent = 'center';
            contentArea.style.overflowY = 'auto';
        }
    }

    // --- ATUALIZAR NAVEGAÇÃO ATIVA ---
    document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${screenId}`);
    if (activeLink) activeLink.classList.add('active');

    // --- EXIBIR/OCULTAR CHAT CONTEXTUAL ---
    const chatWrapper = document.querySelector('.chat-wrapper');
    if (chatWrapper) {
        if (screenId === 'results') {
            chatWrapper.style.display = 'flex';
        } else {
            chatWrapper.style.display = 'none';
        }
    }

    // --- CARREGAR DADOS DINÂMICOS DA TELA ---
    if (screenId === 'settings') {
        carregarConfiguracoes();
    } else if (screenId === 'profile') {
        carregarPerfil();
    } else if (screenId === 'history') {
        window.GuIA.historico.renderizarTelaHistorico();
    }

    // Ao voltar para upload, limpa o chat e o arquivo selecionado
    if (screenId === 'upload') {
        const historico = document.getElementById('chat-historico');
        if (historico) {
            historico.innerHTML = '';
            historico.style.display = 'none';
        }
    }
}

// ─── Métodos e Funções Auxiliares de Configurações, Perfil e Temas ──────────────

function aplicarTema(theme) {
    document.body.className = '';
    if (theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
    }
}

function carregarConfiguracoes() {
    const inputKey = document.getElementById('settings-api-key');
    const selectModel = document.getElementById('settings-model');
    const selectAction = document.getElementById('settings-default-action');
    const sliderChunk = document.getElementById('settings-chunk-size');
    const valChunk = document.getElementById('chunk-size-val');

    if (inputKey) inputKey.value = localStorage.getItem('guia_api_key') || '';
    if (selectModel) selectModel.value = localStorage.getItem('guia_model') || 'llama-3.1-8b-instant';
    if (selectAction) selectAction.value = localStorage.getItem('guia_default_action') || 'resumo';
    
    const chunkVal = localStorage.getItem('guia_chunk_size') || '4000';
    if (sliderChunk) sliderChunk.value = chunkVal;
    if (valChunk) valChunk.textContent = chunkVal + ' carac.';

    const theme = localStorage.getItem('guia_theme') || 'default';
    document.querySelectorAll('.theme-option-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.theme === theme) {
            card.classList.add('active');
        }
    });
}

function salvarConfiguracoes() {
    const inputKey = document.getElementById('settings-api-key');
    const selectModel = document.getElementById('settings-model');
    const selectAction = document.getElementById('settings-default-action');
    const sliderChunk = document.getElementById('settings-chunk-size');
    const activeThemeCard = document.querySelector('.theme-option-card.active');

    if (inputKey) localStorage.setItem('guia_api_key', inputKey.value.trim());
    if (selectModel) localStorage.setItem('guia_model', selectModel.value);
    if (selectAction) localStorage.setItem('guia_default_action', selectAction.value);
    if (sliderChunk) localStorage.setItem('guia_chunk_size', sliderChunk.value);
    
    if (activeThemeCard) {
        const theme = activeThemeCard.dataset.theme;
        localStorage.setItem('guia_theme', theme);
        aplicarTema(theme);
    }

    const feedback = document.getElementById('settings-feedback');
    if (feedback) {
        feedback.style.display = 'flex';
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
    }
}

function resetarConfiguracoes() {
    if (confirm('Deseja restaurar todas as configurações para os padrões de fábrica?')) {
        localStorage.removeItem('guia_api_key');
        localStorage.removeItem('guia_model');
        localStorage.removeItem('guia_default_action');
        localStorage.removeItem('guia_chunk_size');
        localStorage.removeItem('guia_theme');
        aplicarTema('default');
        carregarConfiguracoes();
    }
}

function carregarPerfil() {
    const txtNameTitle = document.getElementById('profile-name-title');
    const txtEmailTitle = document.getElementById('profile-email-title');
    const badgeCourse = document.getElementById('profile-course-badge');
    const badgeUniv = document.getElementById('profile-univ-badge');
    const avatarDisplay = document.getElementById('profile-avatar-display');

    const inputName = document.getElementById('profile-name-input');
    const inputEmail = document.getElementById('profile-email-input');
    const inputCourse = document.getElementById('profile-course-input');
    const inputUniv = document.getElementById('profile-univ-input');

    // Dados básicos
    const name = localStorage.getItem('guia_profile_name') || 'Mariana Silva';
    const email = localStorage.getItem('guia_profile_email') || 'mariana@faculdade.edu.br';
    const course = localStorage.getItem('guia_profile_course') || 'Engenharia de Software';
    const univ = localStorage.getItem('guia_profile_univ') || 'Universidade Federal';

    if (txtNameTitle) txtNameTitle.textContent = name;
    if (txtEmailTitle) {
        txtEmailTitle.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">mail</span>${email}`;
    }
    if (badgeCourse) {
        badgeCourse.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal);">school</span>${course}`;
    }
    if (badgeUniv) {
        badgeUniv.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; color: #475569;">account_balance</span>${univ}`;
    }
    if (avatarDisplay) {
        avatarDisplay.textContent = name.charAt(0).toUpperCase();
        
        // Recupera cor de fundo do avatar
        const cores = [
            'linear-gradient(135deg, var(--teal), var(--teal-light))',
            'linear-gradient(135deg, #d97706, #f59e0b)',
            'linear-gradient(135deg, #a855f7, #c084fc)',
            'linear-gradient(135deg, #ef4444, #f87171)',
            'linear-gradient(135deg, #3b82f6, #60a5fa)',
            'linear-gradient(135deg, #10b981, #34d399)'
        ];
        const index = parseInt(localStorage.getItem('guia_avatar_color_idx') || '0', 10);
        avatarDisplay.style.background = cores[index];
    }

    if (inputName) inputName.value = name;
    if (inputEmail) inputEmail.value = email;
    if (inputCourse) inputCourse.value = course;
    if (inputUniv) inputUniv.value = univ;

    // Métricas
    const docs = parseInt(localStorage.getItem('guia_stats_docs') || '0', 10);
    const actions = parseInt(localStorage.getItem('guia_stats_actions') || '0', 10);
    const words = parseInt(localStorage.getItem('guia_stats_words') || '0', 10);

    const valDocs = document.getElementById('stat-docs-val');
    const valActions = document.getElementById('stat-actions-val');
    const valWords = document.getElementById('stat-words-val');
    const valTime = document.getElementById('stat-time-val');

    if (valDocs) valDocs.textContent = docs;
    if (valActions) valActions.textContent = actions;
    if (valWords) valWords.textContent = words > 1000 ? (words / 1000).toFixed(1) + 'k' : words;
    
    // Cálculo fofo de tempo economizado (15 minutos economizados por ação estudantil da GuIA!)
    if (valTime) {
        const tempoMinutos = actions * 15;
        if (tempoMinutos >= 60) {
            const horas = (tempoMinutos / 60).toFixed(1);
            valTime.textContent = horas + ' horas';
        } else {
            valTime.textContent = tempoMinutos + ' min';
        }
    }

    // Medalhas
    const badgePrimeiro = document.getElementById('badge-primeiro-passo');
    const badgeDevorador = document.getElementById('badge-devorador');
    const badgeBrilhante = document.getElementById('badge-brilhante');

    if (badgePrimeiro) {
        if (docs >= 1) {
            badgePrimeiro.classList.add('active');
            badgePrimeiro.style.opacity = '1';
            badgePrimeiro.style.filter = 'none';
        } else {
            badgePrimeiro.classList.remove('active');
            badgePrimeiro.style.opacity = '0.3';
            badgePrimeiro.style.filter = 'grayscale(1)';
        }
    }

    if (badgeDevorador) {
        if (docs >= 5) {
            badgeDevorador.classList.add('active');
            badgeDevorador.style.opacity = '1';
            badgeDevorador.style.filter = 'none';
        } else {
            badgeDevorador.classList.remove('active');
            badgeDevorador.style.opacity = '0.3';
            badgeDevorador.style.filter = 'grayscale(1)';
        }
    }

    if (badgeBrilhante) {
        if (actions >= 5) {
            badgeBrilhante.classList.add('active');
            badgeBrilhante.style.opacity = '1';
            badgeBrilhante.style.filter = 'none';
        } else {
            badgeBrilhante.classList.remove('active');
            badgeBrilhante.style.opacity = '0.3';
            badgeBrilhante.style.filter = 'grayscale(1)';
        }
    }
}

function salvarPerfil() {
    const inputName = document.getElementById('profile-name-input');
    const inputEmail = document.getElementById('profile-email-input');
    const inputCourse = document.getElementById('profile-course-input');
    const inputUniv = document.getElementById('profile-univ-input');

    if (inputName) localStorage.setItem('guia_profile_name', inputName.value.trim());
    if (inputEmail) localStorage.setItem('guia_profile_email', inputEmail.value.trim());
    if (inputCourse) localStorage.setItem('guia_profile_course', inputCourse.value.trim());
    if (inputUniv) localStorage.setItem('guia_profile_univ', inputUniv.value.trim());

    carregarPerfil();
    alert('Perfil atualizado com sucesso!');
}

function incrementarMetricas(state, resultado) {
    // 1. Incrementa total de ações realizadas
    const acoes = parseInt(localStorage.getItem('guia_stats_actions') || '0', 10) + 1;
    localStorage.setItem('guia_stats_actions', acoes);

    // 2. Incrementa total de palavras lidas
    const totalPalavras = resultado ? resultado.split(/\s+/).filter(Boolean).length : 0;
    const palavrasAnteriores = parseInt(localStorage.getItem('guia_stats_words') || '0', 10);
    localStorage.setItem('guia_stats_words', palavrasAnteriores + totalPalavras);

    // 3. Incrementa documentos analisados (apenas se for inédito)
    try {
        const docsVistos = JSON.parse(localStorage.getItem('guia_docs_vistos') || '[]');
        if (!docsVistos.includes(state.fileName)) {
            docsVistos.push(state.fileName);
            localStorage.setItem('guia_docs_vistos', JSON.stringify(docsVistos));
            
            const docs = parseInt(localStorage.getItem('guia_stats_docs') || '0', 10) + 1;
            localStorage.setItem('guia_stats_docs', docs);
        }
    } catch {
        // Fallback robusto caso localStorage corrompa
        const docs = parseInt(localStorage.getItem('guia_stats_docs') || '0', 10) + 1;
        localStorage.setItem('guia_stats_docs', docs);
    }
}



function atualizarTelaProcessamento(fileName, atual, total) {
    const pct    = total > 0 ? Math.round((atual / total) * 100) : 0;
    const fill   = document.querySelector('.progress-fill');
    const pct_el = document.querySelector('.progress-percent');
    const status = document.querySelector('.status-text');

    if (fill)   fill.style.width   = pct + '%';
    if (pct_el) pct_el.textContent = pct + '% completo';
    if (status) status.innerHTML   = `Analisando <strong>${fileName}</strong>... (${atual}/${total})`;
}

// ─── Renderização do resultado (com envelopamento de Design System) ─────────

function renderizarResultado(texto) {
    const output = document.querySelector('.text-output');
    if (!output) return;

    // Limpa e oculta o histórico do chat a cada novo resultado gerado
    const historico = document.getElementById('chat-historico');
    if (historico) {
        historico.innerHTML = '';
        historico.style.display = 'none';
    }

    // Determina o tema visual do cartão com base na ação selecionada
    const isRevisao = ['revisao', 'quiz', 'questionario'].includes(acaoAtual);
    const classeBloco = isRevisao ? 'result-block--revisao' : 'result-block--resumo';
    const iconeBloco = isRevisao ? 'quiz' : 'summarize';

    let htmlFinal = '';
    let dentroDeBloco = false;
    let dentroDeLista = false;

    const linhas = texto.split('\n').filter(l => l.trim());

    linhas.forEach(linha => {
        let linhaLimpa = linha.trim();

        // 1. TÍTULO GERAL (Renderizado fora dos blocos)
        if (linhaLimpa.startsWith('TÍTULO:')) {
            htmlFinal += `<h2 class="section-title" style="margin-bottom: 24px;">${linhaLimpa.replace('TÍTULO:', '').trim()}</h2>`;
            return;
        }

        // 2. TÍTULO DE SEÇÃO (Cria um novo cartão .result-block)
        if (linhaLimpa.startsWith('## ')) {
            if (dentroDeLista) { htmlFinal += `</ul>`; dentroDeLista = false; }
            if (dentroDeBloco) { htmlFinal += `</div>`; dentroDeBloco = false; }
            
            dentroDeBloco = true;
            htmlFinal += `
            <div class="result-block ${classeBloco}">
                <div class="result-block__header">
                    <span class="material-symbols-outlined">${iconeBloco}</span>
                    <h3 class="result-section-title">${linhaLimpa.slice(3).trim()}</h3>
                </div>`;
            return;
        }

        // Se ainda não abriu um bloco, abre um padrão
        if (!dentroDeBloco) {
            dentroDeBloco = true;
            htmlFinal += `
            <div class="result-block ${classeBloco}">
                <div class="result-block__header">
                    <span class="material-symbols-outlined">${iconeBloco}</span>
                    <h3 class="result-section-title">Resultado</h3>
                </div>`;
        }

        // 3. SUBTÍTULOS/PERGUNTAS (Trata o "###" que o gestor apontou)
        if (linhaLimpa.startsWith('### ')) {
            if (dentroDeLista) { htmlFinal += `</ul>`; dentroDeLista = false; }
            let textoSub = linhaLimpa.slice(4).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            // Transforma em um parágrafo destacado para manter a hierarquia elegante
            htmlFinal += `<p class="result-paragraph" style="font-weight: 700; color: var(--teal-dark); margin-top: 16px; font-size: 16px;">${textoSub}</p>`;
            return;
        }

        // Aplica tag <strong> ao redor de textos entre **asteriscos**
        let textoFormatado = linhaLimpa.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // 4. ITENS DE LISTA (Agora aceita tanto a bolinha "•" quanto o traço "-")
        if (textoFormatado.startsWith('•') || textoFormatado.startsWith('- ')) {
            if (!dentroDeLista) {
                htmlFinal += `<ul>`;
                dentroDeLista = true;
            }
            let itemLimpo = textoFormatado.startsWith('•') ? textoFormatado.slice(1) : textoFormatado.slice(2);
            htmlFinal += `<li class="result-list-item">${itemLimpo.trim()}</li>`;
        } 
        // 5. PARÁGRAFO PADRÃO
        else {
            if (dentroDeLista) {
                htmlFinal += `</ul>`;
                dentroDeLista = false;
            }
            
            // Tratamento extra de UI: se for uma alternativa de quiz (ex: "a) ", "b) ")
            // Dá um leve recuo na margem esquerda para o design ficar mais limpo
            if (/^[a-dA-D][\.\)]\s/.test(textoFormatado)) {
                htmlFinal += `<p class="result-paragraph" style="margin-left: 16px; margin-bottom: 8px;">${textoFormatado}</p>`;
            } else {
                htmlFinal += `<p class="result-paragraph">${textoFormatado}</p>`;
            }
        }
    });

    // Fecha tags que podem ter ficado abertas no final do laço
    if (dentroDeLista) { htmlFinal += `</ul>`; }
    if (dentroDeBloco) { htmlFinal += `</div>`; }

    output.innerHTML = htmlFinal;
}


// ─── Geração de PDF ───────────────────────────────────────────────────────────

function gerarPDF(texto) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const VERDE        = [42, 124, 118];
    const VERDE_ESCURO = [28, 90, 86];
    const VERDE_SUAVE  = [232, 245, 244];
    const CINZA_BG     = [248, 249, 250];
    const PRETO        = [17, 24, 39];
    const CINZA_TEXTO  = [55, 65, 81];
    const CINZA_MEDIO  = [107, 114, 128];
    const CINZA_CLARO  = [209, 213, 219];
    const BRANCO       = [255, 255, 255];

    const MEsq = 18, MDir = 18, LU = 210 - 18 - 18, YMAX = 278;
    const state = window.GuIA?.uploadState;
    const titulos = { resumo:'Resumo', quiz:'Quiz', pontos:'Pontos-chave', questionario:'Questionário', revisao:'Perguntas de Revisão', simplificar:'Texto Simplificado' };
    const tituloDoc = titulos[acaoAtual] || 'Resultado';

    doc.setFillColor(...BRANCO); doc.rect(0,0,210,297,'F');
    doc.setFillColor(...VERDE); doc.rect(0,0,6,297,'F');
    doc.setFillColor(...VERDE); doc.rect(0,0,210,72,'F');
    doc.setFillColor(...VERDE_ESCURO); doc.rect(0,62,210,10,'F');
    doc.setFillColor(...BRANCO); doc.circle(MEsq+10,28,10,'F');
    doc.setTextColor(...VERDE); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('G',MEsq+7,32);
    doc.setTextColor(...BRANCO); doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.text('GuIA',MEsq+24,26);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(200,235,233); doc.text('Inteligência Documental',MEsq+24,33);
    const badgeW = doc.getTextWidth(tituloDoc.toUpperCase())+10;
    doc.setFillColor(...BRANCO); doc.roundedRect(MEsq,44,badgeW,8,2,2,'F');
    doc.setTextColor(...VERDE); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(tituloDoc.toUpperCase(),MEsq+5,49.5);
    const capaY=95;
    doc.setTextColor(...PRETO); doc.setFont('helvetica','bold'); doc.setFontSize(30); doc.text(tituloDoc,MEsq,capaY);
    if (state?.fileName) { const n=state.fileName.replace(/\.[^/.]+$/,''); doc.setFont('helvetica','normal'); doc.setFontSize(13); doc.setTextColor(...CINZA_MEDIO); doc.text(doc.splitTextToSize(n,LU),MEsq,capaY+12); }
    doc.setDrawColor(...CINZA_CLARO); doc.setLineWidth(0.4); doc.line(MEsq,capaY+26,MEsq+LU,capaY+26);
    const agora=new Date();
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...CINZA_MEDIO);
    doc.text(`Gerado em  ${agora.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})} às ${agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`,MEsq,capaY+34);
    doc.setFillColor(...CINZA_BG); doc.rect(0,272,210,25,'F');
    doc.setTextColor(...CINZA_MEDIO); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text('Gerado por GuIA — Inteligência Documental',MEsq,283); doc.text('Página 1',210-MDir,283,{align:'right'});

    doc.addPage();
    function cab() {
        doc.setFillColor(...VERDE); doc.rect(0,0,3,297,'F');
        doc.setFillColor(...CINZA_BG); doc.rect(3,0,207,14,'F');
        doc.setTextColor(...VERDE); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('GuIA',MEsq,9);
        doc.setTextColor(...CINZA_MEDIO); doc.setFont('helvetica','normal'); doc.text(tituloDoc,210-MDir,9,{align:'right'});
        doc.setDrawColor(...CINZA_CLARO); doc.setLineWidth(0.3); doc.line(3,14,210,14);
    }
    function rod(p,t) {
        doc.setFillColor(...CINZA_BG); doc.rect(3,284,207,13,'F');
        doc.setDrawColor(...CINZA_CLARO); doc.setLineWidth(0.3); doc.line(3,284,210,284);
        doc.setTextColor(...CINZA_MEDIO); doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
        doc.text('Gerado por GuIA — Inteligência Documental',MEsq,291);
        doc.text(`Página ${p} de ${t}`,210-MDir,291,{align:'right'});
    }
    cab();
    let y=26;
    function np() { doc.addPage(); cab(); y=26; }
    function ce(h) { if(y+h>YMAX) np(); }

    texto.split('\n').filter(l=>l.trim()).forEach(linha=>{
        if(linha.startsWith('## ')){ ce(14);y+=4; doc.setFillColor(...VERDE_SUAVE); doc.roundedRect(MEsq-3,y-5.5,LU+6,9,1.5,1.5,'F'); doc.setFillColor(...VERDE); doc.roundedRect(MEsq-3,y-5.5,3,9,1,1,'F'); doc.setTextColor(...VERDE); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(linha.slice(3).toUpperCase(),MEsq+3,y); y+=10; return; }
        if(linha.startsWith('TÍTULO:')){ ce(10); const l=linha.replace('TÍTULO:','').replace(/\*\*(.+?)\*\*/g,'$1').trim(); doc.setTextColor(...VERDE); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.splitTextToSize(l,LU).forEach(s=>{ce(7);doc.text(s,MEsq,y);y+=7;}); y+=3; return; }
        if(linha.startsWith('### ')){ ce(10);y+=3; const l=linha.slice(4).replace(/\*\*(.+?)\*\*/g,'$1'); doc.setTextColor(...CINZA_TEXTO); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.splitTextToSize(l,LU).forEach(s=>{ce(6);doc.text(s,MEsq,y);y+=6;}); y+=1; return; }
        if(/^[a-d]\)/.test(linha.trim())){ ce(6); const l=linha.replace(/\*\*(.+?)\*\*/g,'$1').trim(); doc.setTextColor(...CINZA_MEDIO); doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.splitTextToSize(l,LU-8).forEach((s,i)=>{ce(5.5);doc.text(s,MEsq+(i===0?5:10),y);y+=5.5;}); return; }
        if(linha.startsWith('•')||linha.startsWith('- ')){ ce(6); const l=linha.replace(/^[•\-]\s*/,'').replace(/\*\*(.+?)\*\*/g,'$1'); doc.setFillColor(...VERDE); doc.circle(MEsq+1.5,y-1.5,1.2,'F'); doc.setTextColor(...CINZA_TEXTO); doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.splitTextToSize(l,LU-7).forEach(s=>{ce(5.8);doc.text(s,MEsq+6,y);y+=5.8;}); y+=1; return; }
        const isBold=/^\*\*.+\*\*$/.test(linha.trim()); const l=linha.replace(/\*\*(.+?)\*\*/g,'$1').trim();
        if(isBold){ ce(8);y+=2; doc.setTextColor(...PRETO); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.splitTextToSize(l,LU).forEach(s=>{ce(6);doc.text(s,MEsq,y);y+=6;}); y+=1; return; }
        ce(6); doc.setTextColor(...CINZA_TEXTO); doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.splitTextToSize(l,LU).forEach(s=>{ce(5.8);doc.text(s,MEsq,y);y+=5.8;}); y+=2;
    });

    const tot=doc.internal.getNumberOfPages();
    for(let i=2;i<=tot;i++){doc.setPage(i);rod(i,tot);}
    doc.setPage(1); doc.setFillColor(...CINZA_BG); doc.rect(160,278,50,8,'F');
    doc.setTextColor(...CINZA_MEDIO); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(`Página 1 de ${tot}`,210-MDir,283,{align:'right'});
    const nb=(state?.fileName||'documento').replace(/\.[^/.]+$/,'').replace(/\s+/g,'_');
    doc.save(`${nb}_${(acaoAtual||'resultado').toUpperCase()}.pdf`);
}

// ─── Chat contextual (US08/US09) ─────────────────────────────────────────────

async function enviarMensagemChat(pergunta) {
    if (!pergunta) return;

    const state = window.GuIA?.uploadState;
    if (!state || !state.chunks || state.chunks.length === 0) {
        exibirMensagemChat('sistema', 'Faça o upload de um documento primeiro para usar o chat.');
        return;
    }

    exibirMensagemChat('usuario', pergunta);
    const promptInput = document.getElementById('promptInput');
    const sendBtn     = document.getElementById('sendBtn');
    if (promptInput) promptInput.disabled = true;
    if (sendBtn)     sendBtn.disabled     = true;

    const palavras  = pergunta.toLowerCase().split(/\s+/).filter(p => p.length > 3);
    const chunksRel = state.chunks
        .map((c, i) => ({ c, score: palavras.filter(p => c.toLowerCase().includes(p)).length, i }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.c);

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
        const resposta = await window.GuIA.resumo.chamarAPIChat(mensagens);
        removerUltimaMensagemSistema();
        exibirMensagemChat('assistente', resposta);
    } catch (erro) {
        removerUltimaMensagemSistema();
        exibirMensagemChat('sistema', '⚠️ ' + traduzirErro(erro));
    } finally {
        if (promptInput) { promptInput.disabled = false; promptInput.focus(); }
        if (sendBtn)     sendBtn.disabled = false;
    }
}

function exibirMensagemChat(tipo, texto) {
    const historico = document.getElementById('chat-historico');
    if (!historico) return;
    historico.style.display = 'flex';
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${tipo}`;
    msg.innerHTML = tipo === 'assistente'
        ? texto.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
        : texto;
    historico.appendChild(msg);
    requestAnimationFrame(() => {
        historico.scrollTo({ top: historico.scrollHeight, behavior: 'smooth' });
    });
}

function removerUltimaMensagemSistema() {
    const historico = document.getElementById('chat-historico');
    if (!historico) return;
    const msgs = historico.querySelectorAll('.chat-msg--sistema');
    if (msgs.length) msgs[msgs.length - 1].remove();
}
