function obterRequisitosSenha(senha) {
  return {
    tamanho: senha.length >= 8,
    minuscula: /[a-z]/.test(senha),
    maiuscula: /[A-Z]/.test(senha),
    numero: /\d/.test(senha)
  };
}

function senhaAtendeRequisitos(senha) {
  return Object.values(obterRequisitosSenha(senha)).every(Boolean);
}

function atualizarIndicadorForcaSenha(inputId, progressoId, feedbackId) {
  const senha = document.getElementById(inputId).value;
  const requisitos = obterRequisitosSenha(senha);
  const total = Object.values(requisitos).filter(Boolean).length;
  const progresso = document.getElementById(progressoId);
  const feedback = document.getElementById(feedbackId);
  progresso.value = total;

  if (!senha) {
    feedback.textContent = 'Use 8 ou mais caracteres, com letra maiúscula, minúscula e número.';
    feedback.className = '';
    return;
  }

  const faltantes = [];
  if (!requisitos.tamanho) faltantes.push('8 caracteres');
  if (!requisitos.minuscula) faltantes.push('uma letra minúscula');
  if (!requisitos.maiuscula) faltantes.push('uma letra maiúscula');
  if (!requisitos.numero) faltantes.push('um número');

  feedback.textContent = faltantes.length
    ? `Falta incluir: ${faltantes.join(', ')}.`
    : 'Senha forte: todos os requisitos foram atendidos.';
  feedback.className = faltantes.length ? 'feedback-campo' : 'feedback-campo sucesso';
}

function mostrarMensagemConta(texto, tipo = 'informacao') {
  const mensagem = document.getElementById('conta-mensagem');
  if (!mensagem) return;
  mensagem.textContent = texto;
  mensagem.className = `mensagem-conta ${tipo}`;
}

function ocultarSenhasExibidas() {
  document.querySelectorAll('[data-toggle-password]').forEach(botao => {
    const campo = document.getElementById(botao.dataset.togglePassword);
    campo.type = 'password';
    botao.textContent = 'Mostrar';
    botao.setAttribute('aria-label', 'Mostrar senha');
    botao.setAttribute('aria-pressed', 'false');
  });
}

function traduzirErroAutenticacao(error) {
  const mensagem = (error?.message || '').toLowerCase();
  if (mensagem.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  }
  if (mensagem.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Abra o link enviado para sua caixa de entrada e tente entrar novamente.';
  }
  if (mensagem.includes('already registered') || mensagem.includes('user already registered')) {
    return 'Este e-mail já possui cadastro. Entre na conta ou use “Esqueci minha senha”.';
  }
  if (mensagem.includes('password should be at least') || mensagem.includes('weak password')) {
    return 'A senha não atende aos requisitos. Use pelo menos 8 caracteres, com maiúscula, minúscula e número.';
  }
  if (mensagem.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }
  if (mensagem.includes('permission denied for table perfis_clube')) {
    return 'O banco recusou salvar o perfil. Confirme se a migração atualizada foi executada no Supabase e tente entrar novamente.';
  }
  return error?.message
    ? `Não foi possível concluir a solicitação: ${error.message}`
    : 'Não foi possível concluir a solicitação. Tente novamente.';
}

function obterUrlRedirecionamentoAuth() {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return null;
  }
  return `${window.location.origin}${window.location.pathname}`;
}

function ativarModoRecuperacaoSenha() {
  estadoApp.recuperacaoSenhaAtiva = true;
  estadoApp.usuario = null;
  estadoApp.perfilUsuario = null;
  estadoApp.detalhesPerfilUsuario = null;
  estadoApp.perfis = {};
  estadoApp.ehAdminMaster = false;
  estadoApp.progressoLeitura = [];
  estadoApp.metasLeitura = null;
  estadoApp.progressoPublicado = null;

  atualizarInterfaceSessao();
  navegarParaPagina('conta');
  document.getElementById('secao-conta-usuario').classList.remove('oculto');
  document.getElementById('tab-user-login').classList.add('oculto');
  document.getElementById('tab-user-cadastro').classList.add('oculto');
  document.getElementById('form-user-login-box').classList.add('oculto');
  document.getElementById('form-user-cadastro-box').classList.add('oculto');
  document.getElementById('form-user-redefinir-box').classList.remove('oculto');
  mostrarMensagemConta('Defina uma nova senha. Se o link tiver expirado, volte ao login e solicite outro.', 'informacao');
}

function iniciarMonitoramentoRecuperacaoSenha() {
  const parametrosHash = new URLSearchParams(window.location.hash.slice(1));
  if (parametrosHash.get('type') === 'recovery') {
    ativarModoRecuperacaoSenha();
  }

  supabaseClient.auth.onAuthStateChange(evento => {
    if (evento === 'PASSWORD_RECOVERY') {
      window.setTimeout(ativarModoRecuperacaoSenha, 0);
    }
  });
}

