
document.addEventListener('DOMContentLoaded', () => {
    // Dropdown nativo da tela inicial (Preservado)
    const dropdownToggle = document.getElementById('dropdownToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('open');
        });
        
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('open');
        });
    }

    // Ativação visual do microfone
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
        micBtn.addEventListener('click', () => {
            micBtn.classList.toggle('listening');
        });
    }
});

// Controle de telas limpo e fluído
function showScreen(screenId) {
    // Esconde todas as telas
    document.querySelectorAll('.screen-container').forEach(s => s.style.display = 'none');
    
    // Mostra a tela selecionada
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
        target.style.display = 'block';
    }
    
    // Atualiza o estado "active" na sidebar apenas se estiver na Home
    const navUpload = document.getElementById('nav-upload');
    if (navUpload) {
        if (screenId === 'upload') {
            navUpload.classList.add('active');
        } else {
            navUpload.classList.remove('active');
        }
    }

    // Gerencia o alinhamento vertical flexível para telas longas de resultado
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        if (screenId === 'results' || screenId === 'processing') {
            contentArea.classList.add('scrollable-view');
        } else {
            contentArea.classList.remove('scrollable-view');
        }
    }
    
    // Simulação de tempo de processamento para propósitos de teste (85% Sucesso / 15% Erro)
    if (screenId === 'processing') {
        const fill = document.querySelector('.progress-fill');
        if (fill) fill.style.width = '75%';
        
        setTimeout(() => {
            Math.random() > 0.15 ? showScreen('results') : showScreen('error');
        }, 3000);
    }
}
