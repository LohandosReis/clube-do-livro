const EMAIL_ADMIN_MASTER = 'lohanpereiradosreis@gmail.com';

const GENEROS_DISPONIVEIS = [
  'Ficção',
  'Não Ficção',
  'Literatura Brasileira',
  'Literatura Estrangeira',
  'Literatura Clássica',
  'Romance',
  'Romance Histórico',
  'Romance Contemporâneo',
  'Romance Policial / Investigação',
  'Suspense',
  'Thriller',
  'Terror / Horror',
  'Ficção Científica',
  'Fantasia',
  'Realismo Mágico',
  'Distopia',
  'Utopia',
  'Aventura',
  'Ação',
  'Mistério',
  'Drama',
  'Comédia / Sátira',
  'Poesia',
  'Contos',
  'Crônicas',
  'Ensaio',
  'Filosofia',
  'Política',
  'Sociologia',
  'História',
  'Biografia / Memórias',
  'Autobiografia',
  'Psicologia',
  'Ciência / Divulgação Científica',
  'Economia / Finanças',
  'Direito / Cidadania',
  'Educação / Pedagogia',
  'Arte / Arquitetura / Música',
  'Cinema / Cultura Pop',
  'Religião / Espiritualidade / Mitologia',
  'Ecologia / Natureza',
  'Gastronomia / Viagens',
  'Desenvolvimento Pessoal',
  'Infantil',
  'Infantojuvenil (YA)',
  'Graphic Novel / HQ / Mangá',
  'Teatro / Roteiro',
  'Outro'
];

let todosEncontros = [];
let todosPerfis = {};
let todasAvaliacoes = [];
let todosComentarios = [];
let todasIndicacoes = [];
let todosVotos = [];

let sessaoAtual = null;
let usuarioLogado = null;
let perfilUsuarioLogado = null;
let ehAdminMaster = false;
let fotosEmEdicao = [];

const painelAdmin = document.getElementById('painel-admin');
const secaoLogin = document.getElementById('secao-login');
const secaoContaUsuario = document.getElementById('secao-conta-usuario');
const btnAbrirLogin = document.getElementById('btn-abrir-login');
const btnAbrirConta = document.getElementById('btn-abrir-conta');
const btnSair = document.getElementById('btn-sair');
const badgeUsuario = document.getElementById('badge-usuario-logado');

