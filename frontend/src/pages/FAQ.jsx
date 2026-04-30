import { useState, useMemo } from 'react';

const FAQ_DATA = [
  {
    category: 'Upload de Mídias',
    icon: '📤',
    items: [
      {
        q: 'Como enviar uma mídia para o sistema?',
        a: 'Acesse o menu "Mídias", clique em "+ Upload de Mídia" e selecione os arquivos do seu computador. Você pode enviar múltiplos arquivos de uma vez. Um modal de confirmação permite renomear cada arquivo antes de enviá-lo.'
      },
      {
        q: 'Qual é o limite de tamanho por arquivo?',
        a: 'Cada arquivo pode ter até 1GB. O sistema aceita imagens (JPG, PNG, GIF, WebP) e vídeos (MP4, MOV, WebM). Vídeos 4K são suportados.'
      },
      {
        q: 'Qual é o limite total de armazenamento?',
        a: 'O limite padrão é 10GB por empresa. O administrador pode ajustar essa cota individualmente. Você pode ver o uso atual na barra de armazenamento na página de Mídias.'
      },
      {
        q: 'O que acontece quando o armazenamento está cheio?',
        a: 'Quando atingir 80%, um alerta laranja aparece. Em 95%, o alerta fica vermelho. Em 100%, o botão de upload fica bloqueado automaticamente. Remova mídias antigas ou peça ao administrador para aumentar sua cota.'
      },
      {
        q: 'Posso renomear uma mídia depois de enviada?',
        a: 'Sim. Clique no ícone de edição no card da mídia para alterar o nome a qualquer momento.'
      },
    ]
  },
  {
    category: 'Planos de Exibição',
    icon: '🎬',
    items: [
      {
        q: 'O que é um Plano de Exibição?',
        a: 'É uma lista de mídias (imagens e vídeos) que serão exibidas em sequência nas telas. Cada plano pode ter configurações visuais como ticker de notícias, relógio, logo persistente, efeitos de transição e muito mais.'
      },
      {
        q: 'Como funciona a ordem de exibição?',
        a: 'As mídias são exibidas na ordem que aparecem na lista. Você pode reordenar usando as setas ▲▼ no editor do plano. Para imagens, é possível definir o tempo de exibição em segundos. Vídeos avançam automaticamente ao terminar.'
      },
      {
        q: 'Como adicionar um ticker de notícias?',
        a: 'No editor do plano, vá para a aba "Personalização Visual". Escolha o estilo de feed (Ticker Clássico, Barra Glassmorphism, Card Flutuante, Lateral Vertical ou Destaque Central). Você pode usar uma URL RSS ou digitar o texto manualmente no campo de rodapé.'
      },
      {
        q: 'Como adicionar uma logo que aparece em todas as mídias?',
        a: 'No editor do plano, vá em "Personalização Visual" e localize a seção "Logo Persistente". Cole a URL da imagem da logo, escolha a posição (4 cantos), o tamanho e a opacidade.'
      },
      {
        q: 'O que é o modo "Blur Fill"?',
        a: 'É um modo de escala que resolve o problema de imagens quadradas ou verticais em TVs horizontais. O sistema cria uma cópia da imagem com desfoque máximo como fundo e exibe a imagem original no centro sem distorção, resultando em um visual profissional.'
      },
    ]
  },
  {
    category: 'Dispositivos e TVs',
    icon: '📺',
    items: [
      {
        q: 'Como sair do modo TV (player em tela cheia)?',
        a: 'Clique ou toque rapidamente 3 vezes seguidas (Triple-Click) em qualquer parte da tela. Um botão "Sair" aparecerá por 6 segundos no canto superior direito. Clique nele para deslogar e voltar ao painel.'
      },
      {
        q: 'Por que minha TV está aparecendo como offline?',
        a: 'O sistema marca um dispositivo como offline quando ele não envia um sinal de vida por mais de 5 minutos. Verifique: 1) A TV está ligada, 2) Tem conexão com a internet, 3) O app está rodando em tela cheia.'
      },
      {
        q: 'O plano atualizou no painel mas a TV continua mostrando o antigo. Por quê?',
        a: 'O player verifica atualizações automaticamente a cada 2 minutos. Se quiser forçar, use o botão "Forçar Atualização" na tela de detalhes da empresa, ou reinicie o app na TV.'
      },
      {
        q: 'Como funciona o emparelhamento (Pairing) da TV?',
        a: 'Cadastre um dispositivo no painel. Um código único é gerado. Na TV, insira esse código no app para vincular a TV à sua conta. Após o emparelhamento, a TV recebe as playlists automaticamente.'
      },
      {
        q: 'Como ver se a TV está reproduzindo corretamente?',
        a: 'No Dashboard principal, o painel "Monitor de Dispositivos" mostra o status em tempo real de cada TV: Online/Offline, status do player (Reproduzindo/Carregando/Erro), tempo desde o último ping e o nome do plano em execução.'
      },
    ]
  },
  {
    category: 'Conta e Permissões',
    icon: '🔐',
    items: [
      {
        q: 'Qual a diferença entre Admin e Cliente?',
        a: 'Admin tem acesso completo ao sistema: gerencia todas as empresas, todos os dispositivos e todas as mídias. Cliente acessa somente os dados da própria empresa. Ao fazer login como Cliente, o sistema abre diretamente o player em tela cheia.'
      },
      {
        q: 'Como funciona o "Lembrar e-mail neste dispositivo"?',
        a: 'Ao marcar esta opção no login, o e-mail é salvo localmente na TV/computador. Na próxima vez que abrir a tela de login, o e-mail já estará preenchido. A senha nunca é salva por segurança.'
      },
      {
        q: 'O que é o indicador "Este dispositivo está vinculado a"?',
        a: 'Após fazer login como cliente em uma TV, o sistema salva localmente o nome da empresa vinculada. Na próxima vez que abrir a tela de login, esse banner aparece informando qual empresa está configurada nesta TV, evitando logins incorretos em ambientes com várias telas.'
      },
    ]
  },
  {
    category: 'Problemas Comuns',
    icon: '🛠️',
    items: [
      {
        q: 'O vídeo parou de reproduzir / tela preta. O que fazer?',
        a: 'O player tem recuperação automática: se um arquivo falhar ao carregar, ele pula para a próxima mídia e evita tela preta. Se o problema persistir, verifique: 1) A conexão com internet da TV, 2) Se o arquivo foi enviado corretamente (tente acessar a URL da mídia diretamente), 3) Reinicie o app.'
      },
      {
        q: 'O upload está falhando. O que pode ser?',
        a: 'Verifique: 1) O arquivo não excede 1GB, 2) Você ainda tem espaço disponível (veja a barra de storage), 3) O formato é suportado (imagem ou vídeo). Se persistir, tente fazer o upload de um arquivo por vez.'
      },
      {
        q: 'O ticker de notícias não está aparecendo na TV.',
        a: 'No editor do plano, confirme que o campo "Texto do Rodapé" tem conteúdo OU que a URL RSS é válida e acessível. Verifique também se o layout não está definido como "Tela Cheia" sem rodapé. Salve o plano e aguarde a TV sincronizar (até 2 minutos).'
      },
      {
        q: 'Como limitar o armazenamento de uma empresa específica?',
        a: 'Acesse "Empresas", edite a empresa desejada e altere o campo "Limite de Armazenamento (GB)". O novo limite entra em vigor imediatamente: uploads que excederem o limite serão bloqueados.'
      },
    ]
  }
];

