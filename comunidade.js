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

window.apagarComentario = async (comentarioId) => {
  if (!confirm('Deseja apagar este comentário?')) return;
  const { error } = await supabaseClient.from('comentarios_livro').delete().eq('id', comentarioId);
  if (error) return alert('Erro ao apagar comentário: ' + error.message);
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
  if (!confirm('Remover esta indicação?')) return;
  const { error } = await supabaseClient.from('indicacoes_livro').delete().eq('id', indicacaoId);
  if (error) return alert('Erro ao remover indicação: ' + error.message);
  await carregarComunidade();
  renderizarIndicacoes();
};

function renderizarIndicacoes() {
  const container = document.getElementById('lista-indicacoes');
  if (!container) return;

  if (!estadoApp.indicacoes.length) {
    container.innerHTML = '<small>Nenhuma indicação cadastrada ainda. Seja o primeiro a sugerir uma leitura!</small>';
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
          <button
            type="button"
            class="${meuVoto ? 'btn-primario' : 'btn-secundario'}"
            data-action="votar-indicacao"
            data-id="${ind.id}"
          >
            ${meuVoto ? '🗳️ Votado' : '🗳️ Votar'} (${totalVotos})
          </button>
          ${podeApagar ? `<button type="button" class="btn-perigo btn-mini" data-action="apagar-indicacao" data-id="${ind.id}">🗑️</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function carregarComunidade() {
  const [resAv, resCom, resInd, resVot] = await Promise.allSettled([
    supabaseClient.from('avaliacoes_livro').select('*'),
    supabaseClient.from('comentarios_livro').select('*').order('criado_em', { ascending: true }),
    supabaseClient.from('indicacoes_livro').select('*').order('criado_em', { ascending: false }),
    supabaseClient.from('votos_indicacao').select('*')
  ]);

  if (resAv.status === 'fulfilled' && !resAv.value.error) estadoApp.avaliacoes = resAv.value.data || [];
  if (resCom.status === 'fulfilled' && !resCom.value.error) estadoApp.comentarios = resCom.value.data || [];
  if (resInd.status === 'fulfilled' && !resInd.value.error) estadoApp.indicacoes = resInd.value.data || [];
  if (resVot.status === 'fulfilled' && !resVot.value.error) estadoApp.votos = resVot.value.data || [];

  const falhas = [
    ['avaliações', resAv],
    ['comentários', resCom],
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
  if (!estadoApp.usuario) {
    renderizarAcompanhamentoLeitura();
    return;
  }

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual) {
    renderizarAcompanhamentoLeitura();
    return;
  }

  const { data, error } = await supabaseClient
    .from('progresso_leitura')
    .select('*')
    .eq('usuario_id', estadoApp.usuario.id)
    .eq('encontro_id', atual.id)
    .order('data_leitura', { ascending: true });

  if (error) {
    console.warn('Erro ao carregar progresso pessoal:', error.message);
  } else {
    estadoApp.progressoLeitura = data || [];
  }
  renderizarAcompanhamentoLeitura();
}

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

  const paginasInt = parseInt(paginas, 10);
  if (!dataLeitura) return alert('Selecione a data da leitura.');
  if (!Number.isInteger(paginasInt) || paginasInt < 0) {
    return alert('Informe uma quantidade válida de páginas.');
  }

  const { error } = await supabaseClient
    .from('progresso_leitura')
    .upsert({
      usuario_id: estadoApp.usuario.id,
      encontro_id: atual.id,
      data_leitura: dataLeitura,
      paginas_lidas: paginasInt
    }, { onConflict: 'usuario_id,encontro_id,data_leitura' });

  if (error) return alert('Erro ao registrar leitura: ' + error.message);

  await carregarProgressoLeitura();
};