function escaparHTML(texto = '') {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarTextoMultilinha(texto = '') {
  return String(texto)
    .replace(/\r\n/g, '\n')
    .replace(/\s*•\s*/g, '\n• ')
    .trim();
}

function formatarDataBR(dataISO) {
  if (!dataISO) return '';
  const partes = String(dataISO).split('-');
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataHoraBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function avatarPadrao(nome = 'L') {
  const inicial = encodeURIComponent((String(nome).trim()[0] || 'L').toUpperCase());
  return `https://placehold.co/44x44/24426b/ffffff?text=${inicial}`;
}

function parseGeneros(generoValor) {
  if (!generoValor) return [];
  if (Array.isArray(generoValor)) {
    return generoValor.map(g => String(g).trim()).filter(Boolean);
  }
  return String(generoValor)
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);
}

function montarSeletoresDeGenero() {
  const containerAdmin = document.getElementById('container-generos-admin');
  const selectFiltro = document.getElementById('filtro-genero');
  const selectIndicacao = document.getElementById('indicacao-genero');
  const selectResenha = document.getElementById('resenha-genero');

  if (containerAdmin) {
    containerAdmin.innerHTML = GENEROS_DISPONIVEIS.map((genero, idx) => {
      const id = `genero-opt-${idx}`;
      return `
        <label class="genero-chip" for="${id}" data-genero-label="${escaparHTML(genero.toLowerCase())}">
          <input type="checkbox" class="checkbox-genero" id="${id}" value="${escaparHTML(genero)}">
          <span>${escaparHTML(genero)}</span>
        </label>
      `;
    }).join('');
  }

  const opcoesGenerosHTML = GENEROS_DISPONIVEIS
    .map(genero => `<option value="${escaparHTML(genero)}">${escaparHTML(genero)}</option>`)
    .join('');

  if (selectFiltro) {
    const valorAtual = selectFiltro.value || 'todos';
    selectFiltro.innerHTML = `<option value="todos">Todos os Gêneros</option>${opcoesGenerosHTML}`;
    selectFiltro.value = valorAtual;
  }

  if (selectIndicacao) {
    selectIndicacao.innerHTML = `<option value="">Gênero (opcional)</option>${opcoesGenerosHTML}`;
  }

  if (selectResenha) {
    selectResenha.innerHTML = `<option value="">Selecione o Gênero...</option>${opcoesGenerosHTML}`;
  }
}

function filtrarGenerosAdmin() {
  const termo = (document.getElementById('busca-genero-admin')?.value || '').toLowerCase().trim();
  const chips = document.querySelectorAll('#container-generos-admin .genero-chip');
  chips.forEach(chip => {
    const nomeGenero = chip.getAttribute('data-genero-label') || '';
    const corresponde = !termo || nomeGenero.includes(termo);
    chip.classList.toggle('oculto', !corresponde);
  });
}

document.getElementById('busca-genero-admin').oninput = filtrarGenerosAdmin;

function obterGenerosSelecionados() {
  return Array.from(document.querySelectorAll('.checkbox-genero:checked'))
    .map(el => el.value.trim())
    .filter(Boolean);
}

function definirGenerosSelecionados(generoValor, mesclar = false) {
  const novos = new Set(parseGeneros(generoValor).map(g => g.toLowerCase()));
  document.querySelectorAll('.checkbox-genero').forEach(el => {
    const match = novos.has(el.value.toLowerCase());
    if (mesclar) {
      if (match) el.checked = true;
    } else {
      el.checked = match;
    }
  });
}

function mapearCategoriasApiParaGeneros(categorias = []) {
  const textoCats = categorias.join(' ').toLowerCase();
  const encontrados = [];
  const adicionar = (nome) => {
    if (GENEROS_DISPONIVEIS.includes(nome) && !encontrados.includes(nome)) {
      encontrados.push(nome);
    }
  };

  if (/philosoph|filosof/i.test(textoCats)) adicionar('Filosofia');
  if (/politic|polític/i.test(textoCats)) adicionar('Política');
  if (/histor|histór/i.test(textoCats)) adicionar('História');
  if (/psycholog|psicolog/i.test(textoCats)) adicionar('Psicologia');
  if (/scien|ciênci/i.test(textoCats)) adicionar('Ciência / Divulgação Científica');
  if (/fiction|ficç/i.test(textoCats)) adicionar('Ficção');
  if (/fantasy|fantasi/i.test(textoCats)) adicionar('Fantasia');
  if (/thriller|suspense/i.test(textoCats)) adicionar('Suspense');
  if (/horror|terror/i.test(textoCats)) adicionar('Terror / Horror');
  if (/romance|love/i.test(textoCats)) adicionar('Romance');
  if (/poetr|poesi/i.test(textoCats)) adicionar('Poesia');
  if (/short stor|cont/i.test(textoCats)) adicionar('Contos');
  if (/biograph|biograf|memór/i.test(textoCats)) adicionar('Biografia / Memórias');
  if (/sociolog/i.test(textoCats)) adicionar('Sociologia');
  if (/econom|business|finanç/i.test(textoCats)) adicionar('Economia / Finanças');
  if (/classic|clássic/i.test(textoCats)) adicionar('Literatura Clássica');

  return encontrados;
}

document.getElementById('btn-limpar-generos').onclick = () => {
  definirGenerosSelecionados([]);
};

// Upload comprimido de foto no Storage
async function fazerUploadFotoComprimida(file, prefixo = 'foto') {
  const opcoes = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
  const arquivoComprimido = await imageCompression(file, opcoes);
  const nomeArquivo = `${prefixo}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error } = await supabaseClient.storage.from('fotos-clube').upload(nomeArquivo, arquivoComprimido);
  if (error) throw error;

  const { data: urlData } = supabaseClient.storage.from('fotos-clube').getPublicUrl(nomeArquivo);
  return urlData?.publicUrl || '';
}

// Gerenciamento de fotos já enviadas durante a edição
function renderizarFotosEmEdicao() {
  const box = document.getElementById('container-fotos-existentes');
  const hiddenInput = document.getElementById('edit-fotos-existentes');
  const editId = document.getElementById('edit-id').value;

  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(fotosEmEdicao);
  }

  if (!editId || !fotosEmEdicao.length) {
    if (box) {
      box.innerHTML = '';
      box.classList.add('oculto');
    }
    return;
  }

  box.classList.remove('oculto');
  box.innerHTML = `
    <div class="fotos-existentes-titulo">Fotos já enviadas neste encontro (clique em × para remover):</div>
    <div class="fotos-existentes-grid">
      ${fotosEmEdicao.map((url, index) => `
        <div class="foto-existente-item">
          <img src="${escaparHTML(url)}" alt="Foto ${index + 1}" loading="lazy">
          <button type="button" class="btn-remover-foto" onclick="removerFotoExistente(${index})" title="Remover foto">×</button>
        </div>
      `).join('')}
    </div>
  `;
}

window.removerFotoExistente = (index) => {
  fotosEmEdicao.splice(index, 1);
  renderizarFotosEmEdicao();
};

// 1. Autenticação, Perfil de Usuário e Admin Master
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
  todosPerfis = mapa;
  perfilUsuarioLogado = usuarioLogado ? (mapa[usuarioLogado.id] || null) : null;
}

async function garantirPerfilUsuario(user, nomeInformado = '', fotoUrl = '') {
  if (!user) return null;
  const existente = todosPerfis[user.id];
  const nomeFinal = nomeInformado.trim() || existente?.nome || user.email?.split('@')[0] || 'Leitor(a)';
  const fotoFinal = fotoUrl || existente?.foto_url || '';
  const isMaster = (user.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase();

  const payload = {
    id: user.id,
    email: user.email || '',
    nome: nomeFinal,
    foto_url: fotoFinal,
    pode_publicar_resenha: isMaster ? true : (existente ? Boolean(existente.pode_publicar_resenha) : false)
  };

  const { data, error } = await supabaseClient
    .from('perfis_clube')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (!error && data) {
    todosPerfis[user.id] = data;
    perfilUsuarioLogado = data;
    return data;
  }
  return existente || payload;
}

async function verificarSessao() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  sessaoAtual = session;
  usuarioLogado = session?.user || null;

  await carregarPerfis();
  if (usuarioLogado && !perfilUsuarioLogado) {
    await garantirPerfilUsuario(usuarioLogado);
  }

  atualizarInterfaceSessao();
}

function atualizarInterfaceSessao() {
  ehAdminMaster = Boolean(
    usuarioLogado &&
    (usuarioLogado.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase()
  );
  const podeResenha = Boolean(ehAdminMaster || perfilUsuarioLogado?.pode_publicar_resenha);

  if (usuarioLogado) {
    secaoContaUsuario.classList.add('oculto');
    secaoLogin.classList.add('oculto');
    btnAbrirConta.classList.add('oculto');
    btnAbrirLogin.classList.add('oculto');
    btnSair.classList.remove('oculto');

    const nomeExibido = perfilUsuarioLogado?.nome || usuarioLogado.email;
    const fotoExibida = perfilUsuarioLogado?.foto_url || avatarPadrao(nomeExibido);
    badgeUsuario.classList.remove('oculto');
    badgeUsuario.innerHTML = `
      <img src="${escaparHTML(fotoExibida)}" alt="${escaparHTML(nomeExibido)}">
      <span>${escaparHTML(nomeExibido)}${ehAdminMaster ? ' • Admin Master' : ''}</span>
    `;
  } else {
    badgeUsuario.classList.add('oculto');
    btnAbrirConta.classList.remove('oculto');
    btnAbrirLogin.classList.remove('oculto');
    btnSair.classList.add('oculto');
  }

  // Somente o Admin Master vê o painel de administração completo
  painelAdmin.classList.toggle('oculto', !ehAdminMaster);

  const btnNovaResenha = document.getElementById('btn-toggle-resenha-individual');
  if (btnNovaResenha) {
    btnNovaResenha.classList.toggle('oculto', !(usuarioLogado && podeResenha));
  }
  if (!(usuarioLogado && podeResenha)) {
    document.getElementById('box-resenha-individual')?.classList.add('oculto');
  }

  if (ehAdminMaster) {
    renderizarUsuariosAdmin();
  }
  renderizarIndicacoes();
  renderizarTela();
}

// Alternar modal de conta de usuário (Login / Cadastro)
btnAbrirConta.onclick = () => {
  secaoLogin.classList.add('oculto');
  secaoContaUsuario.classList.remove('oculto');
};
document.getElementById('btn-fechar-conta').onclick = () => secaoContaUsuario.classList.add('oculto');

document.getElementById('tab-user-login').onclick = () => {
  document.getElementById('form-user-login-box').classList.remove('oculto');
  document.getElementById('form-user-cadastro-box').classList.add('oculto');
  document.getElementById('tab-user-login').className = 'btn-primario';
  document.getElementById('tab-user-cadastro').className = 'btn-secundario';
};

document.getElementById('tab-user-cadastro').onclick = () => {
  document.getElementById('form-user-cadastro-box').classList.remove('oculto');
  document.getElementById('form-user-login-box').classList.add('oculto');
  document.getElementById('tab-user-cadastro').className = 'btn-primario';
  document.getElementById('tab-user-login').className = 'btn-secundario';
};

document.getElementById('btn-user-entrar').onclick = async () => {
  const email = document.getElementById('user-login-email').value.trim();
  const password = document.getElementById('user-login-senha').value;
  if (!email || !password) return alert('Preencha e-mail e senha.');

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert('Erro ao entrar: ' + error.message);

  usuarioLogado = data.user;
  await carregarPerfis();
  await garantirPerfilUsuario(data.user);
  atualizarInterfaceSessao();
};

document.getElementById('btn-user-cadastrar').onclick = async () => {
  const nome = document.getElementById('user-cad-nome').value.trim();
  const email = document.getElementById('user-cad-email').value.trim();
  const password = document.getElementById('user-cad-senha').value;
  const fotoArquivo = document.getElementById('user-cad-foto').files[0];

  if (!nome || !email || password.length < 6) {
    return alert('Informe nome, e-mail e uma senha com pelo menos 6 caracteres.');
  }

  const btnCad = document.getElementById('btn-user-cadastrar');
  btnCad.disabled = true;
  btnCad.textContent = 'Criando conta...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    let fotoUrl = '';
    if (fotoArquivo) {
      fotoUrl = await fazerUploadFotoComprimida(fotoArquivo, 'perfil');
    }

    if (data.user && data.session) {
      usuarioLogado = data.user;
      await garantirPerfilUsuario(data.user, nome, fotoUrl);
      await carregarComunidade();
      atualizarInterfaceSessao();
      alert('Conta criada com sucesso! Bem-vindo(a) ao Clube do Livro.');
    } else {
      alert('Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login.');
    }
  } catch (err) {
    alert('Erro ao cadastrar: ' + err.message);
  } finally {
    btnCad.disabled = false;
    btnCad.textContent = 'Criar Conta';
  }
};

// Login Admin Master
btnAbrirLogin.onclick = () => {
  secaoContaUsuario.classList.add('oculto');
  secaoLogin.classList.remove('oculto');
};
document.getElementById('btn-fechar-login').onclick = () => secaoLogin.classList.add('oculto');

document.getElementById('btn-entrar').onclick = async () => {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-senha').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert('Erro ao entrar: ' + error.message);

  if ((data.user?.email || '').toLowerCase() !== EMAIL_ADMIN_MASTER.toLowerCase()) {
    await supabaseClient.auth.signOut();
    return alert('Esta conta não tem permissão de Admin Master.');
  }

  usuarioLogado = data.user;
  await carregarPerfis();
  await garantirPerfilUsuario(data.user);
  atualizarInterfaceSessao();
};

btnSair.onclick = async () => {
  await supabaseClient.auth.signOut();
  usuarioLogado = null;
  perfilUsuarioLogado = null;
  atualizarInterfaceSessao();
};

// Alternar Abas no Painel Admin Master
const tabBtnLivro = document.getElementById('tab-btn-livro');
const tabBtnUsuarios = document.getElementById('tab-btn-usuarios');
const tabBtnGuia = document.getElementById('tab-btn-guia');
const abaLivro = document.getElementById('aba-livro');
const abaUsuarios = document.getElementById('aba-usuarios');
const abaGuia = document.getElementById('aba-guia');

function ativarAbaAdmin(abaAtiva) {
  if (!ehAdminMaster) return;
  abaLivro.classList.toggle('oculto', abaAtiva !== 'livro');
  abaUsuarios.classList.toggle('oculto', abaAtiva !== 'usuarios');
  abaGuia.classList.toggle('oculto', abaAtiva !== 'guia');

  tabBtnLivro.className = abaAtiva === 'livro' ? 'btn-primario' : 'btn-secundario';
  tabBtnUsuarios.className = abaAtiva === 'usuarios' ? 'btn-primario' : 'btn-secundario';
  tabBtnGuia.className = abaAtiva === 'guia' ? 'btn-primario' : 'btn-secundario';

  if (abaAtiva === 'usuarios') {
    carregarPerfis().then(renderizarUsuariosAdmin);
  }
}

tabBtnLivro.onclick = () => ativarAbaAdmin('livro');
tabBtnUsuarios.onclick = () => ativarAbaAdmin('usuarios');
tabBtnGuia.onclick = () => ativarAbaAdmin('guia');

function renderizarUsuariosAdmin() {
  const container = document.getElementById('lista-usuarios-admin');
  if (!container || !ehAdminMaster) return;

  const listaPerfis = Object.values(todosPerfis);
  if (!listaPerfis.length) {
    container.innerHTML = '<small>Nenhum usuário cadastrado ainda.</small>';
    return;
  }

  container.innerHTML = listaPerfis.map(p => {
    const isMasterItem = (p.email || '').toLowerCase() === EMAIL_ADMIN_MASTER.toLowerCase();
    const habilitado = isMasterItem || Boolean(p.pode_publicar_resenha);
    return `
      <div class="usuario-item-admin">
        <div class="usuario-info-admin">
          <img src="${escaparHTML(p.foto_url || avatarPadrao(p.nome))}" alt="${escaparHTML(p.nome)}">
          <div>
            <strong>${escaparHTML(p.nome)}</strong> ${isMasterItem ? '<span class="tag tag-nota">Admin Master</span>' : ''}<br>
            <small>${escaparHTML(p.email || '')}</small>
          </div>
        </div>
        ${isMasterItem
          ? '<small>Permissão total</small>'
          : `<button
               type="button"
               class="${habilitado ? 'btn-primario' : 'btn-secundario'}"
               onclick="alternarPermissaoResenha('${escaparHTML(p.id)}', ${!habilitado})"
             >
               ${habilitado ? '✅ Pode Publicar Resenhas (Clique p/ revogar)' : '🔒 Habilitar Resenhas Individuais'}
             </button>`}
      </div>
    `;
  }).join('');
}

window.alternarPermissaoResenha = async (userId, novoValor) => {
  if (!ehAdminMaster) return alert('Apenas o Admin Master pode alterar permissões.');
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

// 2. Carregar e Salvar Guia de Discussão Editável
async function carregarGuia() {
  const { data, error } = await supabaseClient
    .from('guia_clube')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Erro ao carregar guia:', error);
    return;
  }

  if (data) {
    document.getElementById('guia-titulo-exibicao').textContent = data.titulo;
    document.getElementById('guia-conteudo-exibicao').textContent = data.conteudo;
    document.getElementById('guia-titulo-input').value = data.titulo;
    document.getElementById('guia-conteudo-input').value = data.conteudo;
  }
}

document.getElementById('form-guia').onsubmit = async (e) => {
  e.preventDefault();
  if (!ehAdminMaster) return alert('Apenas o Admin Master pode editar o guia.');

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

// 3. Buscar Livro em Fontes Abertas com Timeout Seguro
async function fetchComTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function buscarNaOpenLibrary(termo) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(termo)}&limit=8`;
  const dados = await fetchComTimeout(url, 6000);
  const docs = Array.isArray(dados.docs) ? dados.docs : [];

  return docs.map(doc => {
    const titulo = doc.title || 'Sem título';
    const autor = Array.isArray(doc.author_name) && doc.author_name.length
      ? doc.author_name.join(', ')
      : 'Autor desconhecido';
    const paginas = doc.number_of_pages_median || '';
    const capa = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : 'https://placehold.co/95x135?text=Sem+Capa';
    const categorias = Array.isArray(doc.subject) ? doc.subject.slice(0, 8) : [];
    const ano = doc.first_publish_year ? `Primeira publicação: ${doc.first_publish_year}.` : '';
    const descricao = ano ? `${ano} Obra catalogada na OpenLibrary.` : '';

    return { fonte: 'OpenLibrary', titulo, autor, capa, paginas, categorias, descricao };
  });
}

async function buscarNoGutendex(termo) {
  const url = `https://gutendex.com/books/?search=${encodeURIComponent(termo)}`;
  const dados = await fetchComTimeout(url, 6000);
  const books = Array.isArray(dados.results) ? dados.results.slice(0, 6) : [];

  return books.map(book => {
    const titulo = book.title || 'Sem título';
    const autores = Array.isArray(book.authors) && book.authors.length
      ? book.authors.map(a => a.name).join(', ')
      : 'Autor desconhecido';
    const capa = book.formats?.['image/jpeg'] || 'https://placehold.co/95x135?text=Sem+Capa';
    const categorias = [
      ...(Array.isArray(book.subjects) ? book.subjects.slice(0, 5) : []),
      ...(Array.isArray(book.bookshelves) ? book.bookshelves.slice(0, 3) : [])
    ];
    const descricao = categorias.length
      ? `Clássico / Domínio público (Gutendex). Temas: ${categorias.slice(0, 4).join(', ')}.`
      : 'Clássico / Domínio público catalogado no Project Gutenberg.';

    return { fonte: 'Gutenberg', titulo, autor: autores, capa, paginas: '', categorias, descricao };
  });
}

async function buscarNaOpenAlex(termo) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(termo)}&per-page=6`;
  const dados = await fetchComTimeout(url, 6000);
  const works = Array.isArray(dados.results) ? dados.results : [];

  return works
    .filter(w => w.title)
    .map(w => {
      const autores = Array.isArray(w.authorships) && w.authorships.length
        ? w.authorships.map(a => a.author?.display_name).filter(Boolean).join(', ')
        : 'Autor desconhecido';
      const ano = w.publication_year ? `Ano: ${w.publication_year}.` : '';
      const descricao = ano ? `${ano} Registro acadêmico/literário na OpenAlex.` : '';

      return {
        fonte: 'OpenAlex',
        titulo: w.title,
        autor: autores || 'Autor desconhecido',
        capa: 'https://placehold.co/95x135?text=Sem+Capa',
        paginas: '',
        categorias: [],
        descricao
      };
    });
}

function pontuarRelevancia(livro, termo) {
  const tokens = termo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  const alvo = `${livro.titulo} ${livro.autor}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let pontos = 0;
  tokens.forEach(token => {
    if (alvo.includes(token)) pontos += 2;
  });
  if (livro.capa && !livro.capa.includes('placehold.co')) pontos += 1;
  return pontos;
}

