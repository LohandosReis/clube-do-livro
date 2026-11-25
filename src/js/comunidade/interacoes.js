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

