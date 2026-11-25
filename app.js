// Resenhas / Leituras Individuais (para usuários habilitados)
document.getElementById('btn-toggle-resenha-individual').onclick = () => {
  if (!podeUsuarioPublicarResenha()) {
    return alert('Sua conta ainda não está habilitada pelo Admin Master para publicar resenhas individuais.');
  }
  const box = document.getElementById('box-resenha-individual');
  box.classList.toggle('oculto');
  if (box.classList.contains('oculto')) {
    document.getElementById('form-resenha-individual').reset();
    document.getElementById('resenha-edit-id').value = '';
    document.getElementById('btn-publicar-resenha').textContent = 'Publicar Resenha no Site';
  }
};

document.getElementById('form-resenha-individual').onsubmit = async (e) => {
  e.preventDefault();
  if (!podeUsuarioPublicarResenha()) {
    return alert('Sua conta ainda não está habilitada pelo Admin Master para publicar resenhas individuais.');
  }

  const btn = document.getElementById('btn-publicar-resenha');
  const editId = document.getElementById('resenha-edit-id').value;
  const titulo = document.getElementById('resenha-titulo').value.trim();
  const autor = document.getElementById('resenha-autor').value.trim();
  const texto = document.getElementById('resenha-texto').value.trim();
  const paginas = parseInt(document.getElementById('resenha-paginas').value, 10) || 0;
  const notaVal = document.getElementById('resenha-nota').value;
  const nota = notaVal !== '' ? parseFloat(notaVal) : null;

  if (!titulo || !autor || !texto) {
    return alert('Preencha título, autor e resenha.');
  }
  if (paginas < 0) return alert('O total de páginas não pode ser negativo.');
  if (nota !== null && (Number.isNaN(nota) || nota < 0 || nota > 5)) {
    return alert('A nota deve estar entre 0 e 5.');
  }
  if (editId && !confirm(`Salvar as alterações da resenha “${titulo}”?`)) return;

  btn.disabled = true;
  btn.textContent = editId ? 'Salvando...' : 'Publicando...';

  const hojeISO = new Date().toISOString().slice(0, 10);
  const nomeAutor = estadoApp.perfilUsuario?.nome || estadoApp.usuario.email;
  const itemExistente = editId
    ? estadoApp.encontros.find(item => String(item.id) === String(editId))
    : null;

  const novaResenha = {
    titulo,
    autor,
    capa: '',
    genero: document.getElementById('resenha-genero').value || 'Outro',
    status: 'lido',
    data_encontro: itemExistente?.data_encontro || hojeISO,
    horario_local: itemExistente?.horario_local || `Leitura individual de ${nomeAutor}`,
    paginas_totais: paginas,
    pagina_meta: 0,
    meta_texto: '',
    nota,
    bio_autor: '',
    discussao: texto,
    fotos: [],
    tipo_postagem: 'individual',
    autor_postagem_id: estadoApp.usuario.id,
    autor_postagem_nome: nomeAutor
  };

  try {
    const operacao = editId
      ? supabaseClient.from('encontros').update(novaResenha).eq('id', editId).eq('tipo_postagem', 'individual').eq('autor_postagem_id', estadoApp.usuario.id)
      : supabaseClient.from('encontros').insert([novaResenha]);
    const { error } = await operacao;

    if (error) throw error;

    document.getElementById('form-resenha-individual').reset();
    document.getElementById('resenha-edit-id').value = '';
    document.getElementById('box-resenha-individual').classList.add('oculto');
    document.getElementById('btn-publicar-resenha').textContent = 'Publicar Resenha no Site';
    await carregarEncontros();
  } catch (error) {
    alert(`Erro ao ${editId ? 'editar' : 'publicar'} resenha: ${error.message}`);
  } finally {
    btn.disabled = false;
  }
};