const FAQ = () => {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');

  const toggleItem = (key) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FAQ_DATA.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      )
    })).filter(cat =>
      (activeCategory === 'all' || cat.category === activeCategory) && cat.items.length > 0
    );
  }, [search, activeCategory]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.625rem', fontWeight: '700', marginBottom: '8px' }}>❓ Central de Ajuda</h2>
        <p style={{ color: 'var(--text-muted)' }}>Encontre respostas rápidas para as dúvidas mais comuns do sistema.</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1.1rem' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar dúvida... (ex: offline, upload, ticker)"
          style={{ width: '100%', padding: '14px 16px 14px 46px', fontSize: '1rem', borderRadius: 'var(--radius-md)', boxSizing: 'border-box' }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveCategory('all')}
          className={`btn ${activeCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 16px', fontSize: '0.875rem' }}
        >
          Todas
        </button>
        {FAQ_DATA.map(cat => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(cat.category)}
            className={`btn ${activeCategory === cat.category ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.875rem' }}
          >
            {cat.icon} {cat.category}
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🤔</div>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum resultado encontrado para "{search}".</p>
          <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={() => setSearch('')}>Limpar busca</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filtered.map(cat => (
            <div key={cat.category}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
                <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>{cat.category}</h3>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cat.items.map((item, i) => {
                  const key = `${cat.category}-${i}`;
                  const isOpen = openItems[key];
                  return (
                    <div
                      key={key}
                      className="card"
                      style={{ padding: 0, overflow: 'hidden', transition: 'all 0.2s' }}
                    >
                      <button
                        onClick={() => toggleItem(key)}
                        style={{
                          width: '100%', background: 'none', border: 'none',
                          padding: '18px 20px', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          textAlign: 'left', gap: '16px'
                        }}
                      >
                        <span style={{ fontWeight: '600', fontSize: '0.9375rem', color: 'var(--text-main)' }}>{item.q}</span>
                        <span style={{
                          flexShrink: 0, fontSize: '1.2rem', color: 'var(--primary)',
                          transform: isOpen ? 'rotate(45deg)' : 'none',
                          transition: 'transform 0.2s'
                        }}>+</span>
                      </button>
                      {isOpen && (
                        <div style={{
                          padding: '0 20px 18px',
                          color: 'var(--text-muted)',
                          lineHeight: 1.7,
                          fontSize: '0.9rem',
                          borderTop: '1px solid var(--border)',
                          paddingTop: '16px',
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '40px', padding: '24px', background: 'var(--bg-input)', borderRadius: '16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Não encontrou o que procurava?</p>
        <button className="btn btn-outline" onClick={() => window.open('https://wa.me/', '_blank')}>
          💬 Falar com Suporte
        </button>
      </div>
    </div>
  );
};

export default FAQ;
