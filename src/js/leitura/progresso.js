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

window.apagarEdicaoLeitura = async () => {
  if (!estadoApp.usuario) return alert('Entre na sua conta para apagar sua edição.');

  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual || !estadoApp.edicaoLeitura) {
    return alert('Não há uma edição pessoal cadastrada para apagar.');
  }

  if (!confirm(
    'Apagar sua edição deste livro? Seus registros diários serão mantidos, mas seu progresso deixará de entrar nas métricas por edição até você cadastrar uma edição novamente. Se seu cartão estiver publicado, ele continuará no site e usará o total de páginas cadastrado pelo clube.'
  )) return;

  const { error } = await supabaseClient
    .from('edicoes_leitura')
    .delete()
    .eq('usuario_id', estadoApp.usuario.id)
    .eq('encontro_id', atual.id);

  if (error) return alert('Erro ao apagar sua edição: ' + error.message);

  limparCartaoProgresso();
  await carregarProgressoLeitura();
  await carregarMetricasGrupo();
  alert('Sua edição foi apagada. Seus registros diários foram mantidos.');
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

window.removerCartaoProgressoAdmin = async (publicacaoId) => {
  if (!estadoApp.usuario || !estadoApp.ehAdminMaster) {
    return alert('Apenas o Admin Master pode remover o cartão de outra pessoa.');
  }

  const cartao = estadoApp.cartoesProgressoPublicos.find(
    item => item.id_publico === publicacaoId
  );
  if (!cartao || cartao.eh_meu) {
    return alert('Este cartão não está disponível para moderação.');
  }

  if (!confirm('Remover este cartão da seção pública? As curtidas e os comentários ligados a ele também serão removidos. Os registros de leitura e as métricas pessoais da pessoa serão preservados.')) {
    return;
  }

  const { error, count } = await supabaseClient
    .from('progresso_leitura_compartilhado')
    .delete({ count: 'exact' })
    .eq('id_publico', publicacaoId);

  if (error) return alert('Não foi possível remover o cartão: ' + error.message);
  if (count === 0) return alert('O cartão não foi removido. Atualize as métricas e tente novamente.');

  await carregarMetricasGrupo();
  alert('Cartão removido. Os registros e as métricas pessoais foram preservados.');
};