document.getElementById('btn-buscar-api').onclick = async () => {
  const termo = document.getElementById('input-busca-livro').value.trim();
  if (!termo) return;

  const btnBuscar = document.getElementById('btn-buscar-api');
  const container = document.getElementById('resultados-api');
  btnBuscar.disabled = true;
  container.innerHTML = '<small>Buscando livros...</small>';

  try {
    const consultas = await Promise.allSettled([
      buscarNaOpenLibrary(termo),
      buscarNoGutendex(termo),
      buscarNaOpenAlex(termo)
    ]);

    let combinados = [];
    consultas.forEach(resultado => {
      if (resultado.status === 'fulfilled' && Array.isArray(resultado.value)) {
        combinados = combinados.concat(resultado.value);
      }
    });

    combinados.sort((a, b) => pontuarRelevancia(b, termo) - pontuarRelevancia(a, termo));
    combinados = combinados.slice(0, 14);

    container.innerHTML = '';

    if (!combinados.length) {
      container.innerHTML = '<small>Nenhum livro encontrado nas fontes consultadas. Tente outro título ou nome do autor.</small>';
      return;
    }

    combinados.forEach(livro => {
      const div = document.createElement('div');
      div.className = 'item-api';
      div.innerHTML = `
        <img src="${escaparHTML(livro.capa)}" alt="${escaparHTML(livro.titulo)}" loading="lazy">
        <p>
          <strong>${escaparHTML(livro.titulo)}</strong><br>
          <small>${escaparHTML(livro.autor)}${livro.paginas ? ` • ${livro.paginas} págs.` : ''}</small><br>
          <small style="opacity:0.75;">Fonte: ${escaparHTML(livro.fonte)}</small>
        </p>
      `;

      div.onclick = () => {
        document.getElementById('livro-titulo').value = livro.titulo;
        document.getElementById('livro-autor').value = livro.autor;
        document.getElementById('livro-capa').value = livro.capa;
        if (livro.paginas) {
          document.getElementById('livro-paginas-totais').value = livro.paginas;
        }

        const generosSugeridos = mapearCategoriasApiParaGeneros(livro.categorias);
        if (generosSugeridos.length) {
          definirGenerosSelecionados(generosSugeridos, true);
        }

        const campoBio = document.getElementById('autor-bio');
        if (livro.descricao && !campoBio.value.trim()) {
          const resumoLimpo = livro.descricao.replace(/\s+/g, ' ').trim();
          campoBio.value = `Autor(a): ${livro.autor}\n• Contexto / Sinopse inicial: ${resumoLimpo}`;
        }

        container.innerHTML = '<small>✅ Dados preenchidos automaticamente! Revise e ajuste o que quiser antes de publicar.</small>';
      };

      container.appendChild(div);
    });
  } catch (err) {
    console.error('Erro na busca de livros:', err);
    container.innerHTML = '<small>Não foi possível concluir a busca agora. Tente novamente em instantes.</small>';
  } finally {
    btnBuscar.disabled = false;
  }
};

