require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query(`
    CREATE TABLE IF NOT EXISTS votos (
        id SERIAL PRIMARY KEY,
        resposta VARCHAR(10) NOT NULL,
        ip_usuario VARCHAR(50) NOT NULL,
        data_voto TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`).catch(console.error);

app.post('/votar', async (req, res) => {
    const { resposta } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (resposta !== 'sim' && resposta !== 'nao') return res.status(400).json({ erro: 'Inválido' });

    try {
        const check = await pool.query('SELECT id FROM votos WHERE ip_usuario = $1', [ip]);
        if (check.rows.length > 0) return res.status(403).json({ erro: 'Você já votou!' });

        await pool.query('INSERT INTO votos (resposta, ip_usuario) VALUES ($1, $2)', [resposta, ip]);
        res.status(201).json({ mensagem: 'Sucesso!' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

app.listen(process.env.PORT || 3000);
