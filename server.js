require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Permite que o seu site (Front-end) envie dados para cá
app.use(cors());
app.use(express.json());

// Configuração da conexão com o seu Banco de Dados do Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Obrigatório para o Render
});

// Cria a tabela automaticamente no banco de dados caso ela não exista
const criarTabela = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS votos (
                id SERIAL PRIMARY KEY,
                resposta VARCHAR(10) NOT NULL,
                ip_usuario VARCHAR(50) NOT NULL,
                data_voto TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela "votos" verificada ou criada com sucesso.');
    } catch (erro) {
        console.error('Erro ao criar tabela no banco:', erro);
    }
};
criarTabela();

// Rota principal que recebe o voto do Front-end
app.post('/votar', async (req, res) => {
    const { resposta } = req.body;
    
    // Captura o IP do computador do usuário para fazer a trava
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Validação simples para garantir que só aceita "sim" ou "nao"
    if (resposta !== 'sim' && resposta !== 'nao') {
        return res.status(400).json({ erro: 'Resposta inválida.' });
    }

    try {
        // TRAVA DE SEGURANÇA: Verifica se esse IP já existe no banco de dados
        const ipCheck = await pool.query('SELECT id FROM votos WHERE ip_usuario = $1', [ip]);
        
        if (ipCheck.rows.length > 0) {
            return res.status(403).json({ erro: 'Atenção: Este computador já votou.' });
        }

        // Se o IP for novo, insere o voto e o IP no banco de dados
        await pool.query('INSERT INTO votos (resposta, ip_usuario) VALUES ($1, $2)', [resposta, ip]);
        
        return res.status(201).json({ mensagem: 'Voto computado com sucesso!' });
        
    } catch (erro) {
        console.error('Erro ao salvar voto:', erro);
        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

// Configura a porta que o Render vai usar para ligar o site
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando com sucesso na porta ${PORT}`);
});