document.getElementById('input-busca-livro').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('btn-buscar-api').click();
  }
});

// 4. Salvar ou Atualizar Módulo + Compressão de Fotos
document.getElementById('form-encontro').onsubmit = async (e) => {
  e.preventDefault();
  if (!ehAdminMaster) {
    return alert('Apenas o Admin Master pode publicar ou editar módulos principais.');
  }

  const generosSelecionados = obterGenerosSelecionados();
  if (!generosSelecionados.length) {
    return alert('Selecione pelo menos um gênero para o livro.');
  }

  const btnSalvar = document.getElementById('btn-salvar-modulo');
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Processando e salvando...';

  const editId = document.getElementById('edit-id').value;
  let urlsFotos = editId ? [...fotosEmEdicao] : [];
  const arquivos = document.getElementById('encontro-fotos').files;

  for (const file of arquivos) {
    try {
      const url = await fazerUploadFotoComprimida(file, 'encontro');
      if (url) urlsFotos.push(url);
    } catch (err) {
      console.error('Erro ao comprimir/enviar foto:', err);
    }
  }

  const notaRaw = document.getElementById('livro-nota').value;
  const dadosModulo = {
    titulo: document.getElementById('livro-titulo').value.trim(),
    autor: document.getElementById('livro-autor').value.trim(),
    capa: document.getElementById('livro-capa').value.trim(),
    genero: generosSelecionados.join(', '),
    status: document.getElementById('livro-status').value,
    data_encontro: document.getElementById('encontro-data').value,
    horario_local: document.getElementById('encontro-local').value.trim(),
    paginas_totais: parseInt(document.getElementById('livro-paginas-totais').value, 10) || 0,
    pagina_meta: parseInt(document.getElementById('livro-pagina-meta').value, 10) || 0,
    meta_texto: document.getElementById('livro-meta-texto').value.trim(),
    nota: notaRaw !== '' ? parseFloat(notaRaw) : null,
    bio_autor: document.getElementById('autor-bio').value.trim(),
    discussao: document.getElementById('encontro-discussao').value.trim(),
    fotos: urlsFotos,
    tipo_postagem: editId ? (document.getElementById('edit-tipo-postagem').value || 'clube') : 'clube',
    autor_postagem_id: editId
      ? (document.getElementById('edit-autor-postagem-id').value || usuarioLogado?.id || null)
      : (usuarioLogado?.id || null),
    autor_postagem_nome: editId
      ? (document.getElementById('edit-autor-postagem-nome').value || perfilUsuarioLogado?.nome || '')
      : (perfilUsuarioLogado?.nome || '')
  };

  let erroOperacao = null;
  if (editId) {
    const { error } = await supabaseClient.from('encontros').update(dadosModulo).eq('id', editId);
    erroOperacao = error;
  } else {
    const { error } = await supabaseClient.from('encontros').insert([dadosModulo]);
    erroOperacao = error;
  }

  btnSalvar.disabled = false;
  btnSalvar.textContent = 'Publicar no Site';

  if (erroOperacao) return alert('Erro ao salvar: ' + erroOperacao.message);

  resetarFormulario();
  carregarEncontros();
};