async function voltarAoLogin() {
  try {
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) throw error;

    estadoApp.recuperacaoSenhaAtiva = false;
    estadoApp.sessao = null;
    estadoApp.usuario = null;
    estadoApp.perfilUsuario = null;
    estadoApp.detalhesPerfilUsuario = null;
    estadoApp.perfis = {};
    estadoApp.progressoLeitura = [];
    estadoApp.metasLeitura = null;
    estadoApp.progressoPublicado = null;
    document.getElementById('form-user-redefinir-senha').reset();
    atualizarIndicadorForcaSenha('user-redefinir-senha', 'user-redefinir-senha-progresso', 'user-redefinir-senha-feedback');
    document.getElementById('user-redefinir-confirma-feedback').textContent = '';
    ocultarSenhasExibidas();
    window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    atualizarInterfaceSessao();
    mostrarMensagemConta('Você voltou ao login. Se o link expirou, solicite um novo pela opção “Esqueci minha senha”.', 'informacao');
  } catch (error) {
    mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');
  }
}

async function carregarPerfis() {
  estadoApp.perfis = {};
  const ehAdmin = Boolean(
    estadoApp.usuario &&
    (estadoApp.usuario.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase()
  );
  const nomeFuncao = ehAdmin ? 'clube_listar_perfis_admin' : 'clube_perfis_exibicao';
  const { data, error } = await supabaseClient.rpc(nomeFuncao);
  if (error) {
    estadoApp.perfilUsuario = null;
    console.error('Erro ao carregar perfis visíveis:', error.message);
    return;
  }

  let perfisAssinados;
  try {
    perfisAssinados = await assinarFotosDePerfis(data || []);
  } catch (erroFoto) {
    estadoApp.perfilUsuario = null;
    console.error('Erro ao carregar fotos de perfil autorizadas:', erroFoto);
    return;
  }

  const mapa = {};
  perfisAssinados.forEach(p => {
    mapa[p.id] = p;
  });

  estadoApp.perfis = mapa;
  estadoApp.perfilUsuario = estadoApp.usuario ? (mapa[estadoApp.usuario.id] || null) : null;
}

async function garantirPerfilUsuario(user, nomeInformado = '', fotoUrl = '') {
  if (!user) return null;

  const existente = estadoApp.perfis[user.id];
  const nomeAtualizado = nomeInformado.trim();
  if (existente && !nomeAtualizado && !fotoUrl) {
    estadoApp.perfilUsuario = existente;
    return existente;
  }

  const { data: perfilAtual, error: erroPerfilAtual } = await supabaseClient
    .from('perfis_clube')
    .select('id, nome, foto_url, pode_publicar_resenha, criado_em')
    .eq('id', user.id)
    .maybeSingle();
  if (erroPerfilAtual) throw erroPerfilAtual;
  if (perfilAtual && !nomeAtualizado && !fotoUrl) {
    const [perfilAssinado] = await assinarFotosDePerfis([perfilAtual]);
    estadoApp.perfis[user.id] = perfilAssinado;
    estadoApp.perfilUsuario = perfilAssinado;
    return perfilAssinado;
  }

  const nomeFinal =
    nomeAtualizado ||
    existente?.nome ||
    perfilAtual?.nome ||
    user.user_metadata?.nome ||
    user.email?.split('@')[0] ||
    'Leitor(a)';
  const fotoFinal = fotoUrl || existente?.foto_path || perfilAtual?.foto_url || '';
  const isMaster = (user.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase();

  const camposPerfil = {
    nome: nomeFinal,
    foto_url: fotoFinal,
    pode_publicar_resenha: isMaster
      ? true
      : Boolean(perfilAtual?.pode_publicar_resenha ?? existente?.pode_publicar_resenha)
  };

  const payload = { id: user.id, ...camposPerfil };
  const colunasRetorno = 'id, nome, foto_url, pode_publicar_resenha, criado_em';
  const salvarPerfil = (inserir) => {
    const consulta = inserir
      ? supabaseClient.from('perfis_clube').insert(payload)
      : supabaseClient.from('perfis_clube').update(camposPerfil).eq('id', user.id);
    return consulta.select(colunasRetorno).single();
  };

  let { data, error } = await salvarPerfil(!perfilAtual);
  if (error?.code === '23505' && !perfilAtual) {
    ({ data, error } = await salvarPerfil(false));
  }

  if (error) throw error;
  if (!data) throw new Error('O perfil não foi retornado após salvar.');

  const [perfilAssinado] = await assinarFotosDePerfis([data]);
  estadoApp.perfis[user.id] = perfilAssinado;
  estadoApp.perfilUsuario = perfilAssinado;
  return perfilAssinado;
}

function mostrarMensagemPerfil(texto, tipo = 'informacao') {
  const mensagem = document.getElementById('perfil-mensagem');
  mensagem.textContent = texto;
  mensagem.className = `mensagem-conta ${tipo}`;
}

function revogarPreviewFotoPerfil(preview) {
  if (preview.dataset.previewUrl) {
    URL.revokeObjectURL(preview.dataset.previewUrl);
    delete preview.dataset.previewUrl;
  }
}

function limparPainelPerfil() {
  document.getElementById('form-perfil-membro').reset();
  const preview = document.getElementById('perfil-foto-atual');
  revogarPreviewFotoPerfil(preview);
  preview.removeAttribute('src');
  preview.classList.add('oculto');
  document.getElementById('lista-perfis-membros').textContent = '';
  document.getElementById('busca-perfis').value = '';
  document.getElementById('perfil-mensagem').classList.add('oculto');
}

function configurarSeletoresVisibilidadePerfil() {
  const opcoes = [
    ['privado', 'Somente eu'],
    ['membros', 'Membros conectados'],
    ['publico', 'Todos os visitantes']
  ];
  document.querySelectorAll('.perfil-visibilidade').forEach(select => {
    select.innerHTML = opcoes
      .map(([valor, rotulo]) => `<option value="${valor}">${rotulo}</option>`)
      .join('');
  });
}

async function carregarMeuPerfil() {
  if (!estadoApp.usuario) return;

  const { data: perfil, error: erroPerfil } = await supabaseClient
    .from('perfis_clube')
    .select('id, nome, foto_url, pode_publicar_resenha, criado_em')
    .eq('id', estadoApp.usuario.id)
    .maybeSingle();
  if (erroPerfil) {
    mostrarMensagemPerfil(`Não foi possível carregar seu perfil: ${erroPerfil.message}`, 'erro');
    return false;
  }
  if (!perfil) {
    mostrarMensagemPerfil('Seu perfil ainda não foi criado. Saia e entre novamente para tentar de novo.', 'erro');
    return false;
  }

  const { data: detalhes, error: erroDetalhes } = await supabaseClient
    .from('perfis_clube_detalhes')
    .select('*')
    .eq('usuario_id', estadoApp.usuario.id)
    .maybeSingle();
  if (erroDetalhes) {
    mostrarMensagemPerfil(`Não foi possível carregar as informações privadas do perfil: ${erroDetalhes.message}`, 'erro');
    return false;
  }

  let perfilAssinado;
  try {
    [perfilAssinado] = await assinarFotosDePerfis([perfil]);
  } catch (errorFoto) {
    mostrarMensagemPerfil(`Não foi possível carregar a foto do perfil: ${errorFoto.message}`, 'erro');
    return false;
  }
  estadoApp.perfilUsuario = perfilAssinado;
  const dados = detalhes || {};
  const campos = {
    'perfil-nome': perfil.nome || '',
    'perfil-bio': dados.bio || '',
    'perfil-cidade-estado': dados.cidade_estado || '',
    'perfil-generos': dados.generos_favoritos || '',
    'perfil-livros': dados.livros_favoritos || '',
    'perfil-autores': dados.autores_favoritos || '',
    'perfil-link': dados.link_perfil || '',
    'perfil-extra-nome': dados.campo_personalizado_nome || '',
    'perfil-extra-valor': dados.campo_personalizado_valor || ''
  };
  Object.entries(campos).forEach(([id, valor]) => {
    document.getElementById(id).value = valor;
  });

  const visibilidades = {
    'perfil-vis-nome': 'visibilidade_nome',
    'perfil-vis-foto': 'visibilidade_foto',
    'perfil-vis-bio': 'visibilidade_bio',
    'perfil-vis-cidade': 'visibilidade_cidade_estado',
    'perfil-vis-generos': 'visibilidade_generos_favoritos',
    'perfil-vis-livros': 'visibilidade_livros_favoritos',
    'perfil-vis-autores': 'visibilidade_autores_favoritos',
    'perfil-vis-link': 'visibilidade_link_perfil',
    'perfil-vis-extra': 'visibilidade_campo_personalizado'
  };
  Object.entries(visibilidades).forEach(([id, campo]) => {
    document.getElementById(id).value = dados[campo] || 'privado';
  });

  document.getElementById('perfil-listar-diretorio').checked = Boolean(dados.listar_no_diretorio);
  document.getElementById('perfil-foto').value = '';
  document.getElementById('perfil-remover-foto').checked = false;
  const preview = document.getElementById('perfil-foto-atual');
  revogarPreviewFotoPerfil(preview);
  preview.src = perfilAssinado.foto_url || '';
  preview.classList.toggle('oculto', !perfilAssinado.foto_url);
  const feedbackFoto = document.getElementById('perfil-foto-feedback');
  feedbackFoto.textContent = 'JPG, PNG ou WebP, até 10 MB. A imagem será comprimida antes do envio.';
  feedbackFoto.className = 'feedback-foto';
  return true;
}

async function abrirPainelPerfil() {
  if (!estadoApp.usuario) {
    paginaAposFluxoConta = 'perfil';
    navegarParaPagina('conta');
    return mostrarMensagemConta('Entre na sua conta para acessar seu perfil.', 'informacao');
  }
  navegarParaPagina('perfil');
}

async function abrirDiretorioMembros() {
  if (!estadoApp.usuario) {
    paginaAposFluxoConta = 'membros';
    navegarParaPagina('conta');
    return mostrarMensagemConta('Entre na sua conta para pesquisar membros.', 'informacao');
  }
  navegarParaPagina('membros');
}

async function salvarMeuPerfil(event) {
  event.preventDefault();
  if (!estadoApp.usuario) {
    return mostrarMensagemPerfil('Entre na sua conta para salvar alterações no perfil.', 'erro');
  }

  const botao = document.getElementById('btn-salvar-perfil');
  const fotoArquivo = document.getElementById('perfil-foto').files[0];
  const removerFoto = document.getElementById('perfil-remover-foto').checked;
  const fotoAnterior = estadoApp.perfilUsuario?.foto_path || '';
  const visibilidadeFoto = document.getElementById('perfil-vis-foto').value;
  const listarNoDiretorio = document.getElementById('perfil-listar-diretorio').checked;
  let fotoNova = fotoAnterior;
  let fotoEnviada = '';
  let avisoFoto = '';

  if (listarNoDiretorio && document.getElementById('perfil-vis-nome').value === 'privado') {
    return mostrarMensagemPerfil('Para aparecer na busca, seu nome precisa estar visível ao menos para os membros conectados.', 'erro');
  }
  const erroFoto = validarArquivoFotoPerfil(fotoArquivo);
  if (erroFoto) return mostrarMensagemPerfil(erroFoto, 'erro');
  if (fotoArquivo && removerFoto) {
    return mostrarMensagemPerfil('Escolha uma foto nova ou marque a remoção, não as duas opções.', 'erro');
  }
  if (fotoAnterior && /^https?:\/\//i.test(fotoAnterior) && visibilidadeFoto !== 'publico' && !fotoArquivo && !removerFoto) {
    return mostrarMensagemPerfil(
      'Sua foto atual está hospedada em um endereço público antigo. Envie-a novamente ou remova-a antes de restringir quem pode vê-la.',
      'erro'
    );
  }
  if (removerFoto) fotoNova = '';

  botao.disabled = true;
  botao.textContent = 'Salvando...';
  try {
    if (fotoArquivo) {
      fotoEnviada = await fazerUploadFotoPerfilComprimida(fotoArquivo, estadoApp.usuario.id);
      fotoNova = fotoEnviada;
    }

    const parametros = {
      p_nome: document.getElementById('perfil-nome').value.trim(),
      p_foto_url: fotoNova,
      p_bio: document.getElementById('perfil-bio').value.trim(),
      p_cidade_estado: document.getElementById('perfil-cidade-estado').value.trim(),
      p_generos_favoritos: document.getElementById('perfil-generos').value.trim(),
      p_livros_favoritos: document.getElementById('perfil-livros').value.trim(),
      p_autores_favoritos: document.getElementById('perfil-autores').value.trim(),
      p_link_perfil: document.getElementById('perfil-link').value.trim(),
      p_campo_personalizado_nome: document.getElementById('perfil-extra-nome').value.trim(),
      p_campo_personalizado_valor: document.getElementById('perfil-extra-valor').value.trim(),
      p_listar_no_diretorio: listarNoDiretorio,
      p_visibilidade_nome: document.getElementById('perfil-vis-nome').value,
      p_visibilidade_foto: visibilidadeFoto,
      p_visibilidade_bio: document.getElementById('perfil-vis-bio').value,
      p_visibilidade_cidade_estado: document.getElementById('perfil-vis-cidade').value,
      p_visibilidade_generos_favoritos: document.getElementById('perfil-vis-generos').value,
      p_visibilidade_livros_favoritos: document.getElementById('perfil-vis-livros').value,
      p_visibilidade_autores_favoritos: document.getElementById('perfil-vis-autores').value,
      p_visibilidade_link_perfil: document.getElementById('perfil-vis-link').value,
      p_visibilidade_campo_personalizado: document.getElementById('perfil-vis-extra').value
    };
    const { error } = await supabaseClient.rpc('clube_salvar_meu_perfil', parametros);
    if (error) throw error;
  } catch (error) {
    if (fotoEnviada) {
      try {
        await removerFotoPerfilAntiga(fotoEnviada);
      } catch (erroRemocao) {
        console.error('Não foi possível limpar a foto enviada após falha ao salvar o perfil:', erroRemocao);
      }
    }
    mostrarMensagemPerfil(`Não foi possível salvar o perfil: ${error.message}`, 'erro');
    botao.disabled = false;
    botao.textContent = 'Salvar meu perfil';
    return;
  }

  if (fotoAnterior && fotoAnterior !== fotoNova) {
    try {
      const removida = await removerFotoPerfilAntiga(fotoAnterior);
      if (!removida) avisoFoto = ' A foto antiga é hospedada fora do site e continua sujeita às regras desse serviço.';
    } catch (erroRemocao) {
      avisoFoto = ` Não foi possível remover a foto antiga do armazenamento: ${erroRemocao.message}`;
    }
  }

  try {
    await carregarPerfis();
    await carregarComunidade();
    await carregarMetricasGrupo();
    if (!await carregarMeuPerfil()) {
      throw new Error('Não foi possível recarregar os dados do perfil.');
    }
    await buscarPerfis();
    atualizarInterfaceSessao();
    mostrarMensagemPerfil(`Perfil salvo. As opções de privacidade foram aplicadas.${avisoFoto}`, avisoFoto ? 'informacao' : 'sucesso');
  } catch (errorAtualizacao) {
    mostrarMensagemPerfil(
      `Perfil salvo, mas não foi possível atualizar todas as informações na tela: ${errorAtualizacao.message}${avisoFoto}`,
      'informacao'
    );
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar meu perfil';
  }
}

async function buscarPerfis() {
  if (!estadoApp.usuario) return;
  const termo = document.getElementById('busca-perfis').value.trim();
  const { data, error } = await supabaseClient.rpc('clube_buscar_perfis', { p_busca: termo });
  if (error) {
    renderizarDiretorioPerfis([], `Não foi possível pesquisar perfis: ${error.message}`);
    return;
  }
  try {
    const perfisAssinados = await assinarFotosDePerfis(data || []);
    renderizarDiretorioPerfis(perfisAssinados);
  } catch (errorFoto) {
    renderizarDiretorioPerfis([], `Não foi possível carregar as fotos dos perfis: ${errorFoto.message}`);
  }
}

async function carregarPerfilCompartilhadoSolicitado() {
  const usuarioId = new URLSearchParams(window.location.search).get('perfil');
  if (!usuarioId) return;

  const container = document.getElementById('perfil-compartilhado');
  container.classList.remove('oculto');
  navegarParaPagina('perfil-publico');
  container.textContent = 'Carregando perfil...';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuarioId)) {
    container.textContent = 'O link do perfil não é válido.';
    return;
  }

  const { data, error } = await supabaseClient.rpc('clube_perfil_detalhado', { p_usuario_id: usuarioId });
  if (error) {
    container.textContent = `Não foi possível carregar este perfil: ${error.message}`;
    return;
  }
  const perfil = (data || [])[0];
  if (!perfil) {
    container.textContent = 'Este perfil não está disponível ou não compartilha informações com você.';
    return;
  }
  try {
    const [perfilAssinado] = await assinarFotosDePerfis([perfil]);
    renderizarPerfilCompartilhado(perfilAssinado);
  } catch (errorFoto) {
    container.textContent = `Não foi possível carregar a foto do perfil: ${errorFoto.message}`;
  }
}

