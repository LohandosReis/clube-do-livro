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
        const ehAdmin = Boolean(estadoApp.usuario && estadoApp.ehAdminMaster);
        const podeApagar = estadoApp.usuario &&
          (ehAdmin || c.usuario_id === estadoApp.usuario.id);
        const curtidas = estadoApp.curtidasComentarios.filter(item => item.comentario_id === c.id);
        const curtiu = curtidas.some(item => item.usuario_id === estadoApp.usuario?.id);
        const podeCurtir = estadoApp.usuario &&
          (c.usuario_id !== estadoApp.usuario.id || curtiu);
        const respostas = estadoApp.respostasComentarios.filter(item => item.comentario_id === c.id);
        const respostasHTML = respostas.map(resposta => {
          const perfilResposta = estadoApp.perfis[resposta.usuario_id] || {};
          const nomeResposta = perfilResposta.nome || 'Membro do Clube';
          const podeApagarResposta = estadoApp.usuario &&
            (ehAdmin || resposta.usuario_id === estadoApp.usuario.id);
          return `
            <div class="resposta-comentario">
              <div class="resposta-comentario-topo">
                <strong>${escaparHTML(nomeResposta)}</strong>
                <small>${escaparHTML(formatarDataHoraBR(resposta.criado_em))}</small>
                ${ehAdmin ? `<button type="button" class="btn-secundario btn-mini" data-action="editar-resposta-comentario" data-id="${resposta.id}">Editar</button>` : ''}
                ${podeApagarResposta ? `<button type="button" class="btn-perigo btn-mini" data-action="apagar-resposta-comentario" data-id="${resposta.id}">×</button>` : ''}
              </div>
              <p>${escaparHTML(resposta.texto)}</p>
            </div>
          `;
        }).join('');
        const formularioResposta = estadoApp.usuario
          ? `
            <div class="resposta-comentario-form">
              <textarea id="resposta-comentario-input-${c.id}" rows="2" maxlength="1000" placeholder="Escreva uma resposta..."></textarea>
              <button type="button" class="btn-secundario btn-mini" data-action="responder-comentario" data-id="${c.id}">Responder</button>
            </div>
          `
          : '';
        return `
          <div class="comentario-item">
            <img class="comentario-avatar" src="${escaparHTML(foto)}" alt="${escaparHTML(nome)}" loading="lazy">
            <div class="comentario-corpo">
              <div class="comentario-topo">
                <strong>${escaparHTML(nome)}</strong>
                <small>${escaparHTML(formatarDataHoraBR(c.criado_em))}</small>
                ${ehAdmin ? `<button type="button" class="btn-secundario btn-mini" data-action="editar-comentario" data-id="${c.id}">Editar</button>` : ''}
                ${podeApagar ? `<button type="button" class="btn-perigo btn-mini" data-action="apagar-comentario" data-id="${c.id}">×</button>` : ''}
              </div>
              <p class="comentario-texto">${escaparHTML(c.texto)}</p>
              <div class="interacao-comentario">
                ${podeCurtir
                  ? `<button type="button" class="btn-secundario btn-mini ${curtiu ? 'curtida-ativa' : ''}" data-action="curtir-comentario" data-id="${c.id}" aria-pressed="${curtiu}">${curtiu ? 'Curtido' : 'Curtir'} (${curtidas.length})</button>`
                  : `<small>👍 ${curtidas.length} curtida${curtidas.length === 1 ? '' : 's'}</small>`}
              </div>
              ${respostasHTML ? `<div class="respostas-comentario"><strong>Respostas (${respostas.length})</strong>${respostasHTML}</div>` : ''}
              ${formularioResposta}
            </div>
          </div>
        `;
      }).join('')
    : '<small>Ainda não há comentários publicados para este livro.</small>';

  const formularioComentario = estadoApp.usuario
    ? `
      <div class="comentario-form">
        <textarea id="comentario-input-${encontroId}" rows="2" placeholder="Escreva um comentário..."></textarea>
        <button type="button" class="btn-secundario btn-mini" data-action="comentar-livro" data-id="${encontroId}">Comentar</button>
      </div>
    `
    : '';

  return `
    <div class="comentarios-box">
      <h4 class="comentarios-titulo">💬 Comentários dos Membros (${comentariosDoLivro.length})</h4>
      <div class="comentarios-lista">${listaHTML}</div>
      ${formularioComentario || '<small>Entre para comentar neste livro.</small>'}
    </div>
  `;
}

