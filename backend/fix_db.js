const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:adminpassword@localhost:5432/digital_signage' });
pool.query("ALTER TABLE playlists ADD COLUMN IF NOT EXISTS ticker_font_weight VARCHAR(20) DEFAULT '600';")
  .then(() => { console.log('Column added'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
