// GuIA — Servidor proxy para esconder a chave da API Groq
// O frontend chama /api/chat e /api/completions — nunca vê a chave.

'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

require('dotenv').config();                   // lê o arquivo .env

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──────────────────────────────────────────────────────────────

app.use(cors());                              // permite chamadas do mesmo domínio
app.use(express.json({ limit: '2mb' }));      // parse do body JSON (PDFs grandes geram prompts grandes)

// ── Servir o frontend estático ───────────────────────────────────────────────
// O Express entrega todos os arquivos do GuIA (index.html, CSS, JS, imagens).
app.use(express.static(path.join(__dirname, '..')));

// ── Rota proxy: /api/groq ────────────────────────────────────────────────────
// O frontend manda o payload normalmente (model, messages, temperature…),
// mas SEM Authorization. O servidor injeta a chave antes de repassar à Groq.
app.post('/api/groq', async (req, res) => {
    // 1. Tenta obter a chave enviada pelo cliente via cabeçalho Authorization
    let apiKey = req.headers['authorization'] || req.headers['Authorization'];
    
    // Se o cliente mandou "Bearer gsk_...", remove o prefixo "Bearer "
    if (apiKey && apiKey.startsWith('Bearer ')) {
        apiKey = apiKey.slice(7).trim();
    }
    
    // 2. Se o cliente não mandou chave, usa a do servidor (.env ou ambiente da Azure)
    if (!apiKey) {
        apiKey = process.env.GROQ_API_KEY;
    }

    if (!apiKey) {
        return res.status(401).json({ 
            error: 'Nenhuma chave API Groq configurada. Por favor, forneça uma chave nas Configurações da GuIA ou configure GROQ_API_KEY no servidor.' 
        });
    }

    try {
        // Node 18+ tem fetch nativo. Se usar Node 16, instale node-fetch.
        const resposta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(req.body)
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            return res.status(resposta.status).json(dados);
        }

        res.json(dados);

    } catch (err) {
        console.error('Erro ao chamar Groq:', err);
        res.status(502).json({ error: 'Falha na comunicação com a API Groq.' });
    }
});

// ── Iniciar ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`GuIA rodando em http://localhost:${PORT}`);
});
