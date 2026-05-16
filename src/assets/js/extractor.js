// extractor.js
// [Sprint 3] Fallback OCR com Tesseract.js para PDFs escaneados
// Responsável: Mariah
//
// Fluxo:
//  1. Tenta extrair texto de cada página via pdf.js
//  2. Se a página retornar string vazia → aciona OCR com Tesseract.js
//  3. Na primeira página que acionar OCR, exibe aviso ao usuário (critério de aceite)

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── Aviso de OCR lento ───────────────────────────────────────────────────────

function exibirAvisoOCR() {
    // Evita duplicar o aviso se já estiver na tela
    if (document.getElementById('ocr-aviso')) return;

    const aviso = document.createElement('div');
    aviso.id        = 'ocr-aviso';
    aviso.className = 'ocr-aviso';
    aviso.setAttribute('role', 'status');
    aviso.innerHTML = `
        <span class="material-symbols-outlined">schedule</span>
        <span>PDF escaneado detectado — o processamento via OCR pode levar alguns minutos.</span>
    `;

    // Injeta dentro do card de processamento se existir, senão no body
    const alvo = document.querySelector('.progress-info') || document.body;
    alvo.appendChild(aviso);
}

function removerAvisoOCR() {
    const aviso = document.getElementById('ocr-aviso');
    if (aviso) aviso.remove();
}

// ─── Extração de texto ────────────────────────────────────────────────────────

async function extrairTextoDeArquivo(file) {
    removerAvisoOCR(); // limpa aviso de chamada anterior

    const extensao = file.name.split('.').pop().toLowerCase();

    if (extensao === 'txt') {
        return await lerTXT(file);
    } else if (extensao === 'pdf') {
        return await lerPDF(file);
    } else {
        throw new Error('Formato de arquivo não suportado.');
    }
}

function lerTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo TXT.'));
        reader.readAsText(file);
    });
}

async function lerPDF(file) {
    const arrayBuffer  = await file.arrayBuffer();
    const pdf          = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textoCompleto  = '';
    let ocrAtivado     = false;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        const textoPagina = content.items.map(item => item.str).join(' ');

        if (textoPagina.trim().length > 0) {
            // Página com texto selecionável — caminho normal
            textoCompleto += textoPagina + '\n';
        } else {
            // [Sprint 3] Página sem texto → fallback OCR
            // Exibe aviso ao usuário na primeira ocorrência (critério de aceite)
            if (!ocrAtivado) {
                ocrAtivado = true;
                exibirAvisoOCR();
                console.warn('[GuIA] PDF escaneado detectado — acionando OCR com Tesseract.js');
            }

            const viewport = page.getViewport({ scale: 2 }); // escala 2× melhora precisão
            const canvas   = document.createElement('canvas');
            const context  = canvas.getContext('2d');
            canvas.height  = viewport.height;
            canvas.width   = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            const resultadoOCR = await Tesseract.recognize(canvas, 'por');
            textoCompleto += resultadoOCR.data.text + '\n';
        }
    }

    return textoCompleto;
}