// Resenhas / Leituras Individuais (para usuários habilitados)
document.getElementById('btn-toggle-resenha-individual').onclick = () => {
  const podeResenha = Boolean(ehAdminMaster || perfilUsuarioLogado?.pode_publicar_resenha);
  if (!usuarioLogado || !podeResenha) {
    return alert('Sua conta ainda não está habilitada pelo Admin Master para publicar resenhas individuais.');
  }
  document.getElementById('box-resenha-individual').classList.toggle('oculto');
};

document.getElementById('form-resenha-individual').onsubmit = async (e) => {
  e.preventDefault();
  const podeResenha = Boolean(ehAdminMaster || perfilUsuarioLogado?.pode_publicar_resenha);
  if (!usuarioLogado || !podeResenha) {
    return alert('Sua conta ainda não está habilitada pelo Admin Master para publicar resenhas individuais.');
  }

  const btn = document.getElementById('btn-publicar-resenha');
  btn.disabled = true;
  btn.textContent = 'Publicando...';

  const notaVal = document.getElementById('resenha-nota').value;
  const hojeISO = new Date().toISOString().slice(0, 10);

  const novaResenha = {
    titulo: document.getElementById('resenha-titulo').value.trim(),
    autor: document.getElementById('resenha-autor').value.trim(),
    capa: '',
    genero: document.getElementById('resenha-genero').value || 'Outro',
    status: 'lido',
    data_encontro: hojeISO,
    horario_local: `Leitura individual de ${perfilUsuarioLogado.nome || usuarioLogado.email}`,
    paginas_totais: parseInt(document.getElementById('resenha-paginas').value, 10) || 0,
    pagina_meta: 0,
    meta_texto: '',
    nota: notaVal !== '' ? parseFloat(notaVal) : null,
    bio_autor: '',
    discussao: document.getElementById('resenha-texto').value.trim(),
    fotos: [],
    tipo_postagem: 'individual',
    autor_postagem_id: usuarioLogado.id,
    autor_postagem_nome: perfilUsuarioLogado.nome || usuarioLogado.email
  };

  const { error } = await supabaseClient.from('encontros').insert([novaResenha]);

  btn.disabled = false;
  btn.textContent = 'Publicar Resenha no Site';

  if (error) return alert('Erro ao publicar resenha: ' + error.message);

  document.getElementById('form-resenha-individual').reset();
  document.getElementById('box-resenha-individual').classList.add('oculto');
  carregarEncontros();
};

