const { pool } = require('./backend/src/database/db');

async function migrate() {
  console.log('🚀 Iniciando migração de Layouts...');
  try {
    await pool.query(`
      ALTER TABLE playlists 
      ADD COLUMN IF NOT EXISTS layout VARCHAR(50) DEFAULT 'fullscreen',
      ADD COLUMN IF NOT EXISTS footer_text TEXT,
      ADD COLUMN IF NOT EXISTS show_clock BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS show_weather BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20) DEFAULT '#818cf8';
    `);
    console.log('✅ Colunas de Layout adicionadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    process.exit();
  }
}

migrate();