function renderizarProgressoGrupo() {
  const metricas = estadoApp.metricasGrupo;
  if (
    !metricas
    || !Object.prototype.hasOwnProperty.call(metricas, 'participantes_com_edicao')
    || !Object.prototype.hasOwnProperty.call(metricas, 'progresso_medio_percentual')
    || !Object.prototype.hasOwnProperty.call(metricas, 'paginas_medias_por_membro')
  ) {
    return '<small>Não foi possível carregar o progresso coletivo. Verifique a conexão e se a migração atualizada do Supabase foi aplicada.</small>';
  }

  const totalPaginasGrupo = Math.max(0, Number(metricas.total_paginas) || 0);
  const participantes = Math.max(0, Number(metricas.participantes_com_edicao) || 0);
  const participantesComProgresso = Math.max(0, Number(metricas.participantes_com_progresso) || 0);

  if (participantes === 0) {
    return `
      <small>Nenhum participante informou a edição do exemplar ainda; o progresso coletivo aparecerá quando isso for cadastrado.</small>
    `;
  }

  const percentual = Math.min(100, Math.max(0, Number(metricas.progresso_medio_percentual) || 0));
  const paginasMedias = Math.max(0, Number(metricas.paginas_medias_por_membro) || 0);
  const percentualFormatado = percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const paginasMediasFormatadas = paginasMedias.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  return `
    <small><strong>Progresso médio do grupo, ajustado por edição: ${percentualFormatado}%</strong></small>
    <small>${participantes} ${participantes === 1 ? 'participante informou' : 'participantes informaram'} a edição; ${participantesComProgresso} com páginas registradas. Média de ${paginasMediasFormatadas} páginas lidas por participante, limitada ao total de cada edição; ${totalPaginasGrupo} páginas registradas no grupo.</small>
    <div class="progresso-container"><div class="progresso-barra" style="width:${percentual}%"></div></div>
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
    divAtual.innerHTML = `
      <div class="modulo-info-topo">
        <img src="${escaparHTML(atual.capa || 'https://placehold.co/65x95?text=Capa')}" alt="Capa de ${escaparHTML(atual.titulo)}">
        <div style="flex:1;">
          <div>${renderizarTagsGenero(atual.genero)}</div>
          <h3 style="margin:6px 0 4px 0;">${escaparHTML(atual.titulo)} <small>por ${escaparHTML(atual.autor)}</small></h3>
          <p style="margin:4px 0;">📅 <strong>Data do Encontro:</strong> ${escaparHTML(formatarDataBR(atual.data_encontro))} ${atual.horario_local ? `(${escaparHTML(atual.horario_local)})` : ''}</p>
          ${atual.meta_texto ? `<p style="margin:4px 0;"><strong>🎯 Meta Atual:</strong> ${escaparHTML(atual.meta_texto)}</p>` : ''}
          ${renderizarProgressoGrupo()}
          <a class="btn-agenda" href="${gerarLinkGoogleAgenda(atual)}" target="_blank" rel="noopener noreferrer">📅 Salvar no Google Agenda</a>
        </div>
      </div>
    `;
  } else {
    divAtual.innerHTML = 'Nenhuma leitura ativa definida no momento.';
  }

  const lista = document.getElementById('lista-encontros');
  lista.innerHTML = '';
  const filtrosBiblioteca = document.getElementById('filtros-biblioteca');
  const idLivroDetalhe = new URLSearchParams(window.location.search).get('livro');
  const livroDetalhado = idLivroDetalhe
    ? estadoApp.encontros.find(item => String(item.id) === idLivroDetalhe)
    : null;
  const modoDetalhe = Boolean(idLivroDetalhe);

  if (filtrosBiblioteca) filtrosBiblioteca.classList.toggle('oculto', modoDetalhe);
  lista.classList.toggle('modulos-container--detalhe', modoDetalhe);

  if (modoDetalhe) {
    document.getElementById('pagina-etiqueta').textContent = 'BIBLIOTECA';
    document.getElementById('pagina-titulo').textContent = livroDetalhado?.titulo || 'Detalhes do livro';
    document.getElementById('pagina-descricao').textContent = livroDetalhado
      ? 'Informações completas, notas e comentários dos leitores.'
      : 'Não foi possível encontrar este livro.';

    if (!livroDetalhado) {
      lista.innerHTML = `
        <div class="card detalhe-livro-nao-encontrado">
          <p>Este livro não está disponível na biblioteca.</p>
          <button type="button" class="btn-secundario" data-action="voltar-biblioteca">← Voltar para a biblioteca</button>
        </div>
      `;
      return;
    }
  }

  const filtrados = modoDetalhe
    ? [livroDetalhado]
    : estadoApp.encontros.filter(item => {
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
    const exibindoDetalhes = modoDetalhe;
    const ehIndividual = (item.tipo_postagem || 'clube') === 'individual';
    const fotosHTML = exibindoDetalhes
      ? (item.fotos || [])
        .map(url => `<img src="${escaparHTML(url)}" alt="Foto de ${escaparHTML(item.titulo)}" loading="lazy">`)
        .join('')
      : '';

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
    const avaliacoesLivro = estadoApp.avaliacoes.filter(
      avaliacao => String(avaliacao.encontro_id) === String(item.id)
    );
    const minhaAvaliacao = estadoApp.usuario
      ? estadoApp.avaliacoes.find(a => a.encontro_id === item.id && a.usuario_id === estadoApp.usuario.id)
      : null;
    const controlesAvaliacao = estadoApp.usuario
      ? `
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
      `
      : '';
    const notasUsuarios = avaliacoesLivro.length
      ? `
        <section class="notas-usuarios-livro">
          <h4>⭐ Notas dos leitores (${avaliacoesLivro.length})</h4>
          <div class="admin-avaliacoes-lista">
            ${avaliacoesLivro.map(avaliacao => {
              const perfil = estadoApp.perfis[avaliacao.usuario_id] || {};
              const nome = perfil.nome || 'Membro do Clube';
              return `
                <div class="admin-avaliacao-item">
                  <span><strong>${escaparHTML(nome)}</strong>: ${escaparHTML(avaliacao.nota)}/5</span>
                  ${estadoApp.ehAdminMaster
                    ? `<div>
                         <button type="button" class="btn-secundario btn-mini" data-action="editar-avaliacao" data-id="${avaliacao.encontro_id}" data-usuario-id="${escaparHTML(avaliacao.usuario_id)}">Editar</button>
                         <button type="button" class="btn-perigo btn-mini" data-action="excluir-avaliacao" data-id="${avaliacao.encontro_id}" data-usuario-id="${escaparHTML(avaliacao.usuario_id)}">Excluir</button>
                       </div>`
                    : ''}
                </div>
              `;
            }).join('')}
          </div>
        </section>
      `
      : '<p class="texto-suave">Ainda não há notas dos leitores para este livro.</p>';

    const badgeIndividual = ehIndividual
      ? `<span class="tag tag-individual">✍️ Resenha Individual${item.autor_postagem_nome ? ` • ${escaparHTML(item.autor_postagem_nome)}` : ''}</span>`
      : '';

    lista.innerHTML += `
      <article class="modulo-livro ${exibindoDetalhes ? 'modulo-livro--detalhe' : 'modulo-livro--resumo'}">
        <div class="modulo-cabecalho">
          <div class="modulo-info-topo">
            <img src="${escaparHTML(item.capa || 'https://placehold.co/65x95?text=Capa')}" alt="Capa de ${escaparHTML(item.titulo)}">
            <div>
              ${badgeIndividual}
              <span class="tag tag-status">${escaparHTML(labelsStatus[item.status] || item.status)}</span>
              ${renderizarTagsGenero(item.genero)}
              <span class="tag tag-data">${escaparHTML(formatarDataBR(item.data_encontro))}</span>
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
          ${exibindoDetalhes
            ? `
              <button type="button" class="btn-secundario btn-voltar-biblioteca" data-action="voltar-biblioteca">← Voltar para a biblioteca</button>
              ${item.horario_local ? `<p class="linha-meta-modulo">📍 <strong>Local/Horário:</strong> ${escaparHTML(item.horario_local)}</p>` : ''}
              ${item.meta_texto ? `<p class="linha-meta-modulo"><strong>🎯 Meta de leitura:</strong> ${escaparHTML(item.meta_texto)}</p>` : ''}
              ${item.bio_autor ? `<div class="bloco-bio-autor">✍️ <strong>Sobre o Escritor / Contexto:</strong>\n${escaparHTML(formatarTextoMultilinha(item.bio_autor))}</div>` : ''}
              ${item.discussao
                ? `<details class="spoiler-box">
                     <summary>💬 Ver discussões, resenha e anotações (Contém Spoilers)</summary>
                     <div class="texto-spoiler">${escaparHTML(formatarTextoMultilinha(item.discussao))}</div>
                   </details>`
                : ''}
              ${fotosHTML ? `<div class="galeria-fotos">${fotosHTML}</div>` : ''}
              <section class="notas-livro-detalhe">
                <h4>Notas dos leitores</h4>
                <p>${infoMedia.media !== null
                  ? `Média: ⭐ ${escaparHTML(infoMedia.media)}/5${infoMedia.total ? ` (${infoMedia.total} ${infoMedia.total === 1 ? 'avaliação' : 'avaliações'})` : ' (nota de referência)'}`
                  : 'Este livro ainda não recebeu avaliações.'}</p>
                ${notasUsuarios}
                ${controlesAvaliacao}
              </section>
              ${renderizarBlocoComentarios(item.id)}
            `
            : `<button type="button" class="btn-primario btn-ver-detalhes" data-action="ver-detalhes-livro" data-id="${item.id}">Ver detalhes e comentários</button>`}
        </div>
      </article>
    `;
  });
}