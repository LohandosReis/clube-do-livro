const CHAVE_SESSAO_VISITAS = 'clube-livro-visita-v1';
const TEMPO_INATIVIDADE_VISITA = 30 * 60 * 1000;
const INTERVALO_GRAVACAO_ATIVIDADE = 60 * 1000;
let sessaoVisitaEmMemoria = null;
let ultimaGravacaoAtividadeVisita = 0;
let eventosAtividadeVisitaConfigurados = false;

function gerarIdSessaoVisita() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function lerSessaoVisita() {
  try {
    const valorSalvo = sessionStorage.getItem(CHAVE_SESSAO_VISITAS);
    if (!valorSalvo) return sessaoVisitaEmMemoria;

    const sessao = JSON.parse(valorSalvo);
    if (
      !sessao ||
      typeof sessao !== 'object' ||
      Array.isArray(sessao) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessao.id || '') ||
      !Number.isFinite(sessao.ultimaAtividade) ||
      (
        sessao.usuarioId !== null &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessao.usuarioId || '')
      )
    ) {
      console.warn('O estado local da sessão de visitas estava inválido e será renovado.');
      return null;
    }

    sessaoVisitaEmMemoria = sessao;
    return sessao;
  } catch (error) {
    console.error('Não foi possível ler a sessão local de visitas:', error);
    return sessaoVisitaEmMemoria;
  }
}

function salvarSessaoVisita(sessao) {
  sessaoVisitaEmMemoria = sessao;
  try {
    sessionStorage.setItem(CHAVE_SESSAO_VISITAS, JSON.stringify(sessao));
  } catch (error) {
    console.error('Não foi possível salvar a sessão local de visitas:', error);
  }
}

async function registrarVisitaSite(usuarioId = null) {
  const agora = Date.now();
  const sessaoAnterior = lerSessaoVisita();
  const identidadeMudou = Boolean(
    sessaoAnterior?.usuarioId &&
    usuarioId &&
    sessaoAnterior.usuarioId !== usuarioId
  );
  const sessaoExpirada = !sessaoAnterior ||
    agora - sessaoAnterior.ultimaAtividade >= TEMPO_INATIVIDADE_VISITA;
  const sessao = sessaoExpirada || identidadeMudou
    ? {
        id: gerarIdSessaoVisita(),
        usuarioId: usuarioId || null,
        ultimaAtividade: agora
      }
    : {
        ...sessaoAnterior,
        usuarioId: sessaoAnterior.usuarioId || usuarioId || null,
        ultimaAtividade: agora
      };

  salvarSessaoVisita(sessao);
  ultimaGravacaoAtividadeVisita = agora;

  const { error } = await supabaseClient.rpc('clube_registrar_visita', {
    p_sessao_id: sessao.id
  });
  if (error) throw error;
}

function registrarAtividadeVisita() {
  const agora = Date.now();
  const sessao = lerSessaoVisita();
  const usuarioId = estadoApp.usuario?.id || null;
  const identidadeMudou = Boolean(
    sessao?.usuarioId &&
    usuarioId &&
    sessao.usuarioId !== usuarioId
  );

  if (
    !sessao ||
    agora - sessao.ultimaAtividade >= TEMPO_INATIVIDADE_VISITA ||
    identidadeMudou
  ) {
    registrarVisitaSite(usuarioId).catch(error => {
      console.error('Não foi possível registrar a nova sessão de visita:', error);
    });
    return;
  }

  if (agora - ultimaGravacaoAtividadeVisita < INTERVALO_GRAVACAO_ATIVIDADE) return;
  sessao.ultimaAtividade = agora;
  salvarSessaoVisita(sessao);
  ultimaGravacaoAtividadeVisita = agora;
}

function inicializarRastreamentoVisitas(usuarioId = null) {
  if (!eventosAtividadeVisitaConfigurados) {
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(evento => {
      document.addEventListener(evento, registrarAtividadeVisita, { passive: true });
    });
    window.addEventListener('focus', registrarAtividadeVisita);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registrarAtividadeVisita();
    });
    eventosAtividadeVisitaConfigurados = true;
  }
  return registrarVisitaSite(usuarioId);
}

function formatarDataHoraVisita(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(data);
}