function podeUsuarioPublicarResenha() {
  return Boolean(estadoApp.usuario && (estadoApp.ehAdminMaster || estadoApp.perfilUsuario?.pode_publicar_resenha));
}

function atualizarInterfaceSessao() {
  const painelAdmin = document.getElementById('painel-admin');
  const secaoContaUsuario = document.getElementById('secao-conta-usuario');
  const btnAbrirConta = document.getElementById('btn-abrir-conta');
  const secaoPerfilMembros = document.getElementById('secao-perfil-membros');
  const btnSair = document.getElementById('btn-sair');
  const badgeUsuario = document.getElementById('badge-usuario-logado');
  const secaoDiretorioPerfis = document.getElementById('secao-diretorio-perfis');

  if (!estadoApp.recuperacaoSenhaAtiva && !estadoApp.usuario) {
    document.getElementById('tab-user-login').classList.remove('oculto');
    document.getElementById('tab-user-cadastro').classList.remove('oculto');
    document.getElementById('form-user-redefinir-box').classList.add('oculto');
    document.getElementById('form-user-login-box').classList.remove('oculto');
    document.getElementById('form-user-cadastro-box').classList.add('oculto');
    document.getElementById('tab-user-login').className = 'btn-primario';
    document.getElementById('tab-user-cadastro').className = 'btn-secundario';
  }

  estadoApp.ehAdminMaster = Boolean(
    estadoApp.usuario &&
    (estadoApp.usuario.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase()
  );
  document.querySelectorAll('[data-requer-login]').forEach(elemento => {
    elemento.classList.toggle('oculto', !estadoApp.usuario);
  });
  document.querySelectorAll('[data-requer-admin]').forEach(elemento => {
    elemento.classList.toggle('oculto', !estadoApp.ehAdminMaster);
  });

  if (estadoApp.usuario) {
    secaoContaUsuario.classList.add('oculto');
    btnAbrirConta.classList.add('oculto');
    btnSair.classList.remove('oculto');

    const nomeExibido = estadoApp.perfilUsuario?.nome || estadoApp.usuario.email;
    const fotoExibida = estadoApp.perfilUsuario?.foto_url || avatarPadrao(nomeExibido);
    badgeUsuario.classList.remove('oculto');
    badgeUsuario.setAttribute('aria-label', `Abrir perfil de ${nomeExibido}`);
    badgeUsuario.title = 'Abrir meu perfil';
    badgeUsuario.innerHTML = `
      <img src="${escaparHTML(fotoExibida)}" alt="">
      <span>${escaparHTML(nomeExibido)}${estadoApp.ehAdminMaster ? ' • Admin Master' : ''}</span>
    `;
    const imagemBadge = badgeUsuario.querySelector('img');
    imagemBadge.onerror = () => {
      imagemBadge.onerror = null;
      imagemBadge.src = avatarPadrao(nomeExibido);
    };
    secaoDiretorioPerfis.classList.remove('oculto');
  } else {
    badgeUsuario.classList.add('oculto');
    btnAbrirConta.classList.remove('oculto');
    secaoPerfilMembros.classList.add('oculto');
    secaoDiretorioPerfis.classList.add('oculto');
    limparPainelPerfil();
    btnSair.classList.add('oculto');
  }

  painelAdmin.classList.toggle('oculto', !estadoApp.ehAdminMaster);
  const paginaRestritaSemAcesso = (
    (!estadoApp.usuario && ['perfil', 'membros'].includes(paginaAtualApp)) ||
    (paginaAtualApp === 'admin' && !estadoApp.ehAdminMaster)
  );
  if (paginaRestritaSemAcesso) {
    historicoNavegacaoApp = [];
    window.history.replaceState({ paginaApp: 'inicio' }, '', construirUrlPagina('inicio'));
    aplicarPaginaApp('inicio', false);
  }

  const btnNovaResenha = document.getElementById('btn-toggle-resenha-individual');
  const liberadoResenha = podeUsuarioPublicarResenha();
  if (btnNovaResenha) {
    btnNovaResenha.classList.toggle('oculto', !liberadoResenha);
  }
  if (!liberadoResenha) {
    document.getElementById('box-resenha-individual')?.classList.add('oculto');
  }

  if (estadoApp.ehAdminMaster) {
    renderizarUsuariosAdmin();
  }
  renderizarIndicacoes();
  renderizarTela();
  renderizarAcompanhamentoLeitura();
}

async function verificarSessao() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  estadoApp.sessao = session;
  if (estadoApp.recuperacaoSenhaAtiva) {
    estadoApp.usuario = null;
    estadoApp.perfilUsuario = null;
    return;
  }
  estadoApp.usuario = session?.user || null;

  if (estadoApp.usuario) {
    registrarVisitaSite(estadoApp.usuario.id).catch(error => {
      console.error('Não foi possível associar a sessão ao membro conectado:', error);
    });
  }

  await carregarPerfis();
  if (estadoApp.usuario && !estadoApp.perfilUsuario) {
    try {
      await garantirPerfilUsuario(estadoApp.usuario);
    } catch (error) {
      console.error('Erro ao criar ou carregar o perfil do membro:', error);
      mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');
    }
  }
  await carregarProgressoLeitura();

  atualizarInterfaceSessao();
}

