/**
 * Script de Automação de Compilação, Renomeação e Release do Aplicativo Android
 * 
 * Este script automatiza o processo de:
 * 1. Leitura e incremento da versão no build.gradle e no frontend React.
 * 2. Compilação do código React (Web) e sincronização com o Capacitor.
 * 3. Compilação nativa do APK através do Gradle (sem precisar abrir o Android Studio).
 * 4. Cópia e renomeação do APK para a pasta /releases.
 * 5. Criação de Release no GitHub e upload automático do APK como asset.
 * 6. Atualização direta do banco de dados para atualizar o link no Painel Digital.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const https = require('https');

// Configurações de caminhos
const ROOT_DIR = __dirname;
const GRADLE_PATH = path.join(ROOT_DIR, 'frontend', 'android', 'app', 'build.gradle');
const UPDATE_MANAGER_PATH = path.join(ROOT_DIR, 'frontend', 'src', 'components', 'UpdateManager.jsx');
const APK_SOURCE_PATH = path.join(ROOT_DIR, 'frontend', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const RELEASES_DIR = path.join(ROOT_DIR, 'releases');

// Carrega variáveis do arquivo .env manualmente (para evitar dependência do dotenv no root)
function loadEnv() {
  const envPath = path.join(ROOT_DIR, 'backend', '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val;
      }
    });
  }
  return env;
}

const envVars = loadEnv();

// Cria interface de terminal interativa
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Função para exibir textos coloridos no console
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m"
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

// Obter repositório do GitHub a partir do git remote
function getGitHubRepo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    // Exemplo: https://github.com/usuario/repositorio.git ou git@github.com:usuario/repositorio.git
    const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
  } catch (e) {
    // Falhou ou não está em um repositório git
  }
  return envVars.GITHUB_REPO || '';
}

// Helper para fazer requisições HTTPS para a API do GitHub
function githubRequest(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method: method,
      headers: {
        'User-Agent': 'Digital-Signage-Release-Script',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Erro HTTP ${res.statusCode}: ${parsed.message || data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Upload de asset binário para o Release do GitHub
function uploadReleaseAsset(uploadUrlTemplate, filePath, fileName, token) {
  return new Promise((resolve, reject) => {
    // O uploadUrlTemplate vem no formato: https://uploads.github.com/repos/owner/repo/releases/id/assets{?name,label}
    const uploadUrl = uploadUrlTemplate.replace(/\{\?name,label\}/, '') + `?name=${encodeURIComponent(fileName)}`;
    const parsedUrl = new URL(uploadUrl);
    const fileStats = fs.statSync(filePath);
    const fileStream = fs.readFileSync(filePath);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'Digital-Signage-Release-Script',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileStats.size
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Erro HTTP ${res.statusCode} ao enviar asset: ${parsed.message || data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(fileStream);
    req.end();
  });
}

async function main() {
  log("\n=======================================================", colors.magenta + colors.bright);
  log("🚀 ASSISTENTE DE COMPILAÇÃO E ATUALIZAÇÃO DO APLICATIVO", colors.magenta + colors.bright);
  log("=======================================================\n", colors.magenta + colors.bright);

  // 1. Verificar Versão Atual no build.gradle
  if (!fs.existsSync(GRADLE_PATH)) {
    log(`❌ Arquivo build.gradle não encontrado em: ${GRADLE_PATH}`, colors.red);
    process.exit(1);
  }

  let gradleContent = fs.readFileSync(GRADLE_PATH, 'utf8');
  const versionCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);
  const versionNameMatch = gradleContent.match(/versionName\s+"([^"]+)"/);

  if (!versionCodeMatch || !versionNameMatch) {
    log("❌ Não foi possível ler as configurações de versão no build.gradle.", colors.red);
    process.exit(1);
  }

  const currentCode = parseInt(versionCodeMatch[1], 10);
  const currentName = versionNameMatch[1];

  log(`ℹ️  Versão Atual do Aplicativo (no build.gradle):`, colors.cyan);
  log(`   - Código da Versão (versionCode): ${currentCode}`, colors.cyan);
  log(`   - Nome da Versão   (versionName): ${currentName}`, colors.cyan);

  // Sugerir próxima versão
  let suggestedName = currentName;
  const parts = currentName.split('.');
  if (parts.length >= 2) {
    const lastIdx = parts.length - 1;
    const lastNum = parseInt(parts[lastIdx], 10);
    if (!isNaN(lastNum)) {
      parts[lastIdx] = (lastNum + 1).toString();
      suggestedName = parts.join('.');
    }
  } else {
    suggestedName = currentName + ".1";
  }

  const newCode = currentCode + 1;

  // Perguntar a nova versão
  let newName = await question(`\nDigite o nome da NOVA versão [Sugestão: ${suggestedName}]: `);
  newName = newName.trim() || suggestedName;

  log(`\nNova versão definida: v${newName} (versionCode: ${newCode})`, colors.green);

  // 2. Atualizar arquivos locais
  log("\n✍️  Atualizando arquivos de configuração...", colors.yellow);
  
  // Atualiza build.gradle
  gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${newCode}`);
  gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${newName}"`);
  fs.writeFileSync(GRADLE_PATH, gradleContent, 'utf8');
  log("   ✅ frontend/android/app/build.gradle atualizado!", colors.green);

  // Atualiza UpdateManager.jsx no React
  if (fs.existsSync(UPDATE_MANAGER_PATH)) {
    let umContent = fs.readFileSync(UPDATE_MANAGER_PATH, 'utf8');
    umContent = umContent.replace(/const APP_VERSION = '[^']+'/, `const APP_VERSION = '${newName}'`);
    fs.writeFileSync(UPDATE_MANAGER_PATH, umContent, 'utf8');
    log("   ✅ frontend/src/components/UpdateManager.jsx atualizado!", colors.green);
  } else {
    log("   ⚠️  UpdateManager.jsx não encontrado para atualizar a constante de versão. Pulando.", colors.yellow);
  }

  // 3. Perguntar sobre build do React
  const buildReact = await question("\n🔄 Deseja compilar o React e sincronizar com o Android (npm run build + cap sync)? (S/n): ");
  if (buildReact.toLowerCase() !== 'n') {
    log("\n📦 Compilando React e sincronizando Capacitor...", colors.yellow);
    try {
      log("👉 Executando build do frontend...", colors.blue);
      execSync('npm run build --workspace=frontend', { stdio: 'inherit', cwd: ROOT_DIR });
      
      log("👉 Sincronizando com o Android...", colors.blue);
      execSync('npx cap sync android', { stdio: 'inherit', cwd: path.join(ROOT_DIR, 'frontend') });
      log("✅ Build React e Sync concluídos com sucesso!", colors.green);
    } catch (err) {
      log("❌ Erro durante o processo de build/sync.", colors.red);
      console.error(err.message);
      process.exit(1);
    }
  }

  // 4. Perguntar sobre compilação do APK nativo
  const buildApk = await question("\n📱 Deseja compilar o APK nativo agora? (S/n): ");
  if (buildApk.toLowerCase() !== 'n') {
    log("\n🛠️  Compilando APK usando o Gradle Wrapper local...", colors.yellow);
    try {
      const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
      const gradleCwd = path.join(ROOT_DIR, 'frontend', 'android');
      log(`👉 Executando ${gradlewCmd} assembleDebug...`, colors.blue);
      execSync(`${gradlewCmd} assembleDebug`, { stdio: 'inherit', cwd: gradleCwd });
      log("✅ APK nativo compilado com sucesso!", colors.green);
    } catch (err) {
      log("❌ Erro ao compilar APK nativo via Gradle.", colors.red);
      console.error(err.message);
      process.exit(1);
    }
  }

  // 5. Copiar e renomear o APK
  log("\n📂 Localizando e renomeando o arquivo APK...", colors.yellow);
  if (!fs.existsSync(APK_SOURCE_PATH)) {
    log(`❌ Arquivo APK gerado não encontrado em: ${APK_SOURCE_PATH}`, colors.red);
    log("   Certifique-se de compilar o APK no Android Studio ou responda SIM na pergunta anterior.", colors.yellow);
    process.exit(1);
  }

  if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
  }

  const apkDestName = `PainelDigital-v${newName}.apk`;
  const apkDestPath = path.join(RELEASES_DIR, apkDestName);
  fs.copyFileSync(APK_SOURCE_PATH, apkDestPath);

  log(`✅ APK copiado e renomeado com sucesso!`, colors.green);
  log(`   📍 Destino: ${apkDestPath}`, colors.cyan + colors.bright);

  // 6. Enviar para o GitHub
  const pushGitHub = await question("\n🐙 Deseja criar uma Release e enviar o APK para o GitHub automaticamente? (S/n): ");
  let downloadUrl = '';
  
  if (pushGitHub.toLowerCase() !== 'n') {
    const repo = getGitHubRepo();
    if (!repo) {
      log("❌ Repositório do GitHub não configurado no git remote nem nas variáveis de ambiente.", colors.red);
    } else {
      log(`   Reposítório detectado: ${repo}`, colors.cyan);
      
      let token = process.env.GITHUB_TOKEN || envVars.GITHUB_TOKEN;
      if (!token) {
        log("\n⚠️  Token do GitHub (GITHUB_TOKEN) não encontrado nas variáveis de ambiente.", colors.yellow);
        log("Para criar Releases automáticas, você precisa de um Personal Access Token com acesso 'repo'.");
        const tokenInput = await question("Por favor, cole seu Token do GitHub (ou aperte Enter para pular): ");
        token = tokenInput.trim();
      }

      if (token) {
        log("\n☁️  Criando Release no GitHub...", colors.yellow);
        try {
          const tag = `v${newName}`;
          const releaseBody = {
            tag_name: tag,
            target_commitish: 'main',
            name: `Versão ${newName}`,
            body: `Atualização automática do aplicativo Painel Digital.\n\n- Versão Name: ${newName}\n- Versão Code: ${newCode}\n- Compilado em: ${new Date().toLocaleString('pt-BR')}`,
            draft: false,
            prerelease: false
          };

          const releaseResponse = await githubRequest('POST', `/repos/${repo}/releases`, releaseBody, token);
          log(`   Release '${tag}' criada no GitHub com sucesso!`, colors.green);

          log("👉 Fazendo upload do arquivo APK para o GitHub...", colors.yellow);
          const uploadRes = await uploadReleaseAsset(releaseResponse.upload_url, apkDestPath, apkDestName, token);
          downloadUrl = uploadRes.browser_download_url;

          log("✅ APK carregado e anexado ao GitHub com sucesso!", colors.green);
          log(`   🔗 Link de Download: ${downloadUrl}`, colors.cyan + colors.bright);
        } catch (err) {
          log("❌ Erro ao enviar para o GitHub.", colors.red);
          console.error(err.message);
        }
      } else {
        log("⚠️  Upload para o GitHub cancelado por falta de Token.", colors.yellow);
      }
    }
  }

  // 7. Atualizar no banco de dados local
  const updateDb = await question("\n💾 Deseja atualizar a versão e o link de download no banco de dados local do sistema? (s/N): ");
  if (updateDb.toLowerCase() === 's') {
    log("\n🗄️  Conectando ao banco de dados PostgreSQL...", colors.yellow);
    try {
      // Tenta carregar o módulo 'pg' de dentro do workspace backend
      const pgPath = path.join(ROOT_DIR, 'backend', 'node_modules', 'pg');
      if (!fs.existsSync(pgPath)) {
        throw new Error("Módulo 'pg' não encontrado no backend. Execute 'npm install' primeiro.");
      }
      
      const { Pool } = require(pgPath);
      const connectionString = envVars.DATABASE_URL || 'postgresql://postgres:adminpassword@localhost:5432/digital_signage';
      const pool = new Pool({ connectionString });
      
      const finalUrl = downloadUrl || await question("Digite a URL de download manual do APK (ex: https://...): ");

      if (!finalUrl) {
        log("⚠️  Atualização do banco cancelada: nenhuma URL foi fornecida.", colors.yellow);
        pool.end();
      } else {
        const queryStr = `
          UPDATE system_settings 
          SET latest_app_version = $1, 
              app_download_url = $2, 
              app_update_message = $3,
              updated_at = NOW() 
          WHERE id = 1
          RETURNING *
        `;
        const values = [
          newName,
          finalUrl,
          `Temos uma nova versão disponível com melhorias! (v${newName})`
        ];

        const res = await pool.query(queryStr, values);
        if (res.rows.length > 0) {
          log("✅ Banco de dados local atualizado com sucesso!", colors.green);
          log(`   - Nova Versão Registrada: ${res.rows[0].latest_app_version}`, colors.cyan);
          log(`   - Novo Link de Download: ${res.rows[0].app_download_url}`, colors.cyan);
        } else {
          log("⚠️  Nenhuma linha atualizada no banco. Verifique se a tabela system_settings possui o ID 1.", colors.yellow);
        }
        await pool.end();
      }
    } catch (err) {
      log("❌ Erro ao atualizar o banco de dados.", colors.red);
      console.error(err.message);
    }
  }

  // 8. Commit opcional
  const commitChanges = await question("\n💻 Deseja fazer commit destas alterações de versão no repositório local? (S/n): ");
  if (commitChanges.toLowerCase() !== 'n') {
    try {
      execSync('git add frontend/android/app/build.gradle', { cwd: ROOT_DIR });
      if (fs.existsSync(UPDATE_MANAGER_PATH)) {
        execSync('git add frontend/src/components/UpdateManager.jsx', { cwd: ROOT_DIR });
      }
      execSync(`git commit -m "Fix: bump app version to ${newName}"`, { cwd: ROOT_DIR });
      log("✅ Commit realizado com sucesso!", colors.green);
      
      const pushGit = await question("Deseja fazer push (git push origin main) para atualizar o código no GitHub? (S/n): ");
      if (pushGit.toLowerCase() !== 'n') {
        execSync('git push origin main', { stdio: 'inherit', cwd: ROOT_DIR });
        log("✅ Código atualizado no GitHub!", colors.green);
      }
    } catch (err) {
      log("❌ Erro ao executar comandos Git.", colors.red);
      console.error(err.message);
    }
  }

  log("\n=======================================================", colors.green + colors.bright);
  log("🎉 CONCLUÍDO! O aplicativo foi atualizado com sucesso!", colors.green + colors.bright);
  log("=======================================================\n", colors.green + colors.bright);
  rl.close();
}

main().catch(err => {
  console.error("Erro fatal no assistente:", err);
  rl.close();
});
