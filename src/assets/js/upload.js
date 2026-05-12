// upload.js
// Gerencia a zona de upload: seleção, drag-and-drop, validação, leitura e preview do arquivo.
// Regras de validação:
//  - Tipos permitidos: PDF e TXT (verificação dupla: MIME + extensão)
//  - Tamanho máximo: 500 MB

'use strict';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ALLOWED_TYPES      = ['application/pdf', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.pdf', '.txt'];
const MAX_SIZE_BYTES     = 500 * 1024 * 1024; // 500 MB

// ─── Estado da aplicação ──────────────────────────────────────────────────────

/**
 * appState centraliza tudo que a aplicação precisa saber sobre o arquivo atual.
 * Outros módulos (processamento, resultados) podem ler window.GuIA.uploadState.
 */
const appState = {
    file:        null,  // objeto File | null
    fileName:    '',
    fileSize:    0,
    fileType:    '',    // 'pdf' | 'txt' | ''
    fileContent: '',    // conteúdo lido pelo FileReader
    chunks:      [],    // fragmentos gerados pelo processador de texto
    stats:       null,  // estatísticas retornadas pelo textProcessor
    isReady:     false, // true quando pronto para envio
};

function resetState() {
    Object.assign(appState, {
        file: null, fileName: '', fileSize: 0,
        fileType: '', fileContent: '', chunks: [], stats: null, isReady: false,
    });
}

// ─── Referências ao DOM ───────────────────────────────────────────────────────

const uploadZone    = document.getElementById('uploadZone');
const fileInput     = document.getElementById('fileInput');
const btnSelect     = document.getElementById('btnSelect');
const uploadHint    = document.getElementById('uploadHint');
const uploadActions = document.getElementById('uploadActions');
const actionButtons = document.querySelectorAll('.btn-action[data-action]');

// ─── Validação ────────────────────────────────────────────────────────────────

/**
 * Valida tipo (MIME + extensão) e tamanho.
 * Dupla checagem cobre sistemas operacionais que enviam MIME genérico.
 * @param {File} file
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateFile(file) {
    const ext    = '.' + file.name.split('.').pop().toLowerCase();
    const mimeOk = ALLOWED_TYPES.includes(file.type);
    const extOk  = ALLOWED_EXTENSIONS.includes(ext);

    if (!mimeOk && !extOk) {
        return {
            valid: false,
            reason: `Formato "${ext || file.type}" não suportado. Envie apenas .pdf ou .txt.`,
        };
    }

    if (file.size > MAX_SIZE_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            reason: `Arquivo muito grande (${mb} MB). O limite é 500 MB.`,
        };
    }

    return { valid: true };
}

// ─── FileReader API ───────────────────────────────────────────────────────────

/**
 * Lê o arquivo, extrai o texto via extractor.js e processa os chunks via textProcessor.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  CONTRIBUIÇÃO DE MARIAH — integrada e adaptada neste módulo          ║
 * ║                                                                      ║
 * ║  Mariah propôs o fluxo assíncrono com três etapas numeradas:         ║
 * ║    1. Validação de pré-condições (módulos carregados)                ║
 * ║    2. Extração de texto via extrairTextoDeArquivo()                  ║
 * ║    3. Atualização do estado global                                   ║
 * ║                                                                      ║
 * ║  Alterações feitas na integração:                                    ║
 * ║  - O callback reader.onload foi mantido como async/await             ║
 * ║    (padrão reforçado por Mariah)                                     ║
 * ║  - A verificação de pré-condição de extrairTextoDeArquivo foi        ║
 * ║    mantida (proposta por Mariah) e estendida para textProcessor      ║
 * ║  - Substituído alert() pelo showError() já existente no módulo       ║
 * ║  - Conectado ao renderFilePreview() e updateActionButtons()          ║
 * ║    para manter consistência visual com o restante do fluxo           ║
 * ║  - Removido o segundo DOMContentLoaded duplicado (que causava        ║
 * ║    dois listeners no mesmo fileInput.change)                         ║
 * ║  - appState.fileContent agora recebe o resultado bruto do reader     ║
 * ║    (base64 para PDF, texto para TXT), não o texto extraído           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 *  - .txt  → readAsText (UTF-8)
 *  - .pdf  → readAsDataURL (base64, para envio futuro à API)
 * @param {File} file
 */
function readFile(file) {
    const reader = new FileReader();
    const ext    = file.name.split('.').pop().toLowerCase();

    uploadZone.classList.add('uploading');

    // [MARIAH] async para permitir await dentro do callback
    reader.onload = async (e) => {
        try {
            // [MARIAH] Etapa 1 — verificação de pré-condição do módulo extractor
            // [ALTERAÇÃO] Estendida para cobrir também o textProcessor
            if (typeof extrairTextoDeArquivo !== 'function') {
                throw new Error('Módulo extractor.js não carregado.');
            }
            if (
                !window.GuIA?.textProcessor ||
                typeof window.GuIA.textProcessor.prepararTexto !== 'function'
            ) {
                throw new Error('Módulo textProcessor não carregado.');
            }

            // [MARIAH] Etapa 2 — extração de texto via extractor.js
            const texto = await extrairTextoDeArquivo(file);

            // Fragmenta o texto e coleta estatísticas via textProcessor
            const { chunks, stats } = window.GuIA.textProcessor.prepararTexto(texto);

            // [MARIAH] Etapa 3 — atualização do estado global
            // [ALTERAÇÃO] Usa appState em vez de variáveis locais isoladas,
            // garantindo que outros módulos (resultados, processamento) leiam
            // o estado correto via window.GuIA.uploadState
            appState.fileContent = e.target.result; // base64 (pdf) ou texto cru (txt)
            appState.chunks      = chunks;
            appState.stats       = stats;
            appState.isReady     = true;

            uploadZone.classList.remove('uploading');

            // [ALTERAÇÃO] renderFilePreview() monta o card com nome e tamanho
            // dinamicamente — os elementos .file-card__name e .file-card__size
            // só existem no DOM após essa chamada, então não é possível
            // atribuir .textContent antes dela (como o código original de Mariah fazia)
            renderFilePreview();
            updateActionButtons(true);

        } catch (erro) {
            uploadZone.classList.remove('uploading');
            // [ALTERAÇÃO] Substituído alert() por showError(), que insere
            // mensagem acessível no DOM com role="alert" e ícone visual
            showError('Não foi possível processar o arquivo: ' + erro.message);
            resetState();
            updateActionButtons(false);
        }
    };

    reader.onerror = () => {
        uploadZone.classList.remove('uploading');
        showError('Não foi possível ler o arquivo. Tente novamente.');
        resetState();
        updateActionButtons(false);
    };

    ext === 'txt'
        ? reader.readAsText(file, 'UTF-8')
        : reader.readAsDataURL(file);
}

// ─── Fluxo principal ──────────────────────────────────────────────────────────

function handleFile(file) {
    clearError();

    const result = validateFile(file);

    if (!result.valid) {
        showError(result.reason);
        resetState();
        renderFilePreview();
        updateActionButtons(false);
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    Object.assign(appState, {
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: ext,
        isReady:  false,
    });

    readFile(file);
}

// ─── Renderização ─────────────────────────────────────────────────────────────

function formatSize(bytes) {
    return bytes < 1024 * 1024
        ? (bytes / 1024).toFixed(1) + ' KB'
        : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Após upload válido: insere o card do arquivo dentro de #uploadZone
 * e oculta o hint + botões de seleção.
 */
function renderFilePreview() {
    // Remove card anterior, se existir
    const old = document.getElementById('fileCard');
    if (old) old.remove();

    if (!appState.file) {
        // Restaura estado original da zona
        if (uploadHint)    uploadHint.style.display    = '';
        if (uploadActions) uploadActions.style.display = '';
        uploadZone.classList.remove('has-file');
        return;
    }

    // Oculta hint e botões de seleção
    if (uploadHint)    uploadHint.style.display    = 'none';
    if (uploadActions) uploadActions.style.display = 'none';
    uploadZone.classList.add('has-file');

    // Cria o card
    const card = document.createElement('div');
    card.id        = 'fileCard';
    card.className = 'file-card';
    card.innerHTML = `
        <div class="file-card__badge file-card__badge--${appState.fileType}">
            <span class="material-symbols-outlined">
                ${appState.fileType === 'pdf' ? 'picture_as_pdf' : 'text_snippet'}
            </span>
            <span>${appState.fileType.toUpperCase()}</span>
        </div>
        <div class="file-card__info">
            <span class="file-card__name" title="${appState.fileName}">
                ${appState.fileName}
            </span>
            <span class="file-card__size">${formatSize(appState.fileSize)}</span>
        </div>
        <button
            class="file-card__remove"
            id="btnRemoveFile"
            type="button"
            title="Remover arquivo"
            aria-label="Remover arquivo"
        >
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

    uploadZone.appendChild(card);

    document.getElementById('btnRemoveFile').addEventListener('click', (e) => {
        e.stopPropagation();
        handleRemove();
    });
}

/**
 * Habilita / desabilita os botões de ação.
 * Usa a classe .btn-action--disabled para feedback visual via CSS.
 */
function updateActionButtons(enabled) {
    actionButtons.forEach(btn => {
        btn.disabled = !enabled;
        btn.classList.toggle('btn-action--disabled', !enabled);
    });
}

// ─── Feedback de erro ─────────────────────────────────────────────────────────

function showError(message) {
    clearError();
    const el = document.createElement('p');
    el.id        = 'uploadError';
    el.className = 'upload-error-msg';
    el.setAttribute('role', 'alert');
    el.innerHTML = `
        <span class="material-symbols-outlined">warning</span>
        ${message}
    `;
    uploadZone.appendChild(el);
    uploadZone.classList.add('upload-zone--error');
}

function clearError() {
    const el = document.getElementById('uploadError');
    if (el) el.remove();
    uploadZone.classList.remove('upload-zone--error');
}

// ─── Remoção ──────────────────────────────────────────────────────────────────

function handleRemove() {
    resetState();
    fileInput.value = '';
    clearError();
    renderFilePreview();
    updateActionButtons(false);
}

// ─── Eventos: clique ──────────────────────────────────────────────────────────

// Clique na zona (sem arquivo) abre o seletor
uploadZone.addEventListener('click', () => {
    if (!appState.file) fileInput.click();
});

// Botão "Selecione Arquivo"
btnSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

// Dropdown: filtra tipo antes de abrir o seletor
document.querySelectorAll('#dropdownMenu button[data-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type  = btn.dataset.type;
        fileInput.accept = type === 'pdf' ? '.pdf' : '.txt';
        document.getElementById('dropdownMenu').classList.remove('open');
        fileInput.click();
    });
});

// [ALTERAÇÃO] Listener único para fileInput.change — o bloco de Mariah
// registrava um segundo listener dentro de DOMContentLoaded, causando
// processamento duplo a cada seleção de arquivo. Mantido apenas este.
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

// ─── Eventos: arrastar e soltar ───────────────────────────────────────────────

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
    uploadZone.addEventListener(ev, preventDefaults);
    // Bloqueia comportamento padrão do navegador (abrir arquivo) fora da zona
    document.addEventListener(ev, preventDefaults);
});

uploadZone.addEventListener('dragenter', () => {
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragover', () => {
    // Dispara continuamente; mantém a classe
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', (e) => {
    // Remove apenas quando o cursor sai da zona de verdade
    if (!uploadZone.contains(e.relatedTarget)) {
        uploadZone.classList.remove('drag-over');
    }
});

uploadZone.addEventListener('drop', (e) => {
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// ─── Inicialização ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Garante botões desabilitados ao carregar a página
    updateActionButtons(false);
});

// ─── Expõe estado globalmente para outros módulos ─────────────────────────────

window.GuIA = window.GuIA || {};
window.GuIA.uploadState = appState;