function formatarNumeroVisitas(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toLocaleString('pt-BR') : '0';
}

function renderizarVisitasAdmin(dados) {
  const container = document.getElementById('admin-visitas-conteudo');
  const resumo = dados.resumo || {};
  const membros = Array.isArray(dados.membros) ? dados.membros : [];
  const recentes = Array.isArray(dados.ultimas_visitas_membros)
    ? dados.ultimas_visitas_membros
    : [];
  const porDia = Array.isArray(dados.por_dia) ? dados.por_dia : [];

  const linhasMembros = membros.length
    ? membros.map(membro => `
        <tr>
          <td>${escaparHTML(membro.nome || 'Membro')}</td>
          <td>${formatarNumeroVisitas(membro.visitas)}</td>
          <td>${escaparHTML(formatarDataHoraVisita(membro.ultima_visita))}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3">Ainda não há acessos de membros registrados.</td></tr>';

  const linhasRecentes = recentes.length
    ? recentes.map(visita => `
        <tr>
          <td>${escaparHTML(visita.nome || 'Membro')}</td>
          <td>${escaparHTML(formatarDataHoraVisita(visita.entrou_em))}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2">Ainda não há acessos de membros registrados.</td></tr>';

  const linhasPorDia = porDia.length
    ? porDia.map(dia => `
        <tr>
          <td>${escaparHTML(String(dia.dia || '').split('-').reverse().join('/'))}</td>
          <td>${formatarNumeroVisitas(dia.visitas_membros)}</td>
          <td>${formatarNumeroVisitas(dia.visitas_anonimas)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3">Ainda não há visitas registradas nos últimos 30 dias.</td></tr>';

  container.innerHTML = `
    <div class="visitas-resumo-grid">
      <article class="visita-resumo-card">
        <strong>${formatarNumeroVisitas(resumo.total_visitas)}</strong>
        <span>Visitas nos últimos 12 meses</span>
      </article>
      <article class="visita-resumo-card">
        <strong>${formatarNumeroVisitas(resumo.visitas_membros)}</strong>
        <span>Visitas de membros</span>
      </article>
      <article class="visita-resumo-card">
        <strong>${formatarNumeroVisitas(resumo.membros_unicos)}</strong>
        <span>Membros únicos</span>
      </article>
      <article class="visita-resumo-card">
        <strong>${formatarNumeroVisitas(resumo.visitas_anonimas)}</strong>
        <span>Sessões anônimas agregadas</span>
      </article>
    </div>

    <section class="visitas-admin-secao">
      <h3>Acessos por membro</h3>
      <div class="tabela-visitas-scroll">
        <table class="tabela-visitas">
          <thead><tr><th>Membro</th><th>Visitas</th><th>Último acesso</th></tr></thead>
          <tbody>${linhasMembros}</tbody>
        </table>
      </div>
    </section>

    <section class="visitas-admin-secao">
      <h3>Acessos recentes de membros</h3>
      <div class="tabela-visitas-scroll">
        <table class="tabela-visitas">
          <thead><tr><th>Membro</th><th>Data e hora</th></tr></thead>
          <tbody>${linhasRecentes}</tbody>
        </table>
      </div>
    </section>

    <section class="visitas-admin-secao">
      <h3>Visitas por dia — últimos 30 dias</h3>
      <div class="tabela-visitas-scroll">
        <table class="tabela-visitas">
          <thead><tr><th>Dia</th><th>Membros</th><th>Anônimos</th></tr></thead>
          <tbody>${linhasPorDia}</tbody>
        </table>
      </div>
    </section>
  `;
}

async function carregarVisitasAdmin() {
  const container = document.getElementById('admin-visitas-conteudo');
  if (!container || !estadoApp.ehAdminMaster) return;

  container.textContent = 'Carregando acessos...';
  try {
    const { data, error } = await supabaseClient.rpc('clube_listar_visitas_admin');
    if (error) throw error;
    renderizarVisitasAdmin(data || {});
  } catch (error) {
    console.error('Não foi possível carregar o painel de acessos:', error);
    container.textContent = `Não foi possível carregar os acessos: ${error.message || 'erro desconhecido'}`;
  }
}
