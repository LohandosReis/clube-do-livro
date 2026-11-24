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
    estadoApp.progressoPublicado = null;
    renderizarAcompanhamentoLeitura();
    return;
  }

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual) {
    estadoApp.progressoPublicado = null;
    renderizarAcompanhamentoLeitura();
    return;
  }

  const [resProgresso, resPublicacao] = await Promise.all([
    supabaseClient
      .from('progresso_leitura')
      .select('*')
      .eq('usuario_id', estadoApp.usuario.id)
      .eq('encontro_id', atual.id)
      .order('data_leitura', { ascending: true }),
    supabaseClient
      .from('progresso_leitura_compartilhado')
      .select('mostrar_nome,mostrar_foto')
      .eq('usuario_id', estadoApp.usuario.id)
      .eq('encontro_id', atual.id)
      .maybeSingle()
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
    estadoApp.cartoesProgressoPublicos = resCartoes.data || [];
  }

  renderizarMetricasGrupo();
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
  const hoje = new Date();
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  if (dataLeitura > hojeISO) {
    return alert('A data da leitura não pode estar no futuro.');
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

  limparCartaoProgresso();
  await carregarProgressoLeitura();
  await carregarMetricasGrupo();
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

  if (publicar && !estadoApp.progressoLeitura.some(item => Number(item.paginas_lidas) > 0)) {
    return alert('Registre pelo menos um dia de leitura antes de publicar seu cartão.');
  }

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

  const paginasLidas = estadoApp.progressoLeitura.reduce(
    (total, item) => total + (Number(item.paginas_lidas) || 0),
    0
  );
  const totalLivro = Number(atual.paginas_totais) || 0;
  const percentual = totalLivro
    ? Math.min(100, Math.round((paginasLidas / totalLivro) * 100))
    : null;
  const incluirNome = document.getElementById('progresso-incluir-nome').checked;
  const incluirFoto = document.getElementById('progresso-incluir-foto').checked;

  return {
    atual,
    paginasLidas,
    totalLivro,
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

  if (dados.fotoUrl && fotoPerfil) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(xTexto + 38, 610, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(fotoPerfil, xTexto + 4, 576, 68, 68);
    ctx.restore();
  }

  if (dados.nome) {
    ctx.fillStyle = '#24426b';
    ctx.font = '600 27px Arial, sans-serif';
    ctx.fillText(`Lendo com ${dados.nome}`, dados.fotoUrl && fotoPerfil ? xTexto + 88 : xTexto, 620);
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
  const texto = `Estou lendo "${dados.atual.titulo}" no Clube do Livro e já registrei ${dados.paginasLidas} páginas${dados.percentual !== null ? ` (${dados.percentual}%)` : ''}.`;
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