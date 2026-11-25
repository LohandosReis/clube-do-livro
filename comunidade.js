function calcularMediaLivro(encontroId, notaBase = null) {
  const notasUsuarios = estadoApp.avaliacoes
    .filter(a => a.encontro_id === encontroId)
    .map(a => Number(a.nota));

  if (notasUsuarios.length) {
    const soma = notasUsuarios.reduce((acc, n) => acc + n, 0);
    return {
      media: (soma / notasUsuarios.length).toFixed(1),
      total: notasUsuarios.length,
      origem: 'membros'
    };
  }

  if (notaBase !== null && notaBase !== undefined && notaBase !== '') {
    return {
      media: Number(notaBase).toFixed(1),
      total: 0,
      origem: 'base'
    };
  }

  return { media: null, total: 0, origem: 'nenhuma' };
}

window.enviarAvaliacaoLivro = async (encontroId) => {
  if (!estadoApp.usuario) {
    alert('Faça login ou cadastre-se para dar sua nota ao livro.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const input = document.getElementById(`nota-input-${encontroId}`);
  const valor = parseFloat(input?.value);
  if (Number.isNaN(valor) || valor < 0 || valor > 5) {
    return alert('Digite uma nota entre 0 e 5.');
  }
  const avaliacaoExistente = estadoApp.avaliacoes.find(
    item => item.encontro_id === encontroId && item.usuario_id === estadoApp.usuario.id
  );
  if (avaliacaoExistente && Number(avaliacaoExistente.nota) !== valor &&
      !confirm('Salvar a alteração da sua nota para este livro?')) return;

  const { error } = await supabaseClient
    .from('avaliacoes_livro')
    .upsert(
      {
        encontro_id: encontroId,
        usuario_id: estadoApp.usuario.id,
        nota: valor,
        atualizado_em: new Date().toISOString()
      },
      { onConflict: 'encontro_id,usuario_id' }
    );

  if (error) return alert('Erro ao salvar nota: ' + error.message);

  await carregarComunidade();
  atualizarPlacar();
  renderizarTela();
};

window.enviarComentarioLivro = async (encontroId) => {
  if (!estadoApp.usuario) {
    alert('Faça login ou cadastre-se para comentar.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const textarea = document.getElementById(`comentario-input-${encontroId}`);
  const texto = (textarea?.value || '').trim();
  if (!texto) return alert('Escreva um comentário antes de enviar.');

  const { error } = await supabaseClient
    .from('comentarios_livro')
    .insert([{
      encontro_id: encontroId,
      usuario_id: estadoApp.usuario.id,
      texto
    }]);

  if (error) return alert('Erro ao enviar comentário: ' + error.message);

  textarea.value = '';
  await carregarComunidade();
  renderizarTela();
};

window.alternarCurtidaComentario = async (comentarioId) => {
  if (!estadoApp.usuario) {
    alert('Entre na sua conta para curtir comentários.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const comentario = estadoApp.comentarios.find(item => item.id === comentarioId);
  if (!comentario) return alert('Este comentário não foi encontrado.');

  const curtida = estadoApp.curtidasComentarios.find(
    item => item.comentario_id === comentarioId && item.usuario_id === estadoApp.usuario.id
  );
  if (!curtida && comentario.usuario_id === estadoApp.usuario.id) {
    return alert('Você não pode curtir seu próprio comentário.');
  }

  const consulta = supabaseClient.from('curtidas_comentarios_livro');
  const resultado = curtida
    ? await consulta.delete()
        .eq('comentario_id', comentarioId)
        .eq('usuario_id', estadoApp.usuario.id)
    : await consulta.insert({
        comentario_id: comentarioId,
        usuario_id: estadoApp.usuario.id
      });
  if (resultado.error) return alert('Não foi possível atualizar a curtida: ' + resultado.error.message);

  await carregarComunidade();
  renderizarTela();
};

window.enviarRespostaComentario = async (comentarioId) => {
  if (!estadoApp.usuario) {
    alert('Entre na sua conta para responder comentários.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const comentario = estadoApp.comentarios.find(item => item.id === comentarioId);
  if (!comentario) return alert('Este comentário não foi encontrado.');

  const textarea = document.getElementById(`resposta-comentario-input-${comentarioId}`);
  const texto = (textarea?.value || '').trim();
  if (!texto) return alert('Escreva uma resposta antes de enviar.');
  if (texto.length > 1000) return alert('A resposta deve ter no máximo 1000 caracteres.');

  const { error } = await supabaseClient.from('respostas_comentarios_livro').insert({
    comentario_id: comentarioId,
    usuario_id: estadoApp.usuario.id,
    texto
  });
  if (error) return alert('Não foi possível enviar a resposta: ' + error.message);

  await carregarComunidade();
  renderizarTela();
};

window.apagarRespostaComentario = async (respostaId) => {
  const resposta = estadoApp.respostasComentarios.find(item => item.id === respostaId);
  if (!estadoApp.usuario || !resposta ||
      (!estadoApp.ehAdminMaster && resposta.usuario_id !== estadoApp.usuario.id)) {
    return alert('Você não tem permissão para apagar esta resposta.');
  }
  if (!confirm('Deseja apagar esta resposta?')) return;

  const { error } = await supabaseClient
    .from('respostas_comentarios_livro')
    .delete()
    .eq('id', respostaId);
  if (error) return alert('Não foi possível apagar a resposta: ' + error.message);

  await carregarComunidade();
  renderizarTela();
};

window.editarRespostaComentario = async (respostaId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode editar respostas.');
  }
  const resposta = estadoApp.respostasComentarios.find(item => item.id === respostaId);
  if (!resposta) return alert('Esta resposta não foi encontrada.');

  const texto = prompt('Edite a resposta:', resposta.texto);
  if (texto === null) return;
  const textoFinal = texto.trim();
  if (!textoFinal) return alert('A resposta não pode ficar vazia.');
  if (textoFinal.length > 1000) return alert('A resposta deve ter no máximo 1000 caracteres.');
  if (textoFinal === resposta.texto) return;
  if (!confirm('Salvar as alterações desta resposta?')) return;

  const { error } = await supabaseClient
    .from('respostas_comentarios_livro')
    .update({ texto: textoFinal })
    .eq('id', respostaId);
  if (error) return alert('Não foi possível editar a resposta: ' + error.message);

  await carregarComunidade();
  renderizarTela();
};

window.apagarComentario = async (comentarioId) => {
  const comentario = estadoApp.comentarios.find(item => item.id === comentarioId);
  if (!estadoApp.usuario || !comentario ||
      (!estadoApp.ehAdminMaster && comentario.usuario_id !== estadoApp.usuario.id)) {
    return alert('Você não tem permissão para apagar este comentário.');
  }
  if (!confirm('Deseja apagar este comentário?')) return;
  const { error } = await supabaseClient.from('comentarios_livro').delete().eq('id', comentarioId);
  if (error) return alert('Erro ao apagar comentário: ' + error.message);
  await carregarComunidade();
  renderizarTela();
};

window.editarComentario = async (comentarioId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode editar comentários.');
  }

  const comentario = estadoApp.comentarios.find(item => item.id === comentarioId);
  if (!comentario) return alert('Este comentário não foi encontrado.');

  const texto = prompt('Edite o comentário:', comentario.texto);
  if (texto === null) return;
  const textoFinal = texto.trim();
  if (!textoFinal) return alert('O comentário não pode ficar vazio.');
  if (textoFinal === comentario.texto) return;
  if (!confirm('Salvar as alterações deste comentário?')) return;

  const { error } = await supabaseClient
    .from('comentarios_livro')
    .update({ texto: textoFinal })
    .eq('id', comentarioId);
  if (error) return alert('Erro ao editar comentário: ' + error.message);
  await carregarComunidade();
  renderizarTela();
};

async function criarIndicacaoLivro({ titulo, autor, genero, motivo, botao }) {
  if (!estadoApp.usuario) {
    alert('Faça login ou cadastre-se para indicar um livro.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  botao.disabled = true;
  try {
    const { error } = await supabaseClient
      .from('indicacoes_livro')
      .insert([{
        usuario_id: estadoApp.usuario.id,
        titulo,
        autor,
        genero,
        motivo
      }]);
    if (error) throw error;

    document.getElementById('form-indicacao').reset();
    await carregarComunidade();
  } catch (error) {
    alert('Erro ao indicar livro: ' + error.message);
  } finally {
    botao.disabled = false;
  }
}

window.alternarVotoIndicacao = async (indicacaoId) => {
  if (!estadoApp.usuario) {
    alert('Faça login ou cadastre-se para votar nas indicações.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const jaVotou = estadoApp.votos.some(
    v => v.indicacao_id === indicacaoId && v.usuario_id === estadoApp.usuario.id
  );

  if (jaVotou) {
    if (!confirm('Remover seu voto desta indicação?')) return;
    const { error } = await supabaseClient
      .from('votos_indicacao')
      .delete()
      .eq('indicacao_id', indicacaoId)
      .eq('usuario_id', estadoApp.usuario.id);
    if (error) return alert('Erro ao remover voto: ' + error.message);
  } else {
    const { error } = await supabaseClient
      .from('votos_indicacao')
      .insert([{ indicacao_id: indicacaoId, usuario_id: estadoApp.usuario.id }]);
    if (error) return alert('Erro ao votar: ' + error.message);
  }

  await carregarComunidade();
  renderizarIndicacoes();
};

window.apagarIndicacao = async (indicacaoId) => {
  const indicacao = estadoApp.indicacoes.find(item => item.id === indicacaoId);
  if (!estadoApp.usuario || !indicacao ||
      (!estadoApp.ehAdminMaster && indicacao.usuario_id !== estadoApp.usuario.id)) {
    return alert('Você não tem permissão para remover esta indicação.');
  }
  if (!confirm('Remover esta indicação?')) return;
  const { error } = await supabaseClient.from('indicacoes_livro').delete().eq('id', indicacaoId);
  if (error) return alert('Erro ao remover indicação: ' + error.message);
  await carregarComunidade();
  renderizarIndicacoes();
};

window.editarIndicacao = async (indicacaoId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode editar indicações.');
  }

  const indicacao = estadoApp.indicacoes.find(item => item.id === indicacaoId);
  if (!indicacao) return alert('Esta indicação não foi encontrada.');

  const titulo = prompt('Título do livro:', indicacao.titulo);
  if (titulo === null) return;
  const autor = prompt('Autor(a):', indicacao.autor);
  if (autor === null) return;
  const genero = prompt('Gênero:', indicacao.genero || '');
  if (genero === null) return;
  const motivo = prompt('Motivo da indicação:', indicacao.motivo || '');
  if (motivo === null) return;

  const dados = {
    titulo: titulo.trim(),
    autor: autor.trim(),
    genero: genero.trim(),
    motivo: motivo.trim()
  };
  if (!dados.titulo || !dados.autor) {
    return alert('Título e autor são obrigatórios.');
  }
  if (dados.titulo === indicacao.titulo &&
      dados.autor === indicacao.autor &&
      dados.genero === (indicacao.genero || '') &&
      dados.motivo === (indicacao.motivo || '')) return;
  if (!confirm('Salvar as alterações desta indicação?')) return;

  const { error } = await supabaseClient
    .from('indicacoes_livro')
    .update(dados)
    .eq('id', indicacaoId);
  if (error) return alert('Erro ao editar indicação: ' + error.message);
  await carregarComunidade();
};

window.editarAvaliacao = async (encontroId, usuarioId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode editar avaliações.');
  }

  const avaliacao = estadoApp.avaliacoes.find(item =>
    String(item.encontro_id) === String(encontroId) && item.usuario_id === usuarioId
  );
  if (!avaliacao) return alert('Esta avaliação não foi encontrada.');

  const valor = prompt('Nova nota (0 a 5):', avaliacao.nota);
  if (valor === null) return;
  const nota = Number(valor);
  if (!Number.isFinite(nota) || nota < 0 || nota > 5) {
    return alert('A nota deve ser um número entre 0 e 5.');
  }
  if (nota === Number(avaliacao.nota)) return;
  if (!confirm('Salvar a alteração desta avaliação?')) return;

  const { error } = await supabaseClient
    .from('avaliacoes_livro')
    .update({ nota, atualizado_em: new Date().toISOString() })
    .eq('encontro_id', encontroId)
    .eq('usuario_id', usuarioId);
  if (error) return alert('Erro ao editar avaliação: ' + error.message);
  await carregarComunidade();
  atualizarPlacar();
  renderizarTela();
};

window.excluirAvaliacao = async (encontroId, usuarioId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode excluir avaliações.');
  }

  const avaliacao = estadoApp.avaliacoes.find(item =>
    String(item.encontro_id) === String(encontroId) && item.usuario_id === usuarioId
  );
  if (!avaliacao) return alert('Esta avaliação não foi encontrada.');
  if (!confirm('Excluir esta avaliação do membro?')) return;

  const { error } = await supabaseClient
    .from('avaliacoes_livro')
    .delete()
    .eq('encontro_id', encontroId)
    .eq('usuario_id', usuarioId);
  if (error) return alert('Erro ao excluir avaliação: ' + error.message);
  await carregarComunidade();
  atualizarPlacar();
  renderizarTela();
};

window.removerVotoAdmin = async (indicacaoId, usuarioId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode remover votos de outros membros.');
  }
  const voto = estadoApp.votos.find(item =>
    String(item.indicacao_id) === String(indicacaoId) && item.usuario_id === usuarioId
  );
  if (!voto) return alert('Este voto não foi encontrado.');

  const perfil = estadoApp.perfis[usuarioId];
  if (!confirm(`Remover o voto de ${perfil?.nome || 'este membro'} desta indicação?`)) return;

  const { error } = await supabaseClient
    .from('votos_indicacao')
    .delete()
    .eq('indicacao_id', indicacaoId)
    .eq('usuario_id', usuarioId);
  if (error) return alert('Erro ao remover voto: ' + error.message);
  await carregarComunidade();
};

function renderizarIndicacoes() {
  const container = document.getElementById('lista-indicacoes');
  if (!container) return;
  const secao = document.getElementById('espaco-usuarios');
  if (secao) {
    secao.classList.toggle('oculto', !estadoApp.usuario && !estadoApp.indicacoes.length);
  }
  document.getElementById('form-indicacao')?.classList.toggle('oculto', !estadoApp.usuario);

  if (!estadoApp.indicacoes.length) {
    container.innerHTML = estadoApp.usuario
      ? '<small>Ainda não há indicações publicadas.</small>'
      : '';
    return;
  }

  const ordenadas = [...estadoApp.indicacoes].sort((a, b) => {
    const votosA = estadoApp.votos.filter(v => v.indicacao_id === a.id).length;
    const votosB = estadoApp.votos.filter(v => v.indicacao_id === b.id).length;
    return votosB - votosA;
  });

  container.innerHTML = ordenadas.map(ind => {
    const votosDaIndicacao = estadoApp.votos.filter(v => v.indicacao_id === ind.id);
    const totalVotos = votosDaIndicacao.length;
    const meuVoto = estadoApp.usuario && votosDaIndicacao.some(v => v.usuario_id === estadoApp.usuario.id);
    const perfilAutor = estadoApp.perfis[ind.usuario_id];
    const nomeAutorInd = perfilAutor?.nome || 'Membro do Clube';
    const podeApagar = estadoApp.usuario && (estadoApp.ehAdminMaster || ind.usuario_id === estadoApp.usuario.id);
    const podeEditar = Boolean(estadoApp.usuario && estadoApp.ehAdminMaster);
    const botaoVoto = estadoApp.usuario
      ? `<button
          type="button"
          class="${meuVoto ? 'btn-primario' : 'btn-secundario'}"
          data-action="votar-indicacao"
          data-id="${ind.id}"
        >
          ${meuVoto ? '🗳️ Votado' : '🗳️ Votar'} (${totalVotos})
        </button>`
      : `<span class="indicacao-total-votos">🗳️ ${totalVotos} voto${totalVotos === 1 ? '' : 's'}</span>`;
    const gerenciamentoVotos = podeEditar && votosDaIndicacao.length
        ? `
          <details class="admin-votos">
            <summary>Gerenciar votos</summary>
            <div class="admin-votos-lista">
              ${votosDaIndicacao.map(voto => {
                const perfil = estadoApp.perfis[voto.usuario_id] || {};
                return `
                  <div class="admin-voto-item">
                    <span>${escaparHTML(perfil.nome || 'Membro do Clube')}</span>
                    <button type="button" class="btn-perigo btn-mini" data-action="remover-voto-admin" data-id="${ind.id}" data-usuario-id="${escaparHTML(voto.usuario_id)}">Remover voto</button>
                  </div>
                `;
              }).join('')}
            </div>
          </details>
        `
        : '';

    return `
      <div class="indicacao-card">
        <div class="indicacao-info">
          <div class="indicacao-autor-linha">
            <img src="${escaparHTML(perfilAutor?.foto_url || avatarPadrao(nomeAutorInd))}" alt="${escaparHTML(nomeAutorInd)}">
            <div>
              <strong>${escaparHTML(ind.titulo)}</strong> — <small>${escaparHTML(ind.autor)}</small><br>
              <small>Indicado por <strong>${escaparHTML(nomeAutorInd)}</strong>${ind.genero ? ` • ${escaparHTML(ind.genero)}` : ''}</small>
            </div>
          </div>
          ${ind.motivo ? `<p class="indicacao-motivo">${escaparHTML(ind.motivo)}</p>` : ''}
        </div>
        <div class="indicacao-acoes">
          ${botaoVoto}
          ${podeEditar ? `<button type="button" class="btn-secundario btn-mini" data-action="editar-indicacao" data-id="${ind.id}">Editar</button>` : ''}
          ${podeApagar ? `<button type="button" class="btn-perigo btn-mini" data-action="apagar-indicacao" data-id="${ind.id}">🗑️</button>` : ''}
        </div>
        ${gerenciamentoVotos}
      </div>
    `;
  }).join('');
}

async function carregarComunidade() {
  const [resAv, resCom, resCurtidas, resRespostas, resInd, resVot] = await Promise.allSettled([
    supabaseClient.from('avaliacoes_livro').select('*'),
    supabaseClient.from('comentarios_livro').select('*').order('criado_em', { ascending: true }),
    supabaseClient.from('curtidas_comentarios_livro').select('*'),
    supabaseClient.from('respostas_comentarios_livro').select('*').order('criado_em', { ascending: true }),
    supabaseClient.from('indicacoes_livro').select('*').order('criado_em', { ascending: false }),
    supabaseClient.from('votos_indicacao').select('*')
  ]);

  if (resAv.status === 'fulfilled' && !resAv.value.error) estadoApp.avaliacoes = resAv.value.data || [];
  if (resCom.status === 'fulfilled' && !resCom.value.error) estadoApp.comentarios = resCom.value.data || [];
  if (resCurtidas.status === 'fulfilled' && !resCurtidas.value.error) estadoApp.curtidasComentarios = resCurtidas.value.data || [];
  if (resRespostas.status === 'fulfilled' && !resRespostas.value.error) estadoApp.respostasComentarios = resRespostas.value.data || [];
  if (resInd.status === 'fulfilled' && !resInd.value.error) estadoApp.indicacoes = resInd.value.data || [];
  if (resVot.status === 'fulfilled' && !resVot.value.error) estadoApp.votos = resVot.value.data || [];

  const falhas = [
    ['avaliações', resAv],
    ['comentários', resCom],
    ['curtidas em comentários', resCurtidas],
    ['respostas a comentários', resRespostas],
    ['indicações', resInd],
    ['votos', resVot]
  ].filter(([, resultado]) =>
    resultado.status === 'rejected' ||
    (resultado.status === 'fulfilled' && resultado.value.error)
  );

  if (falhas.length) {
    console.warn('Falhas ao carregar dados da comunidade:', falhas.map(([nome]) => nome).join(', '));
  }
  renderizarIndicacoes();
}

async function carregarProgressoLeitura() {
  estadoApp.progressoLeitura = [];
  estadoApp.edicaoLeitura = null;
  estadoApp.metasLeitura = null;
  estadoApp.progressoPublicado = null;
  if (!estadoApp.usuario) {
    renderizarAcompanhamentoLeitura();
    return;
  }

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  const consultaPublicacao = atual
    ? supabaseClient
        .from('progresso_leitura_compartilhado')
        .select('mostrar_nome,mostrar_foto')
        .eq('usuario_id', estadoApp.usuario.id)
        .eq('encontro_id', atual.id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const consultaEdicao = atual
    ? supabaseClient
        .from('edicoes_leitura')
        .select('edicao,paginas_totais')
        .eq('usuario_id', estadoApp.usuario.id)
        .eq('encontro_id', atual.id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [resProgresso, resPublicacao, resMetas, resEdicao] = await Promise.all([
    supabaseClient
      .from('progresso_leitura')
      .select('*')
      .eq('usuario_id', estadoApp.usuario.id)
      .order('data_leitura', { ascending: true }),
    consultaPublicacao,
    supabaseClient
      .from('metas_leitura')
      .select('paginas_dia,paginas_semana')
      .eq('usuario_id', estadoApp.usuario.id)
      .maybeSingle(),
    consultaEdicao
  ]);

  if (resProgresso.error) {
    console.warn('Erro ao carregar progresso pessoal:', resProgresso.error.message);
  } else {
    estadoApp.progressoLeitura = resProgresso.data || [];
  }

  if (resPublicacao.error) {
    console.warn('Erro ao carregar preferência de compartilhamento:', resPublicacao.error.message);
    estadoApp.progressoPublicado = null;
  } else {
    estadoApp.progressoPublicado = resPublicacao.data || null;
  }

  if (resMetas.error) {
    console.warn('Erro ao carregar metas pessoais:', resMetas.error.message);
  } else {
    estadoApp.metasLeitura = resMetas.data || null;
  }

  if (resEdicao.error) {
    console.warn('Erro ao carregar a edição pessoal do livro:', resEdicao.error.message);
  } else {
    estadoApp.edicaoLeitura = resEdicao.data || null;
  }

  renderizarAcompanhamentoLeitura();
}

async function carregarMetricasGrupo() {
  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  const titulo = document.getElementById('metricas-grupo-livro');
  const painel = document.getElementById('painel-metricas-grupo');
  const cartoes = document.getElementById('cartoes-publicos-grupo');

  estadoApp.metricasGrupo = null;
  estadoApp.cartoesProgressoPublicos = [];
  estadoApp.curtidasProgressoCompartilhado = [];
  estadoApp.comentariosProgressoCompartilhado = [];

  if (!atual) {
    if (titulo) titulo.textContent = 'Não há uma leitura atual definida pelo clube.';
    if (painel) painel.innerHTML = '<p>As métricas coletivas aparecerão quando o clube iniciar uma leitura.</p>';
    if (cartoes) cartoes.innerHTML = '';
    renderizarMetricasGrupo();
    return;
  }

  if (titulo) titulo.textContent = `Métricas coletivas de “${atual.titulo}”`;

  const [resMetricas, resCartoes] = await Promise.all([
    supabaseClient.rpc('clube_metricas_grupo', { p_encontro_id: atual.id }),
    supabaseClient.rpc('clube_cartoes_progresso_publicos', { p_encontro_id: atual.id })
  ]);

  if (resMetricas.error) {
    console.warn('Erro ao carregar métricas coletivas:', resMetricas.error.message);
  } else {
    estadoApp.metricasGrupo = resMetricas.data;
  }

  if (resCartoes.error) {
    console.warn('Erro ao carregar cartões publicados:', resCartoes.error.message);
  } else {
    try {
      estadoApp.cartoesProgressoPublicos = await assinarFotosDePerfis(resCartoes.data || []);
    } catch (errorFoto) {
      console.error('Erro ao preparar fotos dos cartões compartilhados:', errorFoto);
      estadoApp.cartoesProgressoPublicos = (resCartoes.data || []).map(cartao => ({
        ...cartao,
        foto_url: ''
      }));
    }
  }

  const idsPublicacoes = estadoApp.cartoesProgressoPublicos
    .map(cartao => cartao.id_publico)
    .filter(Boolean);
  if (idsPublicacoes.length) {
    const [resCurtidas, resComentarios] = await Promise.allSettled([
      supabaseClient
        .from('curtidas_progresso_compartilhado')
        .select('publicacao_id,usuario_id')
        .in('publicacao_id', idsPublicacoes),
      supabaseClient
        .from('comentarios_progresso_compartilhado')
        .select('*')
        .in('publicacao_id', idsPublicacoes)
        .order('criado_em', { ascending: true })
    ]);

    if (resCurtidas.status === 'fulfilled' && !resCurtidas.value.error) {
      estadoApp.curtidasProgressoCompartilhado = resCurtidas.value.data || [];
    } else {
      console.warn('Erro ao carregar curtidas do progresso compartilhado:', resCurtidas.status === 'rejected' ? resCurtidas.reason : resCurtidas.value.error.message);
    }

    if (resComentarios.status === 'fulfilled' && !resComentarios.value.error) {
      estadoApp.comentariosProgressoCompartilhado = resComentarios.value.data || [];
    } else {
      console.warn('Erro ao carregar comentários do progresso compartilhado:', resComentarios.status === 'rejected' ? resComentarios.reason : resComentarios.value.error.message);
    }
  }

  renderizarMetricasGrupo();
}

window.alternarCurtidaProgressoCompartilhado = async (publicacaoId) => {
  if (!estadoApp.usuario) {
    alert('Entre na sua conta para curtir o progresso de leitura.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const cartao = estadoApp.cartoesProgressoPublicos.find(item => item.id_publico === publicacaoId);
  if (!cartao || cartao.eh_meu) return alert('Você só pode curtir o progresso compartilhado por outra pessoa.');

  const curtida = estadoApp.curtidasProgressoCompartilhado.find(
    item => item.publicacao_id === publicacaoId && item.usuario_id === estadoApp.usuario.id
  );
  const consulta = supabaseClient.from('curtidas_progresso_compartilhado');
  const resultado = curtida
    ? await consulta.delete()
        .eq('publicacao_id', publicacaoId)
        .eq('usuario_id', estadoApp.usuario.id)
    : await consulta.insert({
        publicacao_id: publicacaoId,
        usuario_id: estadoApp.usuario.id
      });
  if (resultado.error) return alert('Não foi possível atualizar a curtida: ' + resultado.error.message);

  await carregarMetricasGrupo();
};

window.comentarProgressoCompartilhado = async (publicacaoId) => {
  if (!estadoApp.usuario) {
    alert('Entre na sua conta para comentar no progresso de leitura.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const cartao = estadoApp.cartoesProgressoPublicos.find(item => item.id_publico === publicacaoId);
  if (!cartao || cartao.eh_meu) return alert('Você só pode comentar no progresso compartilhado por outra pessoa.');

  const textarea = document.getElementById(`comentario-progresso-${publicacaoId}`);
  const texto = (textarea?.value || '').trim();
  if (!texto) return alert('Escreva um comentário antes de enviar.');
  if (texto.length > 1000) return alert('O comentário deve ter no máximo 1000 caracteres.');

  const { error } = await supabaseClient.from('comentarios_progresso_compartilhado').insert({
    publicacao_id: publicacaoId,
    usuario_id: estadoApp.usuario.id,
    texto
  });
  if (error) return alert('Não foi possível enviar o comentário: ' + error.message);

  await carregarMetricasGrupo();
};

window.apagarComentarioProgressoCompartilhado = async (comentarioId) => {
  const comentario = estadoApp.comentariosProgressoCompartilhado.find(item => item.id === comentarioId);
  if (!estadoApp.usuario || !comentario ||
      (!estadoApp.ehAdminMaster && comentario.usuario_id !== estadoApp.usuario.id)) {
    return alert('Você não tem permissão para apagar este comentário.');
  }
  if (!confirm('Deseja apagar este comentário sobre o progresso compartilhado?')) return;

  const { error } = await supabaseClient
    .from('comentarios_progresso_compartilhado')
    .delete()
    .eq('id', comentarioId);
  if (error) return alert('Não foi possível apagar o comentário: ' + error.message);

  await carregarMetricasGrupo();
};

window.editarComentarioProgressoCompartilhado = async (comentarioId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode editar comentários de progresso.');
  }
  const comentario = estadoApp.comentariosProgressoCompartilhado.find(item => item.id === comentarioId);
  if (!comentario) return alert('Este comentário não foi encontrado.');

  const texto = prompt('Edite o comentário sobre o progresso:', comentario.texto);
  if (texto === null) return;
  const textoFinal = texto.trim();
  if (!textoFinal) return alert('O comentário não pode ficar vazio.');
  if (textoFinal.length > 1000) return alert('O comentário deve ter no máximo 1000 caracteres.');
  if (textoFinal === comentario.texto) return;
  if (!confirm('Salvar as alterações deste comentário?')) return;

  const { error } = await supabaseClient
    .from('comentarios_progresso_compartilhado')
    .update({ texto: textoFinal })
    .eq('id', comentarioId);
  if (error) return alert('Não foi possível editar o comentário: ' + error.message);

  await carregarMetricasGrupo();
};

window.salvarEdicaoLeitura = async (nomeEdicao, paginas) => {
  if (!estadoApp.usuario) return alert('Entre na sua conta para salvar sua edição.');

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual) return alert('Não existe uma leitura atual cadastrada.');

  const edicao = String(nomeEdicao || '').trim();
  const paginasTotais = Number(paginas);
  if (!edicao || edicao.length > 120) {
    return alert('Informe uma edição ou editora com até 120 caracteres.');
  }
  if (!Number.isInteger(paginasTotais) || paginasTotais < 1 || paginasTotais > 100000) {
    return alert('Informe o total de páginas da edição, entre 1 e 100.000.');
  }

  const edicaoAnterior = estadoApp.edicaoLeitura;
  const edicaoAlterada = edicaoAnterior && (
    edicaoAnterior.edicao !== edicao ||
    Number(edicaoAnterior.paginas_totais) !== paginasTotais
  );
  const possuiLeitura = estadoApp.progressoLeitura.some(item =>
    String(item.encontro_id) === String(atual.id) && Number(item.paginas_lidas) > 0
  );
  if (edicaoAlterada && possuiLeitura &&
      !confirm('Alterar a edição recalculará seu percentual e as métricas agrupadas. Deseja continuar?')) return;

  const { error } = await supabaseClient
    .from('edicoes_leitura')
    .upsert({
      usuario_id: estadoApp.usuario.id,
      encontro_id: atual.id,
      edicao,
      paginas_totais: paginasTotais,
      atualizado_em: new Date().toISOString()
    }, { onConflict: 'usuario_id,encontro_id' });

  if (error) return alert('Erro ao salvar sua edição: ' + error.message);

  limparCartaoProgresso();
  await carregarProgressoLeitura();
  await carregarMetricasGrupo();
  alert('Sua edição foi salva. Seu progresso será calculado usando o total de páginas informado.');
};

window.salvarProgressoLeitura = async (dataLeitura, paginas) => {
  if (!estadoApp.usuario) {
    alert('Entre na sua conta para registrar sua leitura.');
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    return;
  }

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual) return alert('Não existe uma leitura atual cadastrada.');
  if (
    !estadoApp.edicaoLeitura ||
    !String(estadoApp.edicaoLeitura.edicao || '').trim() ||
    estadoApp.edicaoLeitura.edicao === 'Edição não informada' ||
    !Number.isInteger(Number(estadoApp.edicaoLeitura.paginas_totais)) ||
    Number(estadoApp.edicaoLeitura.paginas_totais) < 1 ||
    Number(estadoApp.edicaoLeitura.paginas_totais) > 100000
  ) {
    return alert('Antes de registrar páginas, informe sua edição e o total de páginas da sua cópia.');
  }

  const paginasInt = parseInt(paginas, 10);
  if (!dataLeitura) return alert('Selecione a data da leitura.');
  if (!Number.isInteger(paginasInt) || paginasInt < 0) {
    return alert('Informe uma quantidade válida de páginas.');
  }
  const hoje = new Date();
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  if (dataLeitura > hojeISO) {
    return alert('A data da leitura não pode estar no futuro.');
  }
  const registroExistente = estadoApp.progressoLeitura.find(item =>
    String(item.encontro_id) === String(atual.id) && item.data_leitura === dataLeitura
  );
  if (registroExistente &&
      Number(registroExistente.paginas_lidas) !== paginasInt &&
      !confirm('Já existe um registro nesta data. Deseja substituir a quantidade de páginas?')) return;

  const { error } = await supabaseClient
    .from('progresso_leitura')
    .upsert({
      usuario_id: estadoApp.usuario.id,
      encontro_id: atual.id,
      data_leitura: dataLeitura,
      paginas_lidas: paginasInt
    }, { onConflict: 'usuario_id,encontro_id,data_leitura' });

  if (error) return alert('Erro ao registrar leitura: ' + error.message);

  limparCartaoProgresso();
  await carregarProgressoLeitura();
  await carregarMetricasGrupo();
};

window.salvarMetasLeitura = async (paginasDia, paginasSemana) => {
  if (!estadoApp.usuario) return alert('Entre na sua conta para salvar suas metas.');

  const lerMeta = (valor, nome, limite) => {
    if (valor === '') return 0;
    const meta = Number(valor);
    if (!Number.isInteger(meta) || meta < 0 || meta > limite) {
      throw new Error(`A meta de ${nome} deve ser um número inteiro entre 0 e ${limite}.`);
    }
    return meta;
  };

  let metaDia;
  let metaSemana;
  try {
    metaDia = lerMeta(paginasDia, 'páginas por dia', 10000);
    metaSemana = lerMeta(paginasSemana, 'páginas por semana', 70000);
  } catch (error) {
    return alert(error.message);
  }
  const metaAtualizada = estadoApp.metasLeitura &&
    (Number(estadoApp.metasLeitura.paginas_dia) !== metaDia ||
      Number(estadoApp.metasLeitura.paginas_semana) !== metaSemana);
  if (metaAtualizada) {
    const mensagem = metaDia || metaSemana
      ? 'Salvar as alterações das suas metas de leitura?'
      : 'Desativar e remover suas metas de leitura?';
    if (!confirm(mensagem)) return;
  }

  const operacao = metaDia === 0 && metaSemana === 0
    ? supabaseClient
        .from('metas_leitura')
        .delete()
        .eq('usuario_id', estadoApp.usuario.id)
    : supabaseClient
        .from('metas_leitura')
        .upsert({
          usuario_id: estadoApp.usuario.id,
          paginas_dia: metaDia,
          paginas_semana: metaSemana,
          atualizado_em: new Date().toISOString()
        }, { onConflict: 'usuario_id' });

  const { error } = await operacao;
  if (error) return alert('Erro ao salvar metas: ' + error.message);

  await carregarProgressoLeitura();
  alert(metaDia || metaSemana ? 'Metas de leitura atualizadas.' : 'Metas de leitura desativadas.');
};

window.excluirProgressoLeitura = async (dataLeitura) => {
  if (!estadoApp.usuario) {
    return alert('Entre na sua conta para excluir um registro.');
  }

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual) return alert('Não existe uma leitura atual cadastrada.');

  const registro = estadoApp.progressoLeitura.find(item =>
    item.data_leitura === dataLeitura && item.encontro_id === atual.id
  );
  if (!registro) return alert('Esse registro não foi encontrado.');

  const dataFormatada = new Date(`${dataLeitura}T00:00:00`).toLocaleDateString('pt-BR');
  if (!confirm(`Excluir o registro de leitura do dia ${dataFormatada}?`)) return;

  const { error } = await supabaseClient
    .from('progresso_leitura')
    .delete()
    .eq('usuario_id', estadoApp.usuario.id)
    .eq('encontro_id', atual.id)
    .eq('data_leitura', dataLeitura);

  if (error) return alert('Erro ao excluir registro: ' + error.message);

  limparCartaoProgresso();
  await carregarProgressoLeitura();
  await carregarMetricasGrupo();
};

window.salvarPreferenciaCompartilhamento = async () => {
  if (!estadoApp.usuario) return alert('Entre na sua conta para alterar o compartilhamento.');

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual) return alert('Não existe uma leitura atual cadastrada.');

  const publicar = document.getElementById('progresso-publicado-site').checked;
  const mostrarNome = document.getElementById('progresso-incluir-nome').checked;
  const mostrarFoto = document.getElementById('progresso-incluir-foto').checked;
  const registrosAtuais = estadoApp.progressoLeitura.filter(item => item.encontro_id === atual.id);

  if (publicar && !registrosAtuais.some(item => Number(item.paginas_lidas) > 0)) {
    return alert('Registre pelo menos um dia de leitura antes de publicar seu cartão.');
  }
  if (!publicar && estadoApp.progressoPublicado &&
      !confirm('Retirar seu cartão do site? As curtidas e os comentários ligados a ele também serão removidos. Seus registros de leitura, edição e métricas pessoais serão preservados.')) {
    document.getElementById('progresso-publicado-site').checked = true;
    return;
  }
  if (publicar && estadoApp.progressoPublicado &&
      (mostrarNome !== estadoApp.progressoPublicado.mostrar_nome ||
        mostrarFoto !== estadoApp.progressoPublicado.mostrar_foto) &&
      !confirm('Salvar as alterações nas opções públicas do seu cartão?')) return;

  const operacao = publicar
    ? supabaseClient
        .from('progresso_leitura_compartilhado')
        .upsert({
          usuario_id: estadoApp.usuario.id,
          encontro_id: atual.id,
          mostrar_nome: mostrarNome,
          mostrar_foto: mostrarFoto
        }, { onConflict: 'usuario_id,encontro_id' })
    : supabaseClient
        .from('progresso_leitura_compartilhado')
        .delete()
        .eq('usuario_id', estadoApp.usuario.id)
        .eq('encontro_id', atual.id);

  const { error } = await operacao;
  if (error) {
    await carregarProgressoLeitura();
    return alert('Não foi possível atualizar a publicação: ' + error.message);
  }

  await carregarProgressoLeitura();
  await carregarMetricasGrupo();
  alert(publicar ? 'Seu cartão agora aparece na seção pública do site.' : 'Seu cartão foi removido da seção pública.');
};

function obterDadosCartaoProgresso() {
  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual || !estadoApp.usuario) return null;

  const registrosAtuais = estadoApp.progressoLeitura.filter(item => item.encontro_id === atual.id);
  const paginasLidas = registrosAtuais.reduce(
    (total, item) => total + (Number(item.paginas_lidas) || 0),
    0
  );
  const edicaoLeitura = estadoApp.edicaoLeitura;
  const totalLivro = Number(edicaoLeitura?.paginas_totais) || 0;
  const percentual = totalLivro
    ? Math.min(100, Math.round((paginasLidas / totalLivro) * 100))
    : null;
  const incluirNome = document.getElementById('progresso-incluir-nome').checked;
  const incluirFoto = document.getElementById('progresso-incluir-foto').checked;

  return {
    atual,
    paginasLidas,
    totalLivro,
    edicao: edicaoLeitura?.edicao || '',
    percentual,
    nome: incluirNome ? (estadoApp.perfilUsuario?.nome || '') : '',
    fotoUrl: incluirFoto ? (estadoApp.perfilUsuario?.foto_url || '') : ''
  };
}

function carregarCapaParaCartao(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => resolve(null);
    imagem.src = url;
  });
}

function desenharTextoQuebrado(ctx, texto, x, y, largura, alturaLinha, limiteLinhas = 3) {
  const palavras = String(texto || '').split(/\s+/);
  let linha = '';
  let linhas = 0;

  palavras.forEach(palavra => {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > largura && linha) {
      ctx.fillText(linha, x, y + linhas * alturaLinha);
      linhas++;
      linha = palavra;
    } else {
      linha = tentativa;
    }
  });

  if (linha && linhas < limiteLinhas) {
    ctx.fillText(linha, x, y + linhas * alturaLinha);
  }
}

window.gerarCartaoProgresso = async () => {
  limparCartaoProgresso();
  const dados = obterDadosCartaoProgresso();
  if (!dados) return alert('Entre na sua conta e confira se há uma leitura atual.');
  if (!dados.paginasLidas) return alert('Registre páginas lidas antes de gerar o cartão.');

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return alert('Este navegador não permite gerar a imagem do cartão.');

  const fundo = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  fundo.addColorStop(0, '#f7f3eb');
  fundo.addColorStop(1, '#e8eef5');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#24426b';
  ctx.fillRect(0, 0, canvas.width, 22);
  ctx.fillStyle = '#24426b';
  ctx.font = '700 32px Arial, sans-serif';
  ctx.fillText('CLUBE DO LIVRO', 72, 100);
  ctx.fillStyle = '#5d6672';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('ACOMPANHAMENTO DE LEITURA', 72, 140);

  const [capa, fotoPerfil] = await Promise.all([
    carregarCapaParaCartao(dados.atual.capa),
    carregarCapaParaCartao(dados.fotoUrl)
  ]);
  if (capa) {
    const escala = Math.min(380 / capa.width, 570 / capa.height);
    const largura = capa.width * escala;
    const altura = capa.height * escala;
    ctx.drawImage(capa, 72, 205, largura, altura);
  } else {
    ctx.fillStyle = '#dfe7ef';
    ctx.fillRect(72, 205, 380, 570);
    ctx.fillStyle = '#24426b';
    ctx.font = '700 28px Arial, sans-serif';
    desenharTextoQuebrado(ctx, dados.atual.titulo, 100, 430, 325, 42, 5);
  }

  const xTexto = 500;
  ctx.fillStyle = '#1e242b';
  ctx.font = '700 48px Arial, sans-serif';
  desenharTextoQuebrado(ctx, dados.atual.titulo, xTexto, 260, 500, 60, 4);
  ctx.fillStyle = '#5d6672';
  ctx.font = '30px Arial, sans-serif';
  desenharTextoQuebrado(ctx, dados.atual.autor, xTexto, 500, 500, 40, 2);
  if (dados.edicao) {
    ctx.fillStyle = '#5d6672';
    ctx.font = '24px Arial, sans-serif';
    desenharTextoQuebrado(ctx, `${dados.edicao} · ${dados.totalLivro} páginas`, xTexto, 555, 500, 32, 2);
  }

  if (dados.fotoUrl && fotoPerfil) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(xTexto + 38, 660, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(fotoPerfil, xTexto + 4, 626, 68, 68);
    ctx.restore();
  }

  if (dados.nome) {
    ctx.fillStyle = '#24426b';
    ctx.font = '600 27px Arial, sans-serif';
    ctx.fillText(`Lendo com ${dados.nome}`, dados.fotoUrl && fotoPerfil ? xTexto + 88 : xTexto, 670);
  }

  ctx.fillStyle = '#24426b';
  ctx.font = '700 76px Arial, sans-serif';
  ctx.fillText(`${dados.paginasLidas}`, 72, 930);
  ctx.fillStyle = '#5d6672';
  ctx.font = '30px Arial, sans-serif';
  ctx.fillText(`páginas registradas${dados.totalLivro ? ` de ${dados.totalLivro}` : ''}`, 72, 980);

  if (dados.percentual !== null) {
    ctx.fillStyle = '#d3dce6';
    ctx.fillRect(72, 1030, 936, 22);
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(72, 1030, 936 * dados.percentual / 100, 22);
    ctx.fillStyle = '#24426b';
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText(`${dados.percentual}% do livro`, 72, 1095);
  }

  ctx.fillStyle = '#5d6672';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('Nosso Clube do Livro', 72, 1270);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return alert('Não foi possível gerar a imagem. Tente novamente.');

  if (estadoApp.cartaoProgressoUrl) URL.revokeObjectURL(estadoApp.cartaoProgressoUrl);
  estadoApp.cartaoProgressoBlob = blob;
  estadoApp.cartaoProgressoUrl = URL.createObjectURL(blob);

  const preview = document.getElementById('cartao-progresso-preview');
  preview.src = estadoApp.cartaoProgressoUrl;
  preview.classList.remove('oculto');

  if (!capa) {
    alert('A capa não pôde ser incluída pela origem da imagem; o cartão foi gerado com o título do livro.');
  }
};

window.baixarCartaoProgresso = async () => {
  if (!estadoApp.cartaoProgressoBlob) {
    return alert('Gere o cartão antes de baixá-lo.');
  }

  const link = document.createElement('a');
  link.href = estadoApp.cartaoProgressoUrl;
  link.download = 'meu-progresso-de-leitura.png';
  link.click();
};

window.compartilharCartaoProgresso = async () => {
  if (!estadoApp.cartaoProgressoBlob) {
    return alert('Gere o cartão antes de compartilhá-lo.');
  }

  const dados = obterDadosCartaoProgresso();
  if (!dados) return;
  const texto = `Estou lendo "${dados.atual.titulo}"${dados.edicao ? ` (${dados.edicao}, ${dados.totalLivro} páginas)` : ''} no Clube do Livro e já registrei ${dados.paginasLidas} páginas${dados.percentual !== null ? ` (${dados.percentual}%)` : ''}.`;
  if (typeof File === 'undefined') {
    return alert('Este navegador não permite compartilhar arquivos. Use “Baixar imagem” para salvar o cartão.');
  }
  const arquivo = new File([estadoApp.cartaoProgressoBlob], 'meu-progresso-de-leitura.png', {
    type: 'image/png'
  });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ title: 'Meu progresso de leitura', text: texto, files: [arquivo] });
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Não foi possível abrir o compartilhamento: ' + error.message);
      }
    }
    return;
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  alert('Seu navegador abriu o WhatsApp com o texto. Para compartilhar a imagem no WhatsApp ou Instagram, use também “Baixar imagem”.');
};

window.limparCartaoProgresso = () => {
  if (estadoApp.cartaoProgressoUrl) URL.revokeObjectURL(estadoApp.cartaoProgressoUrl);
  estadoApp.cartaoProgressoBlob = null;
  estadoApp.cartaoProgressoUrl = '';
  const preview = document.getElementById('cartao-progresso-preview');
  if (preview) {
    preview.removeAttribute('src');
    preview.classList.add('oculto');
  }
};