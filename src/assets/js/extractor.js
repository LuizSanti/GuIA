// Configuração do PDF.js para usar o worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Lógica de extração de texto com suporte a OCR para PDFs
async function extrairTextoDeArquivo(file) {
    const extensao = file.name.split('.').pop().toLowerCase();

    if (extensao === 'txt') {
        return await lerTXT(file);
    } else if (extensao === 'pdf') {
        return await lerPDF(file);
    } else {
        throw new Error("Formato de arquivo não suportado.");
    }
}

// Lógica interna para TXT (simples leitura de texto)
function lerTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Erro ao ler o arquivo TXT."));
        reader.readAsText(file);
    });
}

// Lógica interna para PDF (leitura de texto + OCR para páginas vazias)
async function lerPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textoCompleto = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const textoPagina = content.items.map(item => item.str).join(" ");
        
        if (textoPagina.trim().length > 0) {
            textoCompleto += textoPagina + "\n";
        } else {
            const viewport = page.getViewport({ scale: 2 }); // Aumenta a escala para melhorar a precisão do OCR
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            // Realiza OCR usando Tesseract.js
            const resultadoOCR = await Tesseract.recognize(canvas, 'por');
            textoCompleto += resultadoOCR.data.text + "\n";
        }
    }
    return textoCompleto;
}
// 