// Edição e Exclusão de Módulos
window.prepararEdicao = (id) => {
  const item = estadoApp.encontros.find(e => e.id === id);
  if (!item || !estadoApp.usuario) return;

  const ehIndividual = (item.tipo_postagem || 'clube') === 'individual';
  const podeEditar = estadoApp.ehAdminMaster || (ehIndividual && item.autor_postagem_id === estadoApp.usuario.id);
  if (!podeEditar) return alert('Você não tem permissão para editar este item.');

  if (!estadoApp.ehAdminMaster) {
    document.getElementById('resenha-edit-id').value = item.id;
    document.getElementById('resenha-titulo').value = item.titulo || '';
    document.getElementById('resenha-autor').value = item.autor || '';
    document.getElementById('resenha-genero').value = item.genero || 'Outro';
    document.getElementById('resenha-paginas').value = item.paginas_totais || '';
    document.getElementById('resenha-nota').value = item.nota ?? '';
    document.getElementById('resenha-texto').value = item.discussao || '';
    document.getElementById('btn-publicar-resenha').textContent = 'Salvar Alterações';
    document.getElementById('box-resenha-individual').classList.remove('oculto');
    document.getElementById('box-resenha-individual').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  ativarAbaAdmin('livro');
  document.getElementById('titulo-form-admin').textContent = `✏️ Editando: ${item.titulo}`;
  document.getElementById('btn-cancelar-edicao').classList.remove('oculto');
  document.getElementById('btn-salvar-modulo').textContent = 'Salvar Alterações';

  document.getElementById('edit-id').value = item.id;
  document.getElementById('edit-tipo-postagem').value = item.tipo_postagem || 'clube';
  document.getElementById('edit-autor-postagem-id').value = item.autor_postagem_id || '';
  document.getElementById('edit-autor-postagem-nome').value = item.autor_postagem_nome || '';

  estadoApp.fotosEmEdicao = Array.isArray(item.fotos) ? [...item.fotos] : [];
  renderizarFotosEmEdicao();

  document.getElementById('livro-titulo').value = item.titulo || '';
  document.getElementById('livro-autor').value = item.autor || '';
  document.getElementById('livro-capa').value = item.capa || '';
  definirGenerosSelecionados(item.genero || '');
  document.getElementById('livro-status').value = item.status || 'atual';
  document.getElementById('encontro-data').value = item.data_encontro || '';
  document.getElementById('encontro-local').value = item.horario_local || '';
  document.getElementById('livro-paginas-totais').value = item.paginas_totais || '';
  document.getElementById('livro-pagina-meta').value = item.pagina_meta || '';
  document.getElementById('livro-meta-texto').value = item.meta_texto || '';
  document.getElementById('livro-nota').value = item.nota ?? '';
  document.getElementById('autor-bio').value = item.bio_autor || '';
  document.getElementById('encontro-discussao').value = item.discussao || '';

  document.getElementById('painel-admin').scrollIntoView({ behavior: 'smooth' });
};

window.excluirModulo = async (id) => {
  const item = estadoApp.encontros.find(e => e.id === id);
  if (!item || !estadoApp.usuario) return;

  const ehIndividual = (item.tipo_postagem || 'clube') === 'individual';
  const podeExcluir = estadoApp.ehAdminMaster || (ehIndividual && item.autor_postagem_id === estadoApp.usuario.id);
  if (!podeExcluir) return alert('Você não tem permissão para excluir este item.');

  if (!confirm(`Tem certeza que deseja excluir o registro de "${item.titulo}"?`)) return;
  const { error } = await supabaseClient.from('encontros').delete().eq('id', id);
  if (error) return alert('Erro ao excluir: ' + error.message);
  carregarEncontros();
};

function resetarFormulario() {
  document.getElementById('form-encontro').reset();
  definirGenerosSelecionados([]);

  const buscaGenero = document.getElementById('busca-genero-admin');
  if (buscaGenero) {
    buscaGenero.value = '';
    filtrarGenerosAdmin();
  }

  estadoApp.fotosEmEdicao = [];
  renderizarFotosEmEdicao();

  document.getElementById('edit-id').value = '';
  document.getElementById('edit-fotos-existentes').value = '';
  document.getElementById('edit-tipo-postagem').value = 'clube';
  document.getElementById('edit-autor-postagem-id').value = '';
  document.getElementById('edit-autor-postagem-nome').value = '';
  document.getElementById('titulo-form-admin').textContent = '⚙️ Novo Módulo / Leitura';
  document.getElementById('btn-cancelar-edicao').classList.add('oculto');
  document.getElementById('btn-salvar-modulo').textContent = 'Publicar no Site';
}

// Abas do Painel Admin e Guia de Discussão
function ativarAbaAdmin(abaAtiva) {
  if (!estadoApp.ehAdminMaster) return;

  const abaLivro = document.getElementById('aba-livro');
  const abaUsuarios = document.getElementById('aba-usuarios');
  const abaGuia = document.getElementById('aba-guia');

  abaLivro.classList.toggle('oculto', abaAtiva !== 'livro');
  abaUsuarios.classList.toggle('oculto', abaAtiva !== 'usuarios');
  abaGuia.classList.toggle('oculto', abaAtiva !== 'guia');

  document.getElementById('tab-btn-livro').className = abaAtiva === 'livro' ? 'btn-primario' : 'btn-secundario';
  document.getElementById('tab-btn-usuarios').className = abaAtiva === 'usuarios' ? 'btn-primario' : 'btn-secundario';
  document.getElementById('tab-btn-guia').className = abaAtiva === 'guia' ? 'btn-primario' : 'btn-secundario';

  if (abaAtiva === 'usuarios') {
    carregarPerfis().then(renderizarUsuariosAdmin);
  }
}

async function carregarGuia() {
  const { data, error } = await supabaseClient
    .from('guia_clube')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Erro ao carregar guia:', error);
    document.getElementById('guia-titulo-exibicao').textContent =
      '🧭 Guia do Clube (erro ao carregar)';
    document.getElementById('guia-conteudo-exibicao').textContent =
      'Não foi possível carregar o guia. Recarregue a página.';
    return;
  }

  if (data) {
    document.getElementById('guia-titulo-exibicao').textContent = data.titulo;
    document.getElementById('guia-conteudo-exibicao').textContent = data.conteudo;
    document.getElementById('guia-titulo-input').value = data.titulo;
    document.getElementById('guia-conteudo-input').value = data.conteudo;
  }
}