async function entrarComoMembro(email, password) {
  if (!email || !password) {
    return mostrarMensagemConta('Informe seu e-mail e sua senha para entrar.', 'erro');
  }

  const botao = document.getElementById('btn-user-entrar');
  botao.disabled = true;
  botao.textContent = 'Entrando...';
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');

    estadoApp.recuperacaoSenhaAtiva = false;
    estadoApp.usuario = data.user;
    registrarVisitaSite(data.user.id).catch(error => {
      console.error('Não foi possível associar a sessão ao membro conectado:', error);
    });
    await carregarPerfis();
    await garantirPerfilUsuario(data.user);
    await carregarProgressoLeitura();
    document.getElementById('form-user-login').reset();
    ocultarSenhasExibidas();
    atualizarInterfaceSessao();
    concluirFluxoConta();
  } catch (error) {
    mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
}

async function cadastrarMembro({ nome, email, password, confirmarSenha, fotoArquivo, botao }) {
  if (!nome || !email || !password) {
    return mostrarMensagemConta('Preencha seu nome, e-mail e senha.', 'erro');
  }
  if (!senhaAtendeRequisitos(password)) {
    return mostrarMensagemConta(
      'A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.',
      'erro'
    );
  }
  if (password !== confirmarSenha) {
    return mostrarMensagemConta('As senhas não conferem. Digite a mesma senha nos dois campos.', 'erro');
  }
  const erroFoto = validarArquivoFotoPerfil(fotoArquivo);
  if (erroFoto) return mostrarMensagemConta(erroFoto, 'erro');

  botao.disabled = true;
  botao.textContent = 'Criando conta...';

  let contaCriada = false;
  try {
    const redirectTo = obterUrlRedirecionamentoAuth();
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {})
      }
    });
    if (error) throw error;
    contaCriada = true;

    let fotoUrl = '';
    if (fotoArquivo && data.session) {
      fotoUrl = await fazerUploadFotoPerfilComprimida(fotoArquivo, data.user.id);
    }

    if (data.user && data.session) {
      estadoApp.recuperacaoSenhaAtiva = false;
      estadoApp.usuario = data.user;
      registrarVisitaSite(data.user.id).catch(error => {
        console.error('Não foi possível associar a sessão ao novo membro:', error);
      });
      await garantirPerfilUsuario(data.user, nome, fotoUrl);
      await carregarComunidade();
      await carregarProgressoLeitura();
      document.getElementById('form-user-cadastro').reset();
      limparPrevisualizacaoFotoPerfil('user-cad-foto', 'user-cad-foto-preview', 'user-cad-foto-feedback');
      atualizarIndicadorForcaSenha('user-cad-senha', 'user-cad-senha-progresso', 'user-cad-senha-feedback');
      document.getElementById('user-cad-confirma-feedback').textContent = '';
      ocultarSenhasExibidas();
      atualizarInterfaceSessao();
      concluirFluxoConta();
      alert('Conta criada com sucesso! Bem-vindo(a) ao Clube do Livro.');
    } else {
      document.getElementById('form-user-cadastro').reset();
      limparPrevisualizacaoFotoPerfil('user-cad-foto', 'user-cad-foto-preview', 'user-cad-foto-feedback');
      atualizarIndicadorForcaSenha('user-cad-senha', 'user-cad-senha-progresso', 'user-cad-senha-feedback');
      document.getElementById('user-cad-confirma-feedback').textContent = '';
      ocultarSenhasExibidas();
      const avisoFoto = fotoArquivo
        ? ' A foto não foi enviada porque a conta ainda aguarda confirmação; depois de confirmar o e-mail, entre e adicione a foto em Meu perfil.'
        : '';
      mostrarMensagemConta(
        `Cadastro iniciado. Enviamos um link de confirmação para seu e-mail. Abra-o (confira também o spam) e depois entre na sua conta.${avisoFoto}`,
        'sucesso'
      );
    }
  } catch (err) {
    const mensagem = traduzirErroAutenticacao(err);
    mostrarMensagemConta(
      contaCriada
        ? `Sua conta foi criada, mas não conseguimos concluir uma etapa do perfil. Entre na conta para continuar. ${mensagem}`
        : mensagem,
      'erro'
    );
  } finally {
    botao.disabled = false;
    botao.textContent = 'Criar Conta';
  }
}

