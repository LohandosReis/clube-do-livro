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
  estadoApp.usuario = session?.user || null;

  await carregarPerfis();
  if (estadoApp.usuario && !estadoApp.perfilUsuario) {
    await garantirPerfilUsuario(estadoApp.usuario);
  }
  await carregarProgressoLeitura();

  atualizarInterfaceSessao();
}

async function entrarComoMembro(email, password) {
  if (!email || !password) return alert('Preencha e-mail e senha.');

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert('Erro ao entrar: ' + error.message);

  estadoApp.usuario = data.user;
  await carregarPerfis();
  await garantirPerfilUsuario(data.user);
  await carregarProgressoLeitura();
  atualizarInterfaceSessao();
}

async function cadastrarMembro({ nome, email, password, fotoArquivo, botao }) {
  if (!nome || !email || password.length < 6) {
    return alert('Informe nome, e-mail e uma senha com pelo menos 6 caracteres.');
  }

  botao.disabled = true;
  botao.textContent = 'Criando conta...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { nome } }
    });
    if (error) throw error;

    let fotoUrl = '';
    if (fotoArquivo && data.session) {
      fotoUrl = await fazerUploadFotoComprimida(fotoArquivo, 'perfil');
    }

    if (data.user && data.session) {
      estadoApp.usuario = data.user;
      await garantirPerfilUsuario(data.user, nome, fotoUrl);
      await carregarComunidade();
      await carregarProgressoLeitura();
      atualizarInterfaceSessao();
      alert('Conta criada com sucesso! Bem-vindo(a) ao Clube do Livro.');
    } else {
      alert('Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login.');
    }
  } catch (err) {
    alert('Erro ao cadastrar: ' + err.message);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Criar Conta';
  }
}

async function sairDaConta() {
  await supabaseClient.auth.signOut();
  estadoApp.sessao = null;
  estadoApp.usuario = null;
  estadoApp.perfilUsuario = null;
  estadoApp.progressoLeitura = [];
  atualizarInterfaceSessao();
}

window.alternarPermissaoResenha = async (userId, novoValor) => {
  if (!estadoApp.ehAdminMaster) return alert('Apenas o Admin Master pode alterar permissões.');

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