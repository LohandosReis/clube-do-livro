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
  estadoApp.ehAdminMaster = false;
  estadoApp.progressoLeitura = [];
  estadoApp.metasLeitura = null;
  estadoApp.progressoPublicado = null;

  atualizarInterfaceSessao();
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
  const { data, error } = await supabaseClient.from('perfis_clube').select('*');
  if (error) {
    console.warn('Erro ao carregar perfis:', error.message);
    return;
  }

  const mapa = {};
  (data || []).forEach(p => {
    mapa[p.id] = p;
  });

  estadoApp.perfis = mapa;
  estadoApp.perfilUsuario = estadoApp.usuario ? (mapa[estadoApp.usuario.id] || null) : null;
}

async function garantirPerfilUsuario(user, nomeInformado = '', fotoUrl = '') {
  if (!user) return null;

  const existente = estadoApp.perfis[user.id];
  const nomeFinal =
    nomeInformado.trim() ||
    existente?.nome ||
    user.user_metadata?.nome ||
    user.email?.split('@')[0] ||
    'Leitor(a)';
  const fotoFinal = fotoUrl || existente?.foto_url || '';
  const isMaster = (user.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase();

  const payload = {
    id: user.id,
    email: user.email || '',
    nome: nomeFinal,
    foto_url: fotoFinal,
    pode_publicar_resenha: isMaster
      ? true
      : Boolean(existente?.pode_publicar_resenha)
  };

  const { data, error } = await supabaseClient
    .from('perfis_clube')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (!error && data) {
    estadoApp.perfis[user.id] = data;
    estadoApp.perfilUsuario = data;
    return data;
  }

  return existente || payload;
}

function podeUsuarioPublicarResenha() {
  return Boolean(estadoApp.usuario && (estadoApp.ehAdminMaster || estadoApp.perfilUsuario?.pode_publicar_resenha));
}

function atualizarInterfaceSessao() {
  const painelAdmin = document.getElementById('painel-admin');
  const secaoContaUsuario = document.getElementById('secao-conta-usuario');
  const btnAbrirConta = document.getElementById('btn-abrir-conta');
  const btnSair = document.getElementById('btn-sair');
  const badgeUsuario = document.getElementById('badge-usuario-logado');

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

  if (estadoApp.usuario) {
    secaoContaUsuario.classList.add('oculto');
    btnAbrirConta.classList.add('oculto');
    btnSair.classList.remove('oculto');

    const nomeExibido = estadoApp.perfilUsuario?.nome || estadoApp.usuario.email;
    const fotoExibida = estadoApp.perfilUsuario?.foto_url || avatarPadrao(nomeExibido);
    badgeUsuario.classList.remove('oculto');
    badgeUsuario.innerHTML = `
      <img src="${escaparHTML(fotoExibida)}" alt="${escaparHTML(nomeExibido)}">
      <span>${escaparHTML(nomeExibido)}${estadoApp.ehAdminMaster ? ' • Admin Master' : ''}</span>
    `;
  } else {
    badgeUsuario.classList.add('oculto');
    btnAbrirConta.classList.remove('oculto');
    btnSair.classList.add('oculto');
  }

  painelAdmin.classList.toggle('oculto', !estadoApp.ehAdminMaster);

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

  await carregarPerfis();
  if (estadoApp.usuario && !estadoApp.perfilUsuario) {
    await garantirPerfilUsuario(estadoApp.usuario);
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
    await carregarPerfis();
    await garantirPerfilUsuario(data.user);
    await carregarProgressoLeitura();
    document.getElementById('form-user-login').reset();
    ocultarSenhasExibidas();
    atualizarInterfaceSessao();
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
      fotoUrl = await fazerUploadFotoComprimida(fotoArquivo, 'perfil');
    }

    if (data.user && data.session) {
      estadoApp.recuperacaoSenhaAtiva = false;
      estadoApp.usuario = data.user;
      await garantirPerfilUsuario(data.user, nome, fotoUrl);
      await carregarComunidade();
      await carregarProgressoLeitura();
      document.getElementById('form-user-cadastro').reset();
      atualizarIndicadorForcaSenha('user-cad-senha', 'user-cad-senha-progresso', 'user-cad-senha-feedback');
      document.getElementById('user-cad-confirma-feedback').textContent = '';
      ocultarSenhasExibidas();
      atualizarInterfaceSessao();
      alert('Conta criada com sucesso! Bem-vindo(a) ao Clube do Livro.');
    } else {
      document.getElementById('form-user-cadastro').reset();
      atualizarIndicadorForcaSenha('user-cad-senha', 'user-cad-senha-progresso', 'user-cad-senha-feedback');
      document.getElementById('user-cad-confirma-feedback').textContent = '';
      ocultarSenhasExibidas();
      mostrarMensagemConta(
        'Cadastro iniciado. Enviamos um link de confirmação para seu e-mail. Abra-o (confira também o spam) e depois entre na sua conta.',
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

  const nome = prompt('Nome ou apelido público:', perfil.nome || '');
  if (nome === null) return;
  const fotoUrl = prompt('URL da foto de perfil (deixe vazio para usar o avatar padrão):', perfil.foto_url || '');
  if (fotoUrl === null) return;

  const dados = { nome: nome.trim(), foto_url: fotoUrl.trim() };
  if (!dados.nome) return alert('O nome ou apelido não pode ficar vazio.');
  if (dados.nome === perfil.nome && dados.foto_url === (perfil.foto_url || '')) return;
  if (!confirm(`Salvar as alterações do perfil de ${perfil.nome}?`)) return;

  const { error } = await supabaseClient
    .from('perfis_clube')
    .update(dados)
    .eq('id', userId);
  if (error) return alert('Erro ao editar perfil: ' + error.message);

  await carregarPerfis();
  atualizarInterfaceSessao();
};