async function solicitarRedefinicaoSenha(email) {
  if (!email) return mostrarMensagemConta('Informe seu e-mail para receber o link de redefinição.', 'erro');
  const campoEmail = document.getElementById('user-login-email');
  if (!campoEmail.checkValidity()) {
    return mostrarMensagemConta('Digite um endereço de e-mail válido.', 'erro');
  }

  const redirectTo = obterUrlRedirecionamentoAuth();
  if (!redirectTo) {
    return mostrarMensagemConta(
      'Abra o site por um endereço http:// ou https:// para solicitar a redefinição de senha.',
      'erro'
    );
  }

  const botao = document.getElementById('btn-esqueceu-senha');
  botao.disabled = true;
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');
    mostrarMensagemConta(
      'Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha. Confira sua caixa de entrada e o spam.',
      'sucesso'
    );
  } catch (error) {
    mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');
  } finally {
    botao.disabled = false;
  }
}

async function redefinirSenha(password, confirmarSenha, botao) {
  if (!estadoApp.recuperacaoSenhaAtiva) {
    return mostrarMensagemConta('Solicite um novo link de redefinição antes de alterar a senha.', 'erro');
  }
  if (!senhaAtendeRequisitos(password)) {
    return mostrarMensagemConta(
      'A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.',
      'erro'
    );
  }
  if (password !== confirmarSenha) {
    return mostrarMensagemConta('As senhas não conferem. Digite a mesma senha nos dois campos.', 'erro');
  }

  botao.disabled = true;
  botao.textContent = 'Salvando...';
  try {
    const { data, error } = await supabaseClient.auth.updateUser({ password });
    if (error) return mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');
    if (!data.user) {
      return mostrarMensagemConta('A senha não foi atualizada. Solicite um novo link e tente novamente.', 'erro');
    }

    const { data: sessaoData } = await supabaseClient.auth.getSession();
    estadoApp.recuperacaoSenhaAtiva = false;
    estadoApp.sessao = sessaoData.session;
    estadoApp.usuario = data.user;
    await carregarPerfis();
    if (!estadoApp.perfilUsuario) await garantirPerfilUsuario(data.user);
    await carregarComunidade();
    await carregarProgressoLeitura();
    document.getElementById('form-user-redefinir-senha').reset();
    atualizarIndicadorForcaSenha('user-redefinir-senha', 'user-redefinir-senha-progresso', 'user-redefinir-senha-feedback');
    document.getElementById('user-redefinir-confirma-feedback').textContent = '';
    ocultarSenhasExibidas();
    window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    atualizarInterfaceSessao();
    alert('Senha atualizada com sucesso. Você já entrou na sua conta.');
  } catch (error) {
    mostrarMensagemConta(traduzirErroAutenticacao(error), 'erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar nova senha';
  }
}

async function sairDaConta() {
  await supabaseClient.auth.signOut();
  estadoApp.sessao = null;
  estadoApp.usuario = null;
  estadoApp.perfilUsuario = null;
  estadoApp.detalhesPerfilUsuario = null;
  estadoApp.perfis = {};
  estadoApp.progressoLeitura = [];
  estadoApp.metasLeitura = null;
  estadoApp.progressoPublicado = null;
  limparCartaoProgresso();
  document.getElementById('meta-paginas-dia').value = '';
  document.getElementById('meta-paginas-semana').value = '';
  document.getElementById('painel-metas-leitura').innerHTML = '';
  document.getElementById('progresso-incluir-nome').checked = false;
  document.getElementById('progresso-incluir-foto').checked = false;
  document.getElementById('progresso-publicado-site').checked = false;
  await carregarPerfis();
  estadoApp.cartoesProgressoPublicos = [];
  await carregarMetricasGrupo();
  atualizarInterfaceSessao();
}

window.alternarPermissaoResenha = async (userId, novoValor) => {
  if (!estadoApp.ehAdminMaster) return alert('Apenas o Admin Master pode alterar permissões.');
  const perfil = estadoApp.perfis[userId];
  if (!confirm(`${novoValor ? 'Habilitar' : 'Revogar'} a permissão de publicar resenhas para ${perfil?.nome || 'este membro'}?`)) {
    return;
  }

  const { error } = await supabaseClient
    .from('perfis_clube')
    .update({ pode_publicar_resenha: Boolean(novoValor) })
    .eq('id', userId);

  if (error) {
    return alert('Não foi possível alterar permissão: ' + error.message);
  }

  await carregarPerfis();
  atualizarInterfaceSessao();
};

window.editarPerfilMembro = async (userId) => {
  if (!estadoApp.ehAdminMaster) return alert('Apenas o Admin Master pode editar perfis.');
  const perfil = estadoApp.perfis[userId];
  if (!perfil) return alert('Selecione um perfil para editar.');

  const nome = prompt('Nome ou apelido do membro:', perfil.nome || '');
  if (nome === null) return;

  const dados = { nome: nome.trim() };
  if (!dados.nome) return alert('O nome ou apelido não pode ficar vazio.');
  if (dados.nome === perfil.nome) return;
  if (!confirm(`Salvar as alterações do perfil de ${perfil.nome}?`)) return;

  const { error } = await supabaseClient
    .from('perfis_clube')
    .update(dados)
    .eq('id', userId);
  if (error) return alert('Erro ao editar perfil: ' + error.message);

  await carregarPerfis();
  atualizarInterfaceSessao();
};