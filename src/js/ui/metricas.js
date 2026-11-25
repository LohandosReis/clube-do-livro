function atualizarPlacar() {
  const concluidos = estadoApp.encontros.filter(i => i.status === 'lido');
  const paginasConcluidas = concluidos.reduce((acc, i) => acc + (i.paginas_totais || 0), 0);
  const paginasGrupoAtual = Number(estadoApp.metricasGrupo?.total_paginas) || 0;

  const mediasCalculadas = concluidos
    .map(i => calcularMediaLivro(i.id, i.nota).media)
    .filter(m => m !== null)
    .map(Number);

  const mediaGeral = mediasCalculadas.length
    ? (mediasCalculadas.reduce((a, b) => a + b, 0) / mediasCalculadas.length).toFixed(1)
    : '-';

  document.getElementById('stat-livros').textContent = concluidos.length;
  document.getElementById('stat-paginas').textContent = paginasConcluidas + paginasGrupoAtual;
  document.getElementById('stat-media').textContent = mediaGeral !== '-' ? `${mediaGeral} / 5` : '-';
}

function formatoDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function renderizarMetasLeitura(registros = []) {
  const painel = document.getElementById('painel-metas-leitura');
  if (!painel) return;

  const metaDia = Number(estadoApp.metasLeitura?.paginas_dia) || 0;
  const metaSemana = Number(estadoApp.metasLeitura?.paginas_semana) || 0;
  const campoDia = document.getElementById('meta-paginas-dia');
  const campoSemana = document.getElementById('meta-paginas-semana');
  if (campoDia) campoDia.value = metaDia || '';
  if (campoSemana) campoSemana.value = metaSemana || '';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioSemana = new Date(hoje);
  const diaSemana = inicioSemana.getDay();
  inicioSemana.setDate(inicioSemana.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const hojeISO = formatoDataLocal(hoje);
  const paginasHoje = registros
    .filter(item => item.data_leitura === hojeISO)
    .reduce((total, item) => total + (Number(item.paginas_lidas) || 0), 0);
  const paginasSemana = registros
    .filter(item => {
      const data = new Date(`${item.data_leitura}T00:00:00`);
      return data >= inicioSemana && data <= hoje;
    })
    .reduce((total, item) => total + (Number(item.paginas_lidas) || 0), 0);

  const renderizarBarraMeta = (rotulo, paginas, meta) => {
    if (!meta) return '';
    const percentual = Math.min(100, Math.round(paginas / meta * 100));
    return `
      <div class="meta-leitura-item">
        <div class="meta-leitura-rotulo">
          <strong>${rotulo}</strong>
          <span>${paginas} de ${meta} páginas (${percentual}%)</span>
        </div>
        <div class="meta-leitura-fundo" role="progressbar"
          aria-label="${rotulo}" aria-valuenow="${percentual}" aria-valuemin="0" aria-valuemax="100">
          <div class="meta-leitura-valor" style="width:${percentual}%"></div>
        </div>
      </div>
    `;
  };

  const metasHTML = [
    renderizarBarraMeta('Meta diária', paginasHoje, metaDia),
    renderizarBarraMeta('Meta semanal', paginasSemana, metaSemana)
  ].filter(Boolean);

  painel.innerHTML = metasHTML.length
    ? `<div class="metas-leitura-lista">${metasHTML.join('')}</div>`
    : '<p class="metas-leitura-vazio">Defina uma meta diária ou semanal para acompanhar seu ritmo.</p>';
}

function renderizarArquivoAnualLeitura() {
  const seletor = document.getElementById('arquivo-ano');
  const conteudo = document.getElementById('arquivo-anual-conteudo');
  if (!seletor || !conteudo) return;

  const livrosConcluidos = new Map(
    estadoApp.encontros
      .filter(item => item.status === 'lido' && (item.tipo_postagem || 'clube') === 'clube')
      .map(item => [String(item.id), item])
  );
  const registrosConcluidos = (estadoApp.progressoLeitura || [])
    .filter(item =>
      livrosConcluidos.has(String(item.encontro_id)) &&
      Number(item.paginas_lidas) > 0
    );
  const anos = [...new Set(registrosConcluidos
    .map(item => String(item.data_leitura).slice(0, 4))
    .filter(ano => /^\d{4}$/.test(ano)))]
    .sort((a, b) => b.localeCompare(a));
  const anoAnterior = seletor.value;

  seletor.innerHTML = anos
    .map(ano => `<option value="${ano}">${ano}</option>`)
    .join('');
  seletor.disabled = anos.length === 0;

  if (!anos.length) {
    conteudo.innerHTML = '<p>Ainda não há registros pessoais de livros concluídos.</p>';
    return;
  }

  seletor.value = anos.includes(anoAnterior) ? anoAnterior : anos[0];
  const registrosAno = registrosConcluidos.filter(
    item => String(item.data_leitura).startsWith(`${seletor.value}-`)
  );
  const porLivro = new Map();
  const dias = new Set();
  let totalPaginas = 0;

  registrosAno.forEach(item => {
    const chaveLivro = String(item.encontro_id);
    const paginas = Number(item.paginas_lidas) || 0;
    const livro = livrosConcluidos.get(chaveLivro);
    totalPaginas += paginas;
    if (paginas > 0) dias.add(item.data_leitura);
    const resumo = porLivro.get(chaveLivro) || { livro, paginas: 0 };
    resumo.paginas += paginas;
    porLivro.set(chaveLivro, resumo);
  });

  const livros = [...porLivro.values()].sort((a, b) => b.paginas - a.paginas);
  conteudo.innerHTML = `
    <div class="metricas-leitura arquivo-anual-metricas">
      <div class="metrica-leitura"><strong>${totalPaginas}</strong><span>Páginas lidas</span></div>
      <div class="metrica-leitura"><strong>${dias.size}</strong><span>Dias com leitura</span></div>
      <div class="metrica-leitura"><strong>${livros.length}</strong><span>Livros concluídos</span></div>
    </div>
    <div class="arquivo-anual-tabela-wrap">
      <table class="arquivo-anual-tabela">
        <thead><tr><th>Livro</th><th>Páginas registradas</th></tr></thead>
        <tbody>
          ${livros.map(item => `
            <tr>
              <td>${escaparHTML(item.livro.titulo || 'Livro sem título')}</td>
              <td>${item.paginas}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderizarAcompanhamentoLeitura() {
  const secao = document.getElementById('acompanhamento-leitura');
  const tituloLivro = document.getElementById('acompanhamento-livro');
  const painel = document.getElementById('painel-desempenho-leitura');
  const campoData = document.getElementById('progresso-data');
  const formularioEdicao = document.getElementById('form-edicao-leitura');
  const formulario = document.getElementById('form-progresso-leitura');
  const compartilhamento = document.querySelector('.compartilhamento-progresso');
  if (!secao || !painel) return;

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );

  if (!estadoApp.usuario) {
    secao.classList.add('oculto');
    return;
  }

  secao.classList.remove('oculto');
  const todosRegistros = estadoApp.progressoLeitura || [];
  renderizarMetasLeitura(todosRegistros);
  renderizarArquivoAnualLeitura();

  if (!atual) {
    tituloLivro.textContent = 'Não há uma leitura atual definida pelo clube.';
    painel.innerHTML = '<p>Nenhum livro em andamento está disponível para acompanhamento.</p>';
    formularioEdicao.classList.add('oculto');
    formulario.classList.add('oculto');
    compartilhamento.classList.add('oculto');
    document.getElementById('progresso-incluir-nome').checked = false;
    document.getElementById('progresso-incluir-foto').checked = false;
    document.getElementById('progresso-publicado-site').checked = false;
    document.getElementById('btn-retirar-publicacao-progresso').classList.add('oculto');
    return;
  }

  formularioEdicao.classList.remove('oculto');
  formulario.classList.remove('oculto');
  compartilhamento.classList.remove('oculto');
  const edicaoLeitura = estadoApp.edicaoLeitura;
  const totalPaginasEdicao = Number(edicaoLeitura?.paginas_totais) || 0;
  const edicaoConfigurada = Boolean(
    edicaoLeitura &&
    edicaoLeitura.edicao !== 'Edição não informada' &&
    totalPaginasEdicao > 0
  );
  const campoEdicao = document.getElementById('edicao-leitura-nome');
  const campoPaginasEdicao = document.getElementById('edicao-leitura-paginas');
  const avisoEdicao = document.getElementById('aviso-edicao-leitura');
  if (campoEdicao) campoEdicao.value = edicaoLeitura?.edicao || '';
  if (campoPaginasEdicao) campoPaginasEdicao.value = edicaoConfigurada ? totalPaginasEdicao : '';
  if (avisoEdicao) avisoEdicao.classList.toggle('oculto', edicaoConfigurada);
  document.getElementById('btn-salvar-progresso').disabled = !edicaoConfigurada;
  tituloLivro.textContent = `Livro atual: ${atual.titulo} — ${atual.autor}${edicaoConfigurada ? ` · Sua edição: ${edicaoLeitura.edicao} (${totalPaginasEdicao} páginas)` : ''}`;

  if (campoData) {
    campoData.value = campoData.value || formatoDataLocal(new Date());
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeISO = formatoDataLocal(hoje);
  if (campoData) campoData.max = hojeISO;

  const inicioSemana = new Date(hoje);
  const diaSemana = inicioSemana.getDay();
  inicioSemana.setDate(inicioSemana.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const registros = todosRegistros.filter(item => String(item.encontro_id) === String(atual.id));
  const mapa = {};
  registros.forEach(item => {
    mapa[item.data_leitura] = Number(item.paginas_lidas) || 0;
  });

  const somarEntre = (inicio, fim = hoje) => registros
    .filter(item => {
      const data = new Date(`${item.data_leitura}T00:00:00`);
      return data >= inicio && data <= fim;
    })
    .reduce((total, item) => total + (Number(item.paginas_lidas) || 0), 0);

  const hojePaginas = mapa[hojeISO] || 0;
  const semanaPaginas = somarEntre(inicioSemana);
  const mesPaginas = somarEntre(inicioMes);
  const totalPaginas = registros.reduce(
    (total, item) => total + (Number(item.paginas_lidas) || 0),
    0
  );

  const limites = registros
    .map(item => Number(item.paginas_lidas) || 0)
    .filter(paginas => paginas > 0);
  const mediaDia = limites.length
    ? Math.round(limites.reduce((total, paginas) => total + paginas, 0) / limites.length)
    : 0;
  const totalPaginasLidas = registros.reduce(
    (total, item) => total + (Number(item.paginas_lidas) || 0),
    0
  );
  const paginasRestantes = totalPaginasEdicao
    ? Math.max(0, totalPaginasEdicao - totalPaginasLidas)
    : null;
  const progressoEdicao = totalPaginasEdicao
    ? Math.min(100, Math.round(totalPaginasLidas / totalPaginasEdicao * 100))
    : null;
  const diasAteEncontro = atual.data_encontro
    ? Math.max(0, Math.ceil(
        (new Date(`${atual.data_encontro}T00:00:00`) - hoje) / 86400000
      ))
    : 0;
  const ritmoNecessario = paginasRestantes === null
    ? null
    : paginasRestantes === 0
      ? 0
      : diasAteEncontro > 0
        ? Math.ceil(paginasRestantes / diasAteEncontro)
        : null;

  let sequencia = 0;
  for (let i = 0; i < 365; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - i);
    if ((mapa[formatoDataLocal(data)] || 0) > 0) {
      sequencia++;
    } else {
      break;
    }
  }

  const diasLidos = [...new Set(
    registros
      .filter(item => Number(item.paginas_lidas) > 0)
      .map(item => item.data_leitura)
  )].sort();
  let melhorSequencia = 0;
  let sequenciaAtual = 0;
  let diaAnterior = null;
  diasLidos.forEach(iso => {
    const data = new Date(`${iso}T00:00:00`);
    const consecutivo = diaAnterior &&
      (data - diaAnterior) / 86400000 === 1;
    sequenciaAtual = consecutivo ? sequenciaAtual + 1 : 1;
    melhorSequencia = Math.max(melhorSequencia, sequenciaAtual);
    diaAnterior = data;
  });

  const maxPaginaSemana = Math.max(1, ...Array.from({ length: 8 }, (_, indice) => {
    const inicio = new Date(inicioSemana);
    inicio.setDate(inicioSemana.getDate() - (7 - indice) * 7);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    return registros
      .filter(item => {
        const data = new Date(`${item.data_leitura}T00:00:00`);
        return data >= inicio && data <= fim;
      })
      .reduce((total, item) => total + (Number(item.paginas_lidas) || 0), 0);
  }));
  const semanas = Array.from({ length: 8 }, (_, indice) => {
    const inicio = new Date(inicioSemana);
    inicio.setDate(inicioSemana.getDate() - (7 - indice) * 7);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    const paginas = registros
      .filter(item => {
        const data = new Date(`${item.data_leitura}T00:00:00`);
        return data >= inicio && data <= fim;
      })
      .reduce((total, item) => total + (Number(item.paginas_lidas) || 0), 0);
    const rotulo = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `
      <div class="barra-semana-linha">
        <span>Sem. ${rotulo}</span>
        <div class="barra-semana-fundo">
          <div class="barra-semana-valor" style="width:${Math.round(paginas / maxPaginaSemana * 100)}%"></div>
        </div>
        <strong>${paginas}</strong>
      </div>
    `;
  });

  const maiorLeitura = Math.max(0, ...limites);
  const nivel = paginas => {
    if (!paginas) return 0;
    if (maiorLeitura <= 1) return 1;
    if (paginas >= maiorLeitura * 0.75) return 4;
    if (paginas >= maiorLeitura * 0.50) return 3;
    if (paginas >= maiorLeitura * 0.25) return 2;
    return 1;
  };

  const inicioHeatmap = new Date(hoje);
  inicioHeatmap.setDate(inicioHeatmap.getDate() - 83);
  const quadrados = [];
  for (let i = 0; i < 84; i++) {
    const data = new Date(inicioHeatmap);
    data.setDate(inicioHeatmap.getDate() + i);
    const iso = formatoDataLocal(data);
    const paginas = mapa[iso] || 0;
    const labelData = data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
    quadrados.push(`
      <span
        class="bloco-leitura nivel-${nivel(paginas)}"
        title="${labelData}: ${paginas} página${paginas === 1 ? '' : 's'}"
        aria-label="${labelData}: ${paginas} página${paginas === 1 ? '' : 's'}"
      ></span>
    `);
  }

  const registrosOrdenados = [...registros].sort((a, b) =>
    b.data_leitura.localeCompare(a.data_leitura)
  );
  const registrosHTML = registrosOrdenados.length
    ? registrosOrdenados.map(item => {
        const dataFormatada = new Date(`${item.data_leitura}T00:00:00`)
          .toLocaleDateString('pt-BR');
        const paginas = Number(item.paginas_lidas) || 0;
        return `
          <div class="registro-leitura-item">
            <span><strong>${escaparHTML(dataFormatada)}</strong> — ${paginas} página${paginas === 1 ? '' : 's'}</span>
            <button
              type="button"
              class="btn-perigo btn-mini"
              data-action="excluir-progresso-leitura"
              data-data="${escaparHTML(item.data_leitura)}"
              aria-label="Excluir registro de ${escaparHTML(dataFormatada)}"
            >Excluir</button>
          </div>
        `;
      }).join('')
    : '<small>Você ainda não registrou páginas para este livro.</small>';

  painel.innerHTML = `
    <div class="metricas-leitura">
      <div class="metrica-leitura">
        <strong>${hojePaginas}</strong>
        <span>Hoje</span>
      </div>
      <div class="metrica-leitura">
        <strong>${semanaPaginas}</strong>
        <span>Esta semana</span>
      </div>
      <div class="metrica-leitura">
        <strong>${mesPaginas}</strong>
        <span>Este mês</span>
      </div>
      <div class="metrica-leitura">
        <strong>${totalPaginas}</strong>
        <span>Total registrado</span>
      </div>
      ${progressoEdicao !== null ? `
        <div class="metrica-leitura">
          <strong>${progressoEdicao}%</strong>
          <span>Progresso da sua edição</span>
        </div>
      ` : ''}
      <div class="metrica-leitura">
        <strong>${mediaDia}</strong>
        <span>Média por dia ativo</span>
      </div>
      <div class="metrica-leitura">
        <strong>${sequencia}</strong>
        <span>Sequência atual</span>
      </div>
      <div class="metrica-leitura">
        <strong>${melhorSequencia}</strong>
        <span>Recorde de dias</span>
      </div>
      ${paginasRestantes !== null ? `
        <div class="metrica-leitura">
          <strong>${paginasRestantes}</strong>
          <span>Páginas restantes</span>
        </div>
        <div class="metrica-leitura">
          <strong>${ritmoNecessario === null ? '—' : ritmoNecessario}</strong>
          <span>Páginas/dia até o encontro</span>
        </div>
      ` : ''}
    </div>

    <div class="historico-semanal">
      <strong>Meu ritmo nas últimas 8 semanas</strong>
      ${semanas.join('')}
    </div>

    <div class="heatmap-leitura">
      <div class="heatmap-titulo">
        <strong>Meu desempenho nas últimas 12 semanas</strong>
        <div class="heatmap-legenda">
          <span>Menos</span>
          <span class="bloco-leitura nivel-0"></span>
          <span class="bloco-leitura nivel-1"></span>
          <span class="bloco-leitura nivel-2"></span>
          <span class="bloco-leitura nivel-3"></span>
          <span class="bloco-leitura nivel-4"></span>
          <span>Mais</span>
        </div>
      </div>
      <div class="heatmap-blocos">${quadrados.join('')}</div>
    </div>

    <div class="lista-registros-leitura">
      <h3>Meus registros diários</h3>
      <div class="registros-leitura-itens">${registrosHTML}</div>
    </div>
  `;

  const incluirNome = document.getElementById('progresso-incluir-nome');
  const incluirFoto = document.getElementById('progresso-incluir-foto');
  const publicarSite = document.getElementById('progresso-publicado-site');
  const botaoRetirarPublicacao = document.getElementById('btn-retirar-publicacao-progresso');
  if (incluirNome) incluirNome.checked = Boolean(estadoApp.progressoPublicado?.mostrar_nome);
  if (incluirFoto) incluirFoto.checked = Boolean(estadoApp.progressoPublicado?.mostrar_foto);
  if (publicarSite) publicarSite.checked = Boolean(estadoApp.progressoPublicado);
  if (botaoRetirarPublicacao) {
    botaoRetirarPublicacao.classList.toggle('oculto', !estadoApp.progressoPublicado);
  }
}

function renderizarInteracoesProgresso(cartao) {
  const publicacaoId = cartao.id_publico;
  if (!publicacaoId) return '';

  const curtidas = estadoApp.curtidasProgressoCompartilhado
    .filter(item => item.publicacao_id === publicacaoId);
  const curtiu = curtidas.some(item => item.usuario_id === estadoApp.usuario?.id);
  const comentarios = estadoApp.comentariosProgressoCompartilhado
    .filter(item => item.publicacao_id === publicacaoId);
  const comentariosHTML = comentarios.map(comentario => {
    const perfil = estadoApp.perfis[comentario.usuario_id] || {};
    const nome = perfil.nome || 'Membro do Clube';
    const podeApagar = estadoApp.usuario &&
      (estadoApp.ehAdminMaster || comentario.usuario_id === estadoApp.usuario.id);
    return `
      <div class="comentario-progresso-item">
        <div class="comentario-progresso-topo">
          <strong>${escaparHTML(nome)}</strong>
          <small>${escaparHTML(formatarDataHoraBR(comentario.criado_em))}</small>
          ${estadoApp.usuario && estadoApp.ehAdminMaster ? `<button type="button" class="btn-secundario btn-mini" data-action="editar-comentario-progresso" data-id="${comentario.id}">Editar</button>` : ''}
          ${podeApagar ? `<button type="button" class="btn-perigo btn-mini" data-action="apagar-comentario-progresso" data-id="${comentario.id}">×</button>` : ''}
        </div>
        <p>${escaparHTML(comentario.texto)}</p>
      </div>
    `;
  }).join('');
  const podeInteragir = Boolean(estadoApp.usuario && !cartao.eh_meu);
  const acoes = podeInteragir
    ? `
      <button type="button" class="btn-secundario btn-mini ${curtiu ? 'curtida-ativa' : ''}" data-action="curtir-progresso-compartilhado" data-publicacao-id="${escaparHTML(publicacaoId)}" aria-pressed="${curtiu}">
        ${curtiu ? 'Curtido' : 'Curtir'} (${curtidas.length})
      </button>
      <div class="comentario-progresso-form">
        <textarea id="comentario-progresso-${escaparHTML(publicacaoId)}" rows="2" maxlength="1000" placeholder="Comente sobre este progresso..."></textarea>
        <button type="button" class="btn-secundario btn-mini" data-action="comentar-progresso-compartilhado" data-publicacao-id="${escaparHTML(publicacaoId)}">Comentar</button>
      </div>
    `
    : `<small>${curtidas.length} curtida${curtidas.length === 1 ? '' : 's'}${!estadoApp.usuario ? ' · Entre como membro para interagir' : ''}</small>`;

  return `
    <div class="interacoes-progresso">
      <div class="interacoes-progresso-acoes">${acoes}</div>
      <div class="comentarios-progresso-lista">
        ${comentariosHTML || '<small>Ainda não há comentários neste progresso.</small>'}
      </div>
    </div>
  `;
}

function renderizarMetricasGrupo() {
  const painel = document.getElementById('painel-metricas-grupo');
  const cartoesContainer = document.getElementById('cartoes-publicos-grupo');
  if (!painel || !cartoesContainer) return;

  const temLeituraAtual = estadoApp.encontros.some(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!temLeituraAtual) {
    painel.innerHTML = '<p>As métricas coletivas aparecerão quando o clube iniciar uma leitura.</p>';
    cartoesContainer.innerHTML = '';
    return;
  }

  const metricas = estadoApp.metricasGrupo;
  if (!metricas) {
    painel.innerHTML = '<p>Não foi possível carregar as métricas coletivas.</p>';
  } else {
    const animais = ['Coruja', 'Raposa', 'Lontra', 'Lobo', 'Tartaruga', 'Beija-flor', 'Gato-do-mato'];
    const atividades = Array.isArray(metricas.atividade_anonima)
      ? metricas.atividade_anonima
      : [];
    const feed = atividades.length
      ? atividades.map(item => {
          const animal = animais[Math.floor(Math.random() * animais.length)];
          const data = new Date(`${item.data}T00:00:00`).toLocaleDateString('pt-BR');
          return `<div class="atividade-anonima-item">
            <span aria-hidden="true">🐾</span>
            <span><strong>${animal} do Clube</strong> — ${Number(item.paginas) || 0} páginas somadas pelo grupo em ${escaparHTML(data)}</span>
          </div>`;
        }).join('')
      : '<small>Ainda não há leituras registradas pelo grupo.</small>';
    const temMetricasPorEdicao = Object.prototype.hasOwnProperty.call(metricas, 'progresso_por_edicao');
    const edicoes = Array.isArray(metricas.progresso_por_edicao)
      ? metricas.progresso_por_edicao
      : [];
    const edicoesHTML = !temMetricasPorEdicao
      ? '<p>As métricas por edição ainda não estão disponíveis. Aplique a versão atualizada da migração do Supabase.</p>'
      : edicoes.length
        ? `<div class="metricas-edicoes-lista">
            ${edicoes.map(edicao => {
              const percentual = Math.min(100, Math.max(0, Number(edicao.progresso_medio_percentual) || 0));
              const percentualTexto = percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
              const participantes = Number(edicao.participantes) || 0;
              const totalPaginas = Number(edicao.total_paginas) || 0;
              const paginasPorExemplar = Number(edicao.paginas_totais) || 0;
              return `
                <article class="metrica-edicao-item">
                  <div class="metrica-edicao-cabecalho">
                    <strong>${escaparHTML(edicao.edicao || 'Edição não informada')}</strong>
                    <span>${paginasPorExemplar} páginas por exemplar</span>
                  </div>
                  <small>${participantes} ${participantes === 1 ? 'participante' : 'participantes'} · ${totalPaginas} páginas registradas no total</small>
                  <strong class="metrica-edicao-percentual">${percentualTexto}% de progresso médio</strong>
                  <div class="progresso-container"><div class="progresso-barra" style="width:${percentual}%"></div></div>
                </article>
              `;
            }).join('')}
          </div>`
        : '<p>As edições dos exemplares aparecerão aqui quando os membros as cadastrarem.</p>';

    painel.innerHTML = `
      <div class="metricas-leitura metricas-grupo">
        <div class="metrica-leitura"><strong>${Number(metricas.total_paginas) || 0}</strong><span>Páginas no total</span></div>
        <div class="metrica-leitura"><strong>${Number(metricas.paginas_hoje) || 0}</strong><span>Páginas hoje</span></div>
        <div class="metrica-leitura"><strong>${Number(metricas.paginas_semana) || 0}</strong><span>Esta semana</span></div>
        <div class="metrica-leitura"><strong>${Number(metricas.paginas_mes) || 0}</strong><span>Este mês</span></div>
        <div class="metrica-leitura"><strong>${Number(metricas.leitores_ativos) || 0}</strong><span>Membros ativos nos últimos 7 dias</span></div>
      </div>
      <section class="progresso-por-edicao">
        <h3>Progresso agrupado por edição</h3>
        <p>O percentual médio de cada grupo considera o total de páginas informado para cada exemplar. Nenhum registro individual é exibido.</p>
        ${edicoesHTML}
      </section>
      <div class="atividade-anonima">
        <h3>Atividade anônima recente</h3>
        <p>Os nomes de animais são aleatórios e não identificam membros. A atividade diária só aparece quando há pelo menos três leitores naquele dia.</p>
        <div class="atividade-anonima-lista">${feed}</div>
      </div>
    `;
  }

  const cartoes = estadoApp.cartoesProgressoPublicos || [];
  if (!cartoes.length) {
    cartoesContainer.innerHTML = '';
    return;
  }

  const animais = ['Coruja', 'Raposa', 'Lontra', 'Lobo', 'Tartaruga', 'Beija-flor', 'Gato-do-mato'];
  cartoesContainer.innerHTML = `
    <div class="cartoes-publicos-titulo">
      <h3>Leitores que decidiram compartilhar</h3>
      <p>Estes cartões aparecem porque seus autores ativaram a publicação. Cada pessoa pode removê-los quando quiser.</p>
    </div>
    <div class="cartoes-publicos-lista">
      ${cartoes.map(cartao => {
        const paginas = Number(cartao.paginas_lidas) || 0;
        const total = Number(cartao.paginas_totais) || 0;
        const percentual = total ? Math.min(100, Math.round(paginas / total * 100)) : null;
        const edicao = String(cartao.edicao || '').trim();
        const nome = cartao.mostrar_nome && cartao.nome
          ? cartao.nome
          : `${animais[Math.floor(Math.random() * animais.length)]} do Clube`;
        return `
          <article class="cartao-publico-leitura">
            ${cartao.mostrar_foto && cartao.foto_url ? `<img class="cartao-publico-avatar" src="${escaparHTML(cartao.foto_url)}" alt="Foto de ${escaparHTML(nome)}" loading="lazy">` : ''}
            ${cartao.capa ? `<img src="${escaparHTML(cartao.capa)}" alt="Capa de ${escaparHTML(cartao.titulo)}" loading="lazy">` : ''}
            <div class="cartao-publico-conteudo">
              <strong>${escaparHTML(nome)}</strong>
              <span>Lendo “${escaparHTML(cartao.titulo)}”${cartao.autor ? ` — ${escaparHTML(cartao.autor)}` : ''}</span>
              ${edicao ? `<span>Edição: ${escaparHTML(edicao)} · ${total} páginas</span>` : ''}
              <span>${paginas} ${paginas === 1 ? 'página registrada' : 'páginas registradas'}${total ? ` de ${total} (${percentual}%)` : ''}</span>
              ${percentual !== null ? `<div class="progresso-container"><div class="progresso-barra" style="width:${percentual}%"></div></div>` : ''}
            </div>
            ${renderizarInteracoesProgresso(cartao)}
            ${cartao.eh_meu
              ? `<button type="button" class="btn-perigo btn-mini cartao-publico-retirar" data-action="retirar-publicacao-progresso">Retirar meu cartão do site</button>`
              : estadoApp.ehAdminMaster
                ? `<button type="button" class="btn-perigo btn-mini cartao-publico-retirar" data-action="remover-cartao-progresso-admin" data-publicacao-id="${escaparHTML(cartao.id_publico)}" title="Remove o cartão e suas interações sem apagar os registros de leitura">Remover cartão (Admin Master)</button>`
                : ''}
          </article>
        `;
      }).join('')}
    </div>
  `;
}