async function carregarEncontros() {
  const { data, error } = await supabaseClient
    .from('encontros')
    .select('*')
    .order('data_encontro', { ascending: false });

  if (error) {
    console.error('Erro ao carregar encontros:', error);
    estadoApp.encontros = [];
    document.getElementById('conteudo-atual').textContent =
      'Não foi possível carregar os dados do clube.';
    document.getElementById('lista-encontros').innerHTML =
      '<div class="card"><p style="margin:0;">Erro ao carregar leituras e resenhas. Recarregue a página.</p></div>';
    atualizarPlacar();
    return;
  }

  estadoApp.encontros = data || [];
  await carregarPerfis();
  await carregarComunidade();
  await carregarProgressoLeitura();
  await carregarMetricasGrupo();
  atualizarPlacar();
  renderizarTela();
}

function registrarEventos() {
  document.addEventListener('click', (event) => {
    const acao = event.target.closest('[data-action]');
    if (!acao) return;

    const id = acao.dataset.id;
    switch (acao.dataset.action) {
      case 'editar-modulo':
        prepararEdicao(Number(id));
        break;
      case 'excluir-modulo':
        excluirModulo(Number(id));
        break;
      case 'avaliar-livro':
        enviarAvaliacaoLivro(Number(id));
        break;
      case 'comentar-livro':
        enviarComentarioLivro(Number(id));
        break;
      case 'curtir-comentario':
        alternarCurtidaComentario(Number(id));
        break;
      case 'responder-comentario':
        enviarRespostaComentario(Number(id));
        break;
      case 'editar-resposta-comentario':
        editarRespostaComentario(Number(id));
        break;
      case 'apagar-resposta-comentario':
        apagarRespostaComentario(Number(id));
        break;
      case 'curtir-progresso-compartilhado':
        alternarCurtidaProgressoCompartilhado(acao.dataset.publicacaoId);
        break;
      case 'comentar-progresso-compartilhado':
        comentarProgressoCompartilhado(acao.dataset.publicacaoId);
        break;
      case 'apagar-comentario-progresso':
        apagarComentarioProgressoCompartilhado(Number(id));
        break;
      case 'editar-comentario-progresso':
        editarComentarioProgressoCompartilhado(Number(id));
        break;
      case 'apagar-comentario':
        apagarComentario(Number(id));
        break;
      case 'editar-comentario':
        editarComentario(Number(id));
        break;
      case 'votar-indicacao':
        alternarVotoIndicacao(Number(id));
        break;
      case 'apagar-indicacao':
        apagarIndicacao(Number(id));
        break;
      case 'editar-indicacao':
        editarIndicacao(Number(id));
        break;
      case 'remover-voto-admin':
        removerVotoAdmin(Number(id), acao.dataset.usuarioId);
        break;
      case 'editar-avaliacao':
        editarAvaliacao(Number(id), acao.dataset.usuarioId);
        break;
      case 'excluir-avaliacao':
        excluirAvaliacao(Number(id), acao.dataset.usuarioId);
        break;
      case 'remover-foto':
        removerFotoExistente(Number(id));
        break;
      case 'alternar-permissao':
        alternarPermissaoResenha(id, acao.dataset.novoValor === 'true');
        break;
      case 'editar-perfil-membro':
        editarPerfilMembro(id);
        break;
      case 'excluir-progresso-leitura':
        excluirProgressoLeitura(acao.dataset.data);
        break;
    }
  });

  // Conta e Admin Master
  document.getElementById('btn-abrir-conta').onclick = () => {
    document.getElementById('secao-conta-usuario').classList.remove('oculto');
    if (estadoApp.recuperacaoSenhaAtiva) ativarModoRecuperacaoSenha();
  };
  document.getElementById('btn-fechar-conta').onclick = () => {
    document.getElementById('secao-conta-usuario').classList.add('oculto');
  };

  document.getElementById('btn-abrir-perfil').onclick = abrirPainelPerfil;
  document.getElementById('btn-fechar-perfil').onclick = () => {
    document.getElementById('secao-perfil-membros').classList.add('oculto');
  };
  configurarSeletoresVisibilidadePerfil();
  document.getElementById('form-perfil-membro').onsubmit = salvarMeuPerfil;
  document.getElementById('form-buscar-perfis').onsubmit = async (event) => {
    event.preventDefault();
    await buscarPerfis();
  };
  document.getElementById('perfil-foto').addEventListener('change', event => {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    document.getElementById('perfil-remover-foto').checked = false;
    const preview = document.getElementById('perfil-foto-atual');
    revogarPreviewFotoPerfil(preview);
    preview.dataset.previewUrl = URL.createObjectURL(arquivo);
    preview.src = preview.dataset.previewUrl;
    preview.classList.remove('oculto');
  });
  document.getElementById('perfil-remover-foto').addEventListener('change', event => {
    const inputFoto = document.getElementById('perfil-foto');
    const preview = document.getElementById('perfil-foto-atual');
    revogarPreviewFotoPerfil(preview);
    if (event.target.checked) {
      inputFoto.value = '';
      preview.removeAttribute('src');
      preview.classList.add('oculto');
    } else {
      const fotoAtual = estadoApp.perfilUsuario?.foto_url || '';
      preview.src = fotoAtual;
      preview.classList.toggle('oculto', !fotoAtual);
    }
  });

  document.getElementById('tab-user-login').onclick = () => {
    document.getElementById('conta-mensagem').classList.add('oculto');
    document.getElementById('conta-mensagem').textContent = '';
    document.getElementById('form-user-redefinir-box').classList.add('oculto');
    document.getElementById('form-user-login-box').classList.remove('oculto');
    document.getElementById('form-user-cadastro-box').classList.add('oculto');
    document.getElementById('tab-user-login').className = 'btn-primario';
    document.getElementById('tab-user-cadastro').className = 'btn-secundario';
  };

  document.getElementById('tab-user-cadastro').onclick = () => {
    document.getElementById('conta-mensagem').classList.add('oculto');
    document.getElementById('conta-mensagem').textContent = '';
    document.getElementById('form-user-redefinir-box').classList.add('oculto');
    document.getElementById('form-user-cadastro-box').classList.remove('oculto');
    document.getElementById('form-user-login-box').classList.add('oculto');
    document.getElementById('tab-user-cadastro').className = 'btn-primario';
    document.getElementById('tab-user-login').className = 'btn-secundario';
  };

  document.getElementById('form-user-login').onsubmit = async (event) => {
    event.preventDefault();
    await entrarComoMembro(
      document.getElementById('user-login-email').value.trim(),
      document.getElementById('user-login-senha').value
    );
  };

  document.getElementById('form-user-cadastro').onsubmit = async (event) => {
    event.preventDefault();
    await cadastrarMembro({
      nome: document.getElementById('user-cad-nome').value.trim(),
      email: document.getElementById('user-cad-email').value.trim(),
      password: document.getElementById('user-cad-senha').value,
      confirmarSenha: document.getElementById('user-cad-confirma-senha').value,
      fotoArquivo: document.getElementById('user-cad-foto').files[0],
      botao: document.getElementById('btn-user-cadastrar')
    });
  };

  document.getElementById('btn-esqueceu-senha').onclick = () => {
    solicitarRedefinicaoSenha(document.getElementById('user-login-email').value.trim());
  };
  document.getElementById('btn-voltar-login').onclick = voltarAoLogin;

  document.getElementById('form-user-redefinir-senha').onsubmit = async (event) => {
    event.preventDefault();
    await redefinirSenha(
      document.getElementById('user-redefinir-senha').value,
      document.getElementById('user-redefinir-confirma-senha').value,
      document.getElementById('btn-user-redefinir-senha')
    );
  };

  document.querySelectorAll('[data-toggle-password]').forEach(botao => {
    botao.onclick = () => {
      const campo = document.getElementById(botao.dataset.togglePassword);
      const mostrar = campo.type === 'password';
      campo.type = mostrar ? 'text' : 'password';
      botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      botao.setAttribute('aria-label', `${mostrar ? 'Ocultar' : 'Mostrar'} senha`);
      botao.setAttribute('aria-pressed', String(mostrar));
    };
  });

  document.getElementById('user-cad-senha').addEventListener('input', () => {
    atualizarIndicadorForcaSenha('user-cad-senha', 'user-cad-senha-progresso', 'user-cad-senha-feedback');
    document.getElementById('user-cad-confirma-senha').dispatchEvent(new Event('input'));
  });
  document.getElementById('user-redefinir-senha').addEventListener('input', () => {
    atualizarIndicadorForcaSenha('user-redefinir-senha', 'user-redefinir-senha-progresso', 'user-redefinir-senha-feedback');
    document.getElementById('user-redefinir-confirma-senha').dispatchEvent(new Event('input'));
  });

  [
    ['user-cad-senha', 'user-cad-confirma-senha', 'user-cad-confirma-feedback'],
    ['user-redefinir-senha', 'user-redefinir-confirma-senha', 'user-redefinir-confirma-feedback']
  ].forEach(([senhaId, confirmacaoId, feedbackId]) => {
    const senha = document.getElementById(senhaId);
    const confirmacao = document.getElementById(confirmacaoId);
    confirmacao.addEventListener('input', () => {
      const feedback = document.getElementById(feedbackId);
      if (!confirmacao.value) {
        feedback.textContent = '';
        feedback.className = 'feedback-campo';
      } else if (confirmacao.value === senha.value) {
        feedback.textContent = 'As senhas coincidem.';
        feedback.className = 'feedback-campo sucesso';
      } else {
        feedback.textContent = 'As senhas não coincidem.';
        feedback.className = 'feedback-campo erro';
      }
    });
  });

  document.getElementById('btn-sair').onclick = sairDaConta;

  document.getElementById('form-progresso-leitura').onsubmit = async (event) => {
    event.preventDefault();
    const botao = document.getElementById('btn-salvar-progresso');
    botao.disabled = true;
    botao.textContent = 'Registrando...';
    try {
      await salvarProgressoLeitura(
        document.getElementById('progresso-data').value,
        document.getElementById('progresso-paginas').value
      );
    } finally {
      botao.disabled = false;
      botao.textContent = 'Registrar leitura';
    }
  };

  document.getElementById('form-metas-leitura').onsubmit = async (event) => {
    event.preventDefault();
    const botao = document.getElementById('btn-salvar-metas');
    botao.disabled = true;
    botao.textContent = 'Salvando...';
    try {
      await salvarMetasLeitura(
        document.getElementById('meta-paginas-dia').value,
        document.getElementById('meta-paginas-semana').value
      );
    } finally {
      botao.disabled = false;
      botao.textContent = 'Salvar metas';
    }
  };

  document.getElementById('arquivo-ano').onchange = renderizarArquivoAnualLeitura;

  document.getElementById('btn-gerar-cartao-progresso').onclick = gerarCartaoProgresso;
  document.getElementById('btn-compartilhar-cartao-progresso').onclick = compartilharCartaoProgresso;
  document.getElementById('btn-baixar-cartao-progresso').onclick = baixarCartaoProgresso;
  document.getElementById('btn-salvar-publicacao-progresso').onclick = async (event) => {
    const botao = event.currentTarget;
    botao.disabled = true;
    try {
      await salvarPreferenciaCompartilhamento();
    } finally {
      botao.disabled = false;
    }
  };

  // Abas do Painel Admin
  document.getElementById('tab-btn-livro').onclick = () => ativarAbaAdmin('livro');
  document.getElementById('tab-btn-usuarios').onclick = () => ativarAbaAdmin('usuarios');
  document.getElementById('tab-btn-guia').onclick = () => ativarAbaAdmin('guia');

  // Gêneros e busca de livros
  document.getElementById('busca-genero-admin').oninput = filtrarGenerosAdmin;
  document.getElementById('btn-limpar-generos').onclick = () => definirGenerosSelecionados([]);
  document.getElementById('btn-buscar-api').onclick = executarBuscaLivros;
  document.getElementById('input-busca-livro').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executarBuscaLivros();
    }
  });

  // Salvar / Editar Módulo do Clube
  document.getElementById('btn-cancelar-edicao').onclick = resetarFormulario;
  document.getElementById('form-encontro').onsubmit = async (e) => {
    e.preventDefault();
    if (!estadoApp.ehAdminMaster) {
      return alert('Apenas o Admin Master pode publicar ou editar módulos principais.');
    }

    const generosSelecionados = obterGenerosSelecionados();
    if (!generosSelecionados.length) {
      return alert('Selecione pelo menos um gênero para o livro.');
    }

    const paginasTotais = parseInt(document.getElementById('livro-paginas-totais').value, 10) || 0;
    const paginaMeta = parseInt(document.getElementById('livro-pagina-meta').value, 10) || 0;
    const notaRaw = document.getElementById('livro-nota').value;
    const nota = notaRaw !== '' ? parseFloat(notaRaw) : null;
    if (paginasTotais < 0 || paginaMeta < 0) {
      return alert('Páginas não podem ser negativas.');
    }
    if (paginasTotais > 0 && paginaMeta > paginasTotais) {
      return alert('A página atual/meta não pode ser maior que o total de páginas.');
    }
    if (nota !== null && (Number.isNaN(nota) || nota < 0 || nota > 5)) {
      return alert('A nota deve estar entre 0 e 5.');
    }

    const btnSalvar = document.getElementById('btn-salvar-modulo');
    const editId = document.getElementById('edit-id').value;
    if (editId) {
      const livroAtual = estadoApp.encontros.find(item => String(item.id) === String(editId));
      if (!confirm(`Salvar as alterações de “${livroAtual?.titulo || 'este registro'}”?`)) return;
    }
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Processando e salvando...';

    try {
      let urlsFotos = editId ? [...estadoApp.fotosEmEdicao] : [];
      const arquivos = document.getElementById('encontro-fotos').files;

      for (const file of arquivos) {
        try {
          const url = await fazerUploadFotoComprimida(file, 'encontro');
          if (url) urlsFotos.push(url);
        } catch (err) {
          console.error('Erro ao comprimir/enviar foto:', err);
          throw new Error('Uma foto não pôde ser enviada. Confira o formato e tente novamente.');
        }
      }

      const dadosModulo = {
        titulo: document.getElementById('livro-titulo').value.trim(),
        autor: document.getElementById('livro-autor').value.trim(),
        capa: document.getElementById('livro-capa').value.trim(),
        genero: generosSelecionados.join(', '),
        status: document.getElementById('livro-status').value,
        data_encontro: document.getElementById('encontro-data').value,
        horario_local: document.getElementById('encontro-local').value.trim(),
        paginas_totais: paginasTotais,
        pagina_meta: paginaMeta,
        meta_texto: document.getElementById('livro-meta-texto').value.trim(),
        nota,
        bio_autor: document.getElementById('autor-bio').value.trim(),
        discussao: document.getElementById('encontro-discussao').value.trim(),
        fotos: urlsFotos,
        tipo_postagem: editId ? (document.getElementById('edit-tipo-postagem').value || 'clube') : 'clube',
        autor_postagem_id: editId
          ? (document.getElementById('edit-autor-postagem-id').value || estadoApp.usuario?.id || null)
          : (estadoApp.usuario?.id || null),
        autor_postagem_nome: editId
          ? (document.getElementById('edit-autor-postagem-nome').value || estadoApp.perfilUsuario?.nome || '')
          : (estadoApp.perfilUsuario?.nome || '')
      };

      const query = editId
        ? supabaseClient.from('encontros').update(dadosModulo).eq('id', editId)
        : supabaseClient.from('encontros').insert([dadosModulo]);
      const { error: erroOperacao } = await query;
      if (erroOperacao) throw erroOperacao;

      resetarFormulario();
      await carregarEncontros();
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.textContent = document.getElementById('edit-id').value
        ? 'Salvar Alterações'
        : 'Publicar no Site';
    }
  };

  // Guia de Discussão
  document.getElementById('form-guia').onsubmit = async (e) => {
    e.preventDefault();
    if (!estadoApp.ehAdminMaster) return alert('Apenas o Admin Master pode editar o guia.');
    if (!confirm('Salvar as alterações do guia de discussão?')) return;

    const btn = document.getElementById('btn-salvar-guia');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const titulo = document.getElementById('guia-titulo-input').value;
    const conteudo = document.getElementById('guia-conteudo-input').value;

    const { error } = await supabaseClient
      .from('guia_clube')
      .upsert({ id: 1, titulo, conteudo });

    btn.disabled = false;
    btn.textContent = 'Salvar Guia Atualizado';

    if (error) return alert('Erro ao salvar guia: ' + error.message);
    alert('Guia de discussão atualizado com sucesso!');
    carregarGuia();
  };

  // Indicações e Filtros
  document.getElementById('form-indicacao').onsubmit = (e) => {
    e.preventDefault();
    criarIndicacaoLivro({
      titulo: document.getElementById('indicacao-titulo').value.trim(),
      autor: document.getElementById('indicacao-autor').value.trim(),
      genero: document.getElementById('indicacao-genero').value,
      motivo: document.getElementById('indicacao-motivo').value.trim(),
      botao: document.getElementById('btn-enviar-indicacao')
    });
  };

  document.getElementById('filtro-tipo').onchange = renderizarTela;
  document.getElementById('filtro-status').onchange = renderizarTela;
  document.getElementById('filtro-genero').onchange = renderizarTela;
  document.getElementById('filtro-texto').oninput = renderizarTela;
}

montarSeletoresDeGenero();
registrarEventos();
iniciarMonitoramentoRecuperacaoSenha();
carregarGuia();
carregarEncontros().then(async () => {
  await verificarSessao();
  await carregarPerfilCompartilhadoSolicitado();
});