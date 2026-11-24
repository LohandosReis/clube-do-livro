function montarSeletoresDeGenero() {
  const containerAdmin = document.getElementById('container-generos-admin');
  const selectFiltro = document.getElementById('filtro-genero');
  const selectIndicacao = document.getElementById('indicacao-genero');
  const selectResenha = document.getElementById('resenha-genero');

  if (containerAdmin) {
    containerAdmin.innerHTML = GENEROS_DISPONIVEIS.map((genero, idx) => {
      const id = `genero-opt-${idx}`;
      return `
        <label class="genero-chip" for="${id}" data-genero-label="${escaparHTML(genero.toLowerCase())}">
          <input type="checkbox" class="checkbox-genero" id="${id}" value="${escaparHTML(genero)}">
          <span>${escaparHTML(genero)}</span>
        </label>
      `;
    }).join('');
  }

  const opcoesGenerosHTML = GENEROS_DISPONIVEIS
    .map(genero => `<option value="${escaparHTML(genero)}">${escaparHTML(genero)}</option>`)
    .join('');

  if (selectFiltro) {
    const valorAtual = selectFiltro.value || 'todos';
    selectFiltro.innerHTML = `<option value="todos">Todos os Gêneros</option>${opcoesGenerosHTML}`;
    selectFiltro.value = valorAtual;
  }

  if (selectIndicacao) {
    selectIndicacao.innerHTML = `<option value="">Gênero (opcional)</option>${opcoesGenerosHTML}`;
  }

  if (selectResenha) {
    selectResenha.innerHTML = `<option value="">Selecione o Gênero...</option>${opcoesGenerosHTML}`;
  }
}

function filtrarGenerosAdmin() {
  const termo = (document.getElementById('busca-genero-admin')?.value || '').toLowerCase().trim();
  const chips = document.querySelectorAll('#container-generos-admin .genero-chip');
  chips.forEach(chip => {
    const nomeGenero = chip.getAttribute('data-genero-label') || '';
    const corresponde = !termo || nomeGenero.includes(termo);
    chip.classList.toggle('oculto', !corresponde);
  });
}

function obterGenerosSelecionados() {
  return Array.from(document.querySelectorAll('.checkbox-genero:checked'))
    .map(el => el.value.trim())
    .filter(Boolean);
}

function definirGenerosSelecionados(generoValor, mesclar = false) {
  const novos = new Set(parseGeneros(generoValor).map(g => g.toLowerCase()));
  document.querySelectorAll('.checkbox-genero').forEach(el => {
    const match = novos.has(el.value.toLowerCase());
    if (mesclar) {
      if (match) el.checked = true;
    } else {
      el.checked = match;
    }
  });
}

function renderizarFotosEmEdicao() {
  const box = document.getElementById('container-fotos-existentes');
  const hiddenInput = document.getElementById('edit-fotos-existentes');
  const editId = document.getElementById('edit-id').value;

  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(estadoApp.fotosEmEdicao);
  }

  if (!editId || !estadoApp.fotosEmEdicao.length) {
    if (box) {
      box.innerHTML = '';
      box.classList.add('oculto');
    }
    return;
  }

  box.classList.remove('oculto');
  box.innerHTML = `
    <div class="fotos-existentes-titulo">Fotos já enviadas neste encontro (clique em × para remover):</div>
    <div class="fotos-existentes-grid">
      ${estadoApp.fotosEmEdicao.map((url, index) => `
        <div class="foto-existente-item">
          <img src="${escaparHTML(url)}" alt="Foto ${index + 1}" loading="lazy">
          <button type="button" class="btn-remover-foto" data-action="remover-foto" data-id="${index}" title="Remover foto">×</button>
        </div>
      `).join('')}
    </div>
  `;
}

window.removerFotoExistente = async (index) => {
  const url = estadoApp.fotosEmEdicao[index];
  estadoApp.fotosEmEdicao.splice(index, 1);
  renderizarFotosEmEdicao();

  if (!url) return;
  try {
    const marcador = '/fotos-clube/';
    const caminho = new URL(url).pathname.split(marcador)[1];
    if (caminho) {
      await supabaseClient.storage.from('fotos-clube').remove([decodeURIComponent(caminho)]);
    }
  } catch (error) {
    console.warn('Não foi possível remover o objeto antigo do Storage:', error);
  }
};