// Edição e Exclusão
window.prepararEdicao = (id) => {
  const item = todosEncontros.find(e => e.id === id);
  if (!item || !usuarioLogado) return;

  const ehIndividual = (item.tipo_postagem || 'clube') === 'individual';
  const podeEditar = ehAdminMaster || (ehIndividual && item.autor_postagem_id === usuarioLogado.id);
  if (!podeEditar) return alert('Você não tem permissão para editar este item.');

  if (!ehAdminMaster) {
    return alert('A edição completa de campos fica disponível para o Admin Master.');
  }

  ativarAbaAdmin('livro');
  document.getElementById('titulo-form-admin').textContent = `✏️ Editando: ${item.titulo}`;
  document.getElementById('btn-cancelar-edicao').classList.remove('oculto');
  document.getElementById('btn-salvar-modulo').textContent = 'Salvar Alterações';

  document.getElementById('edit-id').value = item.id;
  document.getElementById('edit-tipo-postagem').value = item.tipo_postagem || 'clube';
  document.getElementById('edit-autor-postagem-id').value = item.autor_postagem_id || '';
  document.getElementById('edit-autor-postagem-nome').value = item.autor_postagem_nome || '';

  fotosEmEdicao = Array.isArray(item.fotos) ? [...item.fotos] : [];
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

  painelAdmin.scrollIntoView({ behavior: 'smooth' });
};

