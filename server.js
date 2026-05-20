require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors({ origin: '*' })); // Permite que seu index.html acesse a API de qualquer lugar
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Obrigatório para conexões seguras com o Supabase
});

app.post('/votar', async (req, res) => {
    const { resposta } = req.body;
    // Pega o IP real do usuário se estiver hospedado em serviços como Render ou Vercel
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (resposta !== 'sim' && resposta !== 'nao') {
        return res.status(400).json({ erro: 'Resposta inválida.' });
    }

    try {
        const check = await pool.query('SELECT id FROM votos WHERE ip_usuario = $1', [ip]);
        if (check.rows.length > 0) {
            return res.status(403).json({ erro: 'Você já votou!' });
        }

        await pool.query('INSERT INTO votos (resposta, ip_usuario) VALUES ($1, $2)', [resposta, ip]);
        res.status(201).json({ mensagem: 'Sucesso!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