function renderizarUsuariosAdmin() {
  const container = document.getElementById('lista-usuarios-admin');
  if (!container || !estadoApp.ehAdminMaster) return;

  const listaPerfis = Object.values(estadoApp.perfis);
  if (!listaPerfis.length) {
    container.innerHTML = '<small>Nenhum usuário cadastrado ainda.</small>';
    return;
  }

  container.innerHTML = listaPerfis.map(p => {
    const isMasterItem = (p.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase();
    const habilitado = isMasterItem || Boolean(p.pode_publicar_resenha);
    return `
      <div class="usuario-item-admin">
        <div class="usuario-info-admin">
          <img src="${escaparHTML(p.foto_url || avatarPadrao(p.nome))}" alt="${escaparHTML(p.nome)}">
          <div>
            <strong>${escaparHTML(p.nome)}</strong> ${isMasterItem ? '<span class="tag tag-nota">Admin Master</span>' : ''}<br>
            <small>${escaparHTML(p.email || '')}</small>
          </div>
        </div>
        ${isMasterItem
          ? '<small>Permissão total</small>'
          : `<button
               type="button"
               class="${habilitado ? 'btn-primario' : 'btn-secundario'}"
               data-action="alternar-permissao"
               data-id="${escaparHTML(p.id)}"
               data-novo-valor="${!habilitado}"
             >
               ${habilitado ? '✅ Pode Publicar Resenhas (Clique p/ revogar)' : '🔒 Habilitar Resenhas Individuais'}
             </button>`}
      </div>
    `;
  }).join('');
}

function atualizarPlacar() {
  const concluidos = estadoApp.encontros.filter(i => i.status === 'lido');
  const paginasConcluidas = concluidos.reduce((acc, i) => acc + (i.paginas_totais || 0), 0);
  const paginasEmAndamento = estadoApp.encontros
    .filter(i => i.status === 'atual')
    .reduce((acc, i) => acc + (i.pagina_meta || 0), 0);

  const mediasCalculadas = concluidos
    .map(i => calcularMediaLivro(i.id, i.nota).media)
    .filter(m => m !== null)
    .map(Number);

  const mediaGeral = mediasCalculadas.length
    ? (mediasCalculadas.reduce((a, b) => a + b, 0) / mediasCalculadas.length).toFixed(1)
    : '-';

  document.getElementById('stat-livros').textContent = concluidos.length;
  document.getElementById('stat-paginas').textContent = paginasConcluidas + paginasEmAndamento;
  document.getElementById('stat-media').textContent = mediaGeral !== '-' ? `${mediaGeral} / 5` : '-';
}

function formatoDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function renderizarAcompanhamentoLeitura() {
  const secao = document.getElementById('acompanhamento-leitura');
  const tituloLivro = document.getElementById('acompanhamento-livro');
  const painel = document.getElementById('painel-desempenho-leitura');
  const campoData = document.getElementById('progresso-data');
  if (!secao || !painel) return;

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );

  if (!estadoApp.usuario) {
    secao.classList.add('oculto');
    return;
  }

  secao.classList.remove('oculto');

  if (!atual) {
    tituloLivro.textContent = 'Não há uma leitura atual definida pelo clube.';
    painel.innerHTML = '<p>Nenhum livro em andamento está disponível para acompanhamento.</p>';
    document.getElementById('form-progresso-leitura').classList.add('oculto');
    return;
  }

  document.getElementById('form-progresso-leitura').classList.remove('oculto');
  tituloLivro.textContent = `Livro atual: ${atual.titulo} — ${atual.autor}`;

  if (campoData) {
    campoData.value = campoData.value || formatoDataLocal(new Date());
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeISO = formatoDataLocal(hoje);

  const inicioSemana = new Date(hoje);
  const diaSemana = inicioSemana.getDay();
  inicioSemana.setDate(inicioSemana.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const registros = estadoApp.progressoLeitura || [];
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
      <div class="metrica-leitura">
        <strong>${mediaDia}</strong>
        <span>Média por dia ativo</span>
      </div>
      <div class="metrica-leitura">
        <strong>${sequencia}</strong>
        <span>Sequência atual</span>
      </div>
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
  `;
}

function gerarLinkGoogleAgenda(item) {
  const dataLimpa = (item.data_encontro || '').replace(/-/g, '');
  const titulo = encodeURIComponent(`Clube do Livro: ${item.titulo}`);
  const detalhes = encodeURIComponent(`Discussão do livro "${item.titulo}" de ${item.autor}. ${item.meta_texto || ''}`);
  const local = encodeURIComponent(item.horario_local || 'Encontro do Clube');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dataLimpa}/${dataLimpa}&details=${detalhes}&location=${local}`;
}

function renderizarTagsGenero(generoValor) {
  const listaGeneros = parseGeneros(generoValor);
  if (!listaGeneros.length) {
    return `<span class="tag">Geral</span>`;
  }
  return listaGeneros
    .map(g => `<span class="tag">${escaparHTML(g)}</span>`)
    .join('');
}

function renderizarBlocoComentarios(encontroId) {
  const comentariosDoLivro = estadoApp.comentarios.filter(c => c.encontro_id === encontroId);

  const listaHTML = comentariosDoLivro.length
    ? comentariosDoLivro.map(c => {
        const perfil = estadoApp.perfis[c.usuario_id] || {};
        const nome = perfil.nome || 'Membro do Clube';
        const foto = perfil.foto_url || avatarPadrao(nome);
        const podeApagar = estadoApp.usuario && (estadoApp.ehAdminMaster || c.usuario_id === estadoApp.usuario.id);
        return `
          <div class="comentario-item">
            <img class="comentario-avatar" src="${escaparHTML(foto)}" alt="${escaparHTML(nome)}" loading="lazy">
            <div class="comentario-corpo">
              <div class="comentario-topo">
                <strong>${escaparHTML(nome)}</strong>
                <small>${escaparHTML(formatarDataHoraBR(c.criado_em))}</small>
                ${podeApagar ? `<button type="button" class="btn-perigo btn-mini" data-action="apagar-comentario" data-id="${c.id}">×</button>` : ''}
              </div>
              <p class="comentario-texto">${escaparHTML(c.texto)}</p>
            </div>
          </div>
        `;
      }).join('')
    : '<small>Nenhum comentário ainda. Deixe sua impressão sobre o livro!</small>';

  return `
    <div class="comentarios-box">
      <h4 class="comentarios-titulo">💬 Comentários dos Membros (${comentariosDoLivro.length})</h4>
      <div class="comentarios-lista">${listaHTML}</div>
      <div class="comentario-form">
        <textarea id="comentario-input-${encontroId}" rows="2" placeholder="${estadoApp.usuario ? 'Escreva um comentário...' : 'Entre na sua conta para comentar...'}"></textarea>
        <button type="button" class="btn-secundario btn-mini" data-action="comentar-livro" data-id="${encontroId}">Comentar</button>
      </div>
    </div>
  `;
}

function renderizarTela() {
  const tipoFiltro = document.getElementById('filtro-tipo').value;
  const statusFiltro = document.getElementById('filtro-status').value;
  const generoFiltro = document.getElementById('filtro-genero').value;
  const textoFiltro = document.getElementById('filtro-texto').value.toLowerCase().trim();

  const atual = estadoApp.encontros.find(item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube');
  const divAtual = document.getElementById('conteudo-atual');

  if (atual) {
    const pct = atual.paginas_totais > 0
      ? Math.min(100, Math.round((atual.pagina_meta / atual.paginas_totais) * 100))
      : 0;

    divAtual.innerHTML = `
      <div class="modulo-info-topo">
        <img src="${escaparHTML(atual.capa || 'https://placehold.co/65x95?text=Capa')}" alt="Capa de ${escaparHTML(atual.titulo)}">
        <div style="flex:1;">
          <div>${renderizarTagsGenero(atual.genero)}</div>
          <h3 style="margin:6px 0 4px 0;">${escaparHTML(atual.titulo)} — <small>${escaparHTML(atual.autor)}</small></h3>
          <p style="margin:4px 0;">📅 <strong>Data do Encontro:</strong> ${escaparHTML(formatarDataBR(atual.data_encontro))} ${atual.horario_local ? `(${escaparHTML(atual.horario_local)})` : ''}</p>
          ${atual.meta_texto ? `<p style="margin:4px 0;"><strong>🎯 Meta Atual:</strong> ${escaparHTML(atual.meta_texto)}</p>` : ''}
          ${atual.paginas_totais > 0
            ? `<small>Progresso da leitura física: Pág. ${atual.pagina_meta} de ${atual.paginas_totais} (${pct}%)</small>
               <div class="progresso-container"><div class="progresso-barra" style="width:${pct}%"></div></div>`
            : ''}
          <a class="btn-agenda" href="${gerarLinkGoogleAgenda(atual)}" target="_blank" rel="noopener noreferrer">📅 Salvar no Google Agenda</a>
        </div>
      </div>
    `;
  } else {
    divAtual.innerHTML = 'Nenhuma leitura ativa definida no momento.';
  }

  const lista = document.getElementById('lista-encontros');
  lista.innerHTML = '';

  const filtrados = estadoApp.encontros.filter(item => {
    const tipoItem = item.tipo_postagem || 'clube';
    const bateTipo = tipoFiltro === 'todos' || tipoItem === tipoFiltro;
    const bateStatus = statusFiltro === 'todos' || item.status === statusFiltro;
    const generosItem = parseGeneros(item.genero).map(g => g.toLowerCase());
    const bateGenero = generoFiltro === 'todos' || generosItem.includes(generoFiltro.toLowerCase());
    const bateTexto =
      (item.titulo || '').toLowerCase().includes(textoFiltro) ||
      (item.autor || '').toLowerCase().includes(textoFiltro) ||
      (item.genero || '').toLowerCase().includes(textoFiltro) ||
      (item.autor_postagem_nome || '').toLowerCase().includes(textoFiltro);
    return bateTipo && bateStatus && bateGenero && bateTexto;
  });

  const labelsStatus = {
    atual: '📖 Em Andamento',
    proximo: '📅 Próxima Leitura',
    lido: '✅ Concluído'
  };

  if (!filtrados.length) {
    lista.innerHTML = '<div class="card"><p style="margin:0;">Nenhum encontro/livro encontrado com os filtros atuais.</p></div>';
    return;
  }

  filtrados.forEach(item => {
    const ehIndividual = (item.tipo_postagem || 'clube') === 'individual';
    const fotosHTML = (item.fotos || [])
      .map(url => `<img src="${escaparHTML(url)}" alt="Foto do encontro" loading="lazy">`)
      .join('');

    const podeGerenciarModulo = estadoApp.usuario && (
      estadoApp.ehAdminMaster || (ehIndividual && item.autor_postagem_id === estadoApp.usuario.id)
    );

    const botoesAdmin = podeGerenciarModulo
      ? `<div style="display:flex; gap:6px;">
           <button type="button" data-action="editar-modulo" data-id="${item.id}" class="btn-secundario">✏️ Editar</button>
           <button type="button" data-action="excluir-modulo" data-id="${item.id}" class="btn-perigo">🗑️</button>
         </div>`
      : '';

    const infoMedia = calcularMediaLivro(item.id, item.nota);
    const minhaAvaliacao = estadoApp.usuario
      ? estadoApp.avaliacoes.find(a => a.encontro_id === item.id && a.usuario_id === estadoApp.usuario.id)
      : null;

    const badgeIndividual = ehIndividual
      ? `<span class="tag tag-individual">✍️ Resenha Individual${item.autor_postagem_nome ? ` • ${escaparHTML(item.autor_postagem_nome)}` : ''}</span>`
      : '';

    lista.innerHTML += `
      <article class="modulo-livro">
        <div class="modulo-cabecalho">
          <div class="modulo-info-topo">
            <img src="${escaparHTML(item.capa || 'https://placehold.co/65x95?text=Capa')}" alt="Capa de ${escaparHTML(item.titulo)}">
            <div>
              ${badgeIndividual}
              <span class="tag tag-status">${escaparHTML(labelsStatus[item.status] || item.status)}</span>
              ${renderizarTagsGenero(item.genero)}
              <span class="tag" style="background:#555;">${escaparHTML(formatarDataBR(item.data_encontro))}</span>
              ${infoMedia.media !== null
                ? `<span class="tag tag-nota">⭐ ${escaparHTML(infoMedia.media)}/5${infoMedia.total ? ` (${infoMedia.total} ${infoMedia.total === 1 ? 'nota' : 'notas'})` : ''}</span>`
                : ''}
              <h3 style="margin:6px 0 2px 0;">${escaparHTML(item.titulo)}</h3>
              <small>Por <strong>${escaparHTML(item.autor)}</strong> ${item.paginas_totais ? `• ${item.paginas_totais} páginas` : ''}</small>
            </div>
          </div>
          ${botoesAdmin}
        </div>
        <div class="modulo-corpo">
          ${item.horario_local ? `<p class="linha-meta-modulo">📍 <strong>Local/Horário:</strong> ${escaparHTML(item.horario_local)}</p>` : ''}
          ${item.bio_autor ? `<div class="bloco-bio-autor">✍️ <strong>Sobre o Escritor / Contexto:</strong>\n${escaparHTML(formatarTextoMultilinha(item.bio_autor))}</div>` : ''}
          ${item.discussao
            ? `<details class="spoiler-box">
                 <summary>💬 Ver discussões, resenha e anotações (Contém Spoilers)</summary>
                 <div class="texto-spoiler">${escaparHTML(formatarTextoMultilinha(item.discussao))}</div>
               </details>`
            : ''}
          ${fotosHTML ? `<div class="galeria-fotos">${fotosHTML}</div>` : ''}

          <div class="avaliacao-livro-box">
            <label for="nota-input-${item.id}">⭐ Sua nota para este livro (0 a 5):</label>
            <div class="avaliacao-controles">
              <input
                type="number"
                id="nota-input-${item.id}"
                class="input-nota-livro"
                min="0"
                max="5"
                step="0.1"
                value="${minhaAvaliacao ? escaparHTML(minhaAvaliacao.nota) : ''}"
                placeholder="Ex: 4.5"
              >
              <button type="button" class="btn-primario btn-mini" data-action="avaliar-livro" data-id="${item.id}">
                ${minhaAvaliacao ? 'Atualizar Nota' : 'Avaliar Livro'}
              </button>
            </div>
          </div>

          ${renderizarBlocoComentarios(item.id)}
        </div>
      </article>
    `;
  });
}