window.excluirModulo = async (id, titulo) => {
  const item = todosEncontros.find(e => e.id === id);
  if (!item || !usuarioLogado) return;

  const ehIndividual = (item.tipo_postagem || 'clube') === 'individual';
  const podeExcluir = ehAdminMaster || (ehIndividual && item.autor_postagem_id === usuarioLogado.id);
  if (!podeExcluir) return alert('Você não tem permissão para excluir este item.');

  if (!confirm(`Tem certeza que deseja excluir o registro de "${titulo}"?`)) return;
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
  fotosEmEdicao = [];
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
document.getElementById('btn-cancelar-edicao').onclick = resetarFormulario;

// 5. Notas, Comentários, Indicações e Votos
function calcularMediaLivro(encontroId, notaBase = null) {
  const baseAvaliacoes = typeof todasAvaliacoes !== 'undefined' && Array.isArray(todasAvaliacoes)
    ? todasAvaliacoes
    : [];

  const notasUsuarios = baseAvaliacoes
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
  if (!usuarioLogado) {
    alert('Faça login ou cadastre-se para dar sua nota ao livro.');
    secaoContaUsuario.classList.remove('oculto');
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
        usuario_id: usuarioLogado.id,
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
  if (!usuarioLogado) {
    alert('Faça login ou cadastre-se para comentar.');
    secaoContaUsuario.classList.remove('oculto');
    return;
  }

  const textarea = document.getElementById(`comentario-input-${encontroId}`);
  const texto = (textarea?.value || '').trim();
  if (!texto) return alert('Escreva um comentário antes de enviar.');

  const { error } = await supabaseClient
    .from('comentarios_livro')
    .insert([{
      encontro_id: encontroId,
      usuario_id: usuarioLogado.id,
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

// Indicações e Votação
document.getElementById('form-indicacao').onsubmit = async (e) => {
  e.preventDefault();
  if (!usuarioLogado) {
    alert('Faça login ou cadastre-se para indicar um livro.');
    secaoContaUsuario.classList.remove('oculto');
    return;
  }

  const titulo = document.getElementById('indicacao-titulo').value.trim();
  const autor = document.getElementById('indicacao-autor').value.trim();
  const genero = document.getElementById('indicacao-genero').value;
  const motivo = document.getElementById('indicacao-motivo').value.trim();

  const btn = document.getElementById('btn-enviar-indicacao');
  btn.disabled = true;

  const { error } = await supabaseClient
    .from('indicacoes_livro')
    .insert([{
      usuario_id: usuarioLogado.id,
      titulo,
      autor,
      genero,
      motivo
    }]);

  btn.disabled = false;
  if (error) return alert('Erro ao indicar livro: ' + error.message);

  document.getElementById('form-indicacao').reset();
  await carregarComunidade();
  renderizarIndicacoes();
};

window.alternarVotoIndicacao = async (indicacaoId) => {
  if (!usuarioLogado) {
    alert('Faça login ou cadastre-se para votar nas indicações.');
    secaoContaUsuario.classList.remove('oculto');
    return;
  }

  const jaVotou = todosVotos.some(
    v => v.indicacao_id === indicacaoId && v.usuario_id === usuarioLogado.id
  );

  if (jaVotou) {
    const { error } = await supabaseClient
      .from('votos_indicacao')
      .delete()
      .eq('indicacao_id', indicacaoId)
      .eq('usuario_id', usuarioLogado.id);
    if (error) return alert('Erro ao remover voto: ' + error.message);
  } else {
    const { error } = await supabaseClient
      .from('votos_indicacao')
      .insert([{ indicacao_id: indicacaoId, usuario_id: usuarioLogado.id }]);
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

  if (!todasIndicacoes.length) {
    container.innerHTML = '<small>Nenhuma indicação cadastrada ainda. Seja o primeiro a sugerir uma leitura!</small>';
    return;
  }

  const ordenadas = [...todasIndicacoes].sort((a, b) => {
    const votosA = todosVotos.filter(v => v.indicacao_id === a.id).length;
    const votosB = todosVotos.filter(v => v.indicacao_id === b.id).length;
    return votosB - votosA;
  });

  container.innerHTML = ordenadas.map(ind => {
    const votosDaIndicacao = todosVotos.filter(v => v.indicacao_id === ind.id);
    const totalVotos = votosDaIndicacao.length;
    const meuVoto = usuarioLogado && votosDaIndicacao.some(v => v.usuario_id === usuarioLogado.id);
    const perfilAutor = todosPerfis[ind.usuario_id];
    const nomeAutorInd = perfilAutor?.nome || 'Membro do Clube';
    const podeApagar = usuarioLogado && (ehAdminMaster || ind.usuario_id === usuarioLogado.id);

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
            onclick="alternarVotoIndicacao(${ind.id})"
          >
            ${meuVoto ? '🗳️ Votado' : '🗳️ Votar'} (${totalVotos})
          </button>
          ${podeApagar ? `<button type="button" class="btn-perigo btn-mini" onclick="apagarIndicacao(${ind.id})">🗑️</button>` : ''}
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

  if (resAv.status === 'fulfilled' && !resAv.value.error) todasAvaliacoes = resAv.value.data || [];
  if (resCom.status === 'fulfilled' && !resCom.value.error) todosComentarios = resCom.value.data || [];
  if (resInd.status === 'fulfilled' && !resInd.value.error) todasIndicacoes = resInd.value.data || [];
  if (resVot.status === 'fulfilled' && !resVot.value.error) todosVotos = resVot.value.data || [];

  renderizarIndicacoes();
}

// 6. Carregar Dados, Calcular Performance e Renderizar
async function carregarEncontros() {
  const { data, error } = await supabaseClient
    .from('encontros')
    .select('*')
    .order('data_encontro', { ascending: false });

  if (error) {
    console.error('Erro ao carregar encontros:', error);
    return;
  }

  todosEncontros = data || [];
  await carregarPerfis();
  await carregarComunidade();
  atualizarPlacar();
  renderizarTela();
}

function atualizarPlacar() {
  const concluidos = todosEncontros.filter(i => i.status === 'lido');
  const paginasConcluidas = concluidos.reduce((acc, i) => acc + (i.paginas_totais || 0), 0);
  const paginasEmAndamento = todosEncontros
    .filter(i => i.status === 'atual')
    .reduce((acc, i) => acc + (i.pagina_meta || 0), 0);

  const mediasCalculadas = concluidos
    .map(i => calcularMediaLivro(i.id, i.nota).media)
    .filter(m => m !== null)
    .map(Number);

  const mediaGeral = mediasCalculadas.length
    ? (mediasCalculadas.reduce((a, b) => a + b, 0) / mediasCalculadas.length).toFixed(1)
    : '-';

  document.getElementById('stat-livros').textContent = concluidos.length;
  document.getElementById('stat-paginas').textContent = paginasConcluidas + paginasEmAndamento;
  document.getElementById('stat-media').textContent = mediaGeral !== '-' ? `${mediaGeral} / 5` : '-';
}

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
  const comentariosDoLivro = todosComentarios.filter(c => c.encontro_id === encontroId);

  const listaHTML = comentariosDoLivro.length
    ? comentariosDoLivro.map(c => {
        const perfil = todosPerfis[c.usuario_id] || {};
        const nome = perfil.nome || 'Membro do Clube';
        const foto = perfil.foto_url || avatarPadrao(nome);
        const podeApagar = usuarioLogado && (ehAdminMaster || c.usuario_id === usuarioLogado.id);
        return `
          <div class="comentario-item">
            <img class="comentario-avatar" src="${escaparHTML(foto)}" alt="${escaparHTML(nome)}" loading="lazy">
            <div class="comentario-corpo">
              <div class="comentario-topo">
                <strong>${escaparHTML(nome)}</strong>
                <small>${escaparHTML(formatarDataHoraBR(c.criado_em))}</small>
                ${podeApagar ? `<button type="button" class="btn-perigo btn-mini" onclick="apagarComentario(${c.id})">×</button>` : ''}
              </div>
              <p class="comentario-texto">${escaparHTML(c.texto)}</p>
            </div>
          </div>
        `;
      }).join('')
    : '<small>Nenhum comentário ainda. Deixe sua impressão sobre o livro!</small>';

  return `
    <div class="comentarios-box">
      <h4 class="comentarios-titulo">💬 Comentários dos Membros (${comentariosDoLivro.length})</h4>
      <div class="comentarios-lista">${listaHTML}</div>
      <div class="comentario-form">
        <textarea id="comentario-input-${encontroId}" rows="2" placeholder="${usuarioLogado ? 'Escreva um comentário...' : 'Entre na sua conta para comentar...'}"></textarea>
        <button type="button" class="btn-secundario btn-mini" onclick="enviarComentarioLivro(${encontroId})">Comentar</button>
      </div>
    </div>
  `;
}

function renderizarTela() {
  const tipoFiltro = document.getElementById('filtro-tipo').value;
  const statusFiltro = document.getElementById('filtro-status').value;
  const generoFiltro = document.getElementById('filtro-genero').value;
  const textoFiltro = document.getElementById('filtro-texto').value.toLowerCase().trim();

  // Destaque Leitura Atual
  const atual = todosEncontros.find(item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube');
  const divAtual = document.getElementById('conteudo-atual');

  if (atual) {
    const pct = atual.paginas_totais > 0
      ? Math.min(100, Math.round((atual.pagina_meta / atual.paginas_totais) * 100))
      : 0;

    divAtual.innerHTML = `
      <div class="modulo-info-topo">
        <img src="${escaparHTML(atual.capa || 'https://placehold.co/65x95?text=Capa')}" alt="Capa de ${escaparHTML(atual.titulo)}">
        <div style="flex:1;">
          <div>${renderizarTagsGenero(atual.genero)}</div>
          <h3 style="margin:6px 0 4px 0;">${escaparHTML(atual.titulo)} — <small>${escaparHTML(atual.autor)}</small></h3>
          <p style="margin:4px 0;">📅 <strong>Data do Encontro:</strong> ${escaparHTML(formatarDataBR(atual.data_encontro))} ${atual.horario_local ? `(${escaparHTML(atual.horario_local)})` : ''}</p>
          ${atual.meta_texto ? `<p style="margin:4px 0;"><strong>🎯 Meta Atual:</strong> ${escaparHTML(atual.meta_texto)}</p>` : ''}
          ${atual.paginas_totais > 0
            ? `<small>Progresso da leitura física: Pág. ${atual.pagina_meta} de ${atual.paginas_totais} (${pct}%)</small>
               <div class="progresso-container"><div class="progresso-barra" style="width:${pct}%"></div></div>`
            : ''}
          <a class="btn-agenda" href="${gerarLinkGoogleAgenda(atual)}" target="_blank" rel="noopener noreferrer">📅 Salvar no Google Agenda</a>
        </div>
      </div>
    `;
  } else {
    divAtual.innerHTML = 'Nenhuma leitura ativa definida no momento.';
  }

  // Lista de Módulos
  const lista = document.getElementById('lista-encontros');
  lista.innerHTML = '';

  const filtrados = todosEncontros.filter(item => {
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
    const ehIndividual = (item.tipo_postagem || 'clube') === 'individual';
    const fotosHTML = (item.fotos || [])
      .map(url => `<img src="${escaparHTML(url)}" alt="Foto do encontro" loading="lazy">`)
      .join('');

    const podeGerenciarModulo = usuarioLogado && (
      ehAdminMaster || (ehIndividual && item.autor_postagem_id === usuarioLogado.id)
    );

    const botoesAdmin = podeGerenciarModulo
      ? `<div style="display:flex; gap:6px;">
           ${ehAdminMaster ? `<button onclick="prepararEdicao(${item.id})" class="btn-secundario">✏️ Editar</button>` : ''}
           <button onclick="excluirModulo(${item.id}, '${escaparHTML(item.titulo).replace(/'/g, "\\'")}')" class="btn-perigo">🗑️</button>
         </div>`
      : '';

    const infoMedia = calcularMediaLivro(item.id, item.nota);
    const minhaAvaliacao = usuarioLogado
      ? todosAvaliacoes.find(a => a.encontro_id === item.id && a.usuario_id === usuarioLogado.id)
      : null;

    const badgeIndividual = ehIndividual
      ? `<span class="tag tag-individual">✍️ Resenha Individual${item.autor_postagem_nome ? ` • ${escaparHTML(item.autor_postagem_nome)}` : ''}</span>`
      : '';

    lista.innerHTML += `
      <article class="modulo-livro">
        <div class="modulo-cabecalho">
          <div class="modulo-info-topo">
            <img src="${escaparHTML(item.capa || 'https://placehold.co/65x95?text=Capa')}" alt="Capa de ${escaparHTML(item.titulo)}">
            <div>
              ${badgeIndividual}
              <span class="tag tag-status">${escaparHTML(labelsStatus[item.status] || item.status)}</span>
              ${renderizarTagsGenero(item.genero)}
              <span class="tag" style="background:#555;">${escaparHTML(formatarDataBR(item.data_encontro))}</span>
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
          ${item.horario_local ? `<p class="linha-meta-modulo">📍 <strong>Local/Horário:</strong> ${escaparHTML(item.horario_local)}</p>` : ''}
          ${item.bio_autor ? `<div class="bloco-bio-autor">✍️ <strong>Sobre o Escritor / Contexto:</strong>\n${escaparHTML(formatarTextoMultilinha(item.bio_autor))}</div>` : ''}
          ${item.discussao
            ? `<details class="spoiler-box">
                 <summary>💬 Ver discussões, resenha e anotações (Contém Spoilers)</summary>
                 <div class="texto-spoiler">${escaparHTML(formatarTextoMultilinha(item.discussao))}</div>
               </details>`
            : ''}
          ${fotosHTML ? `<div class="galeria-fotos">${fotosHTML}</div>` : ''}

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
              <button type="button" class="btn-primario btn-mini" onclick="enviarAvaliacaoLivro(${item.id})">
                ${minhaAvaliacao ? 'Atualizar Nota' : 'Avaliar Livro'}
              </button>
            </div>
          </div>

          ${renderizarBlocoComentarios(item.id)}
        </div>
      </article>
    `;
  });
}

document.getElementById('filtro-tipo').onchange = renderizarTela;
document.getElementById('filtro-status').onchange = renderizarTela;
document.getElementById('filtro-genero').onchange = renderizarTela;
document.getElementById('filtro-texto').oninput = renderizarTela;

montarSeletoresDeGenero();
carregarGuia();
carregarEncontros().then(verificarSessao);