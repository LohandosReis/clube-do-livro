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
let usuarioLogado = null;
let fotosEmEdicao = [];

const painelAdmin = document.getElementById('painel-admin');
const secaoLogin = document.getElementById('secao-login');
const btnAbrirLogin = document.getElementById('btn-abrir-login');
const btnSair = document.getElementById('btn-sair');

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

  if (selectFiltro) {
    const valorAtual = selectFiltro.value || 'todos';
    const opcoesHTML = GENEROS_DISPONIVEIS
      .map(genero => `<option value="${escaparHTML(genero)}">${escaparHTML(genero)}</option>`)
      .join('');
    selectFiltro.innerHTML = `<option value="todos">Todos os Gêneros</option>${opcoesHTML}`;
    selectFiltro.value = valorAtual;
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

// 1. Autenticação Admin e Controle de Abas
async function verificarSessao() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  atualizarInterfaceAdmin(session?.user || null);
}

function atualizarInterfaceAdmin(user) {
  usuarioLogado = user;
  if (user) {
    painelAdmin.classList.remove('oculto');
    secaoLogin.classList.add('oculto');
    btnAbrirLogin.classList.add('oculto');
    btnSair.classList.remove('oculto');
  } else {
    painelAdmin.classList.add('oculto');
    btnAbrirLogin.classList.remove('oculto');
    btnSair.classList.add('oculto');
  }
  renderizarTela();
}

btnAbrirLogin.onclick = () => secaoLogin.classList.remove('oculto');
document.getElementById('btn-fechar-login').onclick = () => secaoLogin.classList.add('oculto');

document.getElementById('btn-entrar').onclick = async () => {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-senha').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert('Erro ao entrar: ' + error.message);
  atualizarInterfaceAdmin(data.user);
};

btnSair.onclick = async () => {
  await supabaseClient.auth.signOut();
  atualizarInterfaceAdmin(null);
};

// Alternar Abas no Painel Admin
const tabBtnLivro = document.getElementById('tab-btn-livro');
const tabBtnGuia = document.getElementById('tab-btn-guia');
const abaLivro = document.getElementById('aba-livro');
const abaGuia = document.getElementById('aba-guia');

tabBtnLivro.onclick = () => {
  abaLivro.classList.remove('oculto');
  abaGuia.classList.add('oculto');
  tabBtnLivro.className = 'btn-primario';
  tabBtnGuia.className = 'btn-secundario';
};

tabBtnGuia.onclick = () => {
  abaGuia.classList.remove('oculto');
  abaLivro.classList.add('oculto');
  tabBtnGuia.className = 'btn-primario';
  tabBtnLivro.className = 'btn-secundario';
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

// 3. Buscar Livro em Múltiplas Fontes (OpenLibrary + Gutendex + Google Books)
async function buscarNaOpenLibrary(termo) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(termo)}&limit=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenLibrary HTTP ${res.status}`);
  const dados = await res.json();
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gutendex HTTP ${res.status}`);
  const dados = await res.json();
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

async function buscarNoGoogleBooks(termo) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termo)}&maxResults=6&printType=books`;
  const res = await fetch(url);
  if (res.status === 429) {
    return [];
  }
  if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);
  const dados = await res.json();
  const items = Array.isArray(dados.items) ? dados.items : [];

  return items.map(item => {
    const info = item.volumeInfo || {};
    const titulo = info.subtitle ? `${info.title}: ${info.subtitle}` : (info.title || 'Sem título');
    const capaRaw = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
    const capa = capaRaw
      ? capaRaw.replace(/^http:/, 'https:').replace('&edge=curl', '')
      : 'https://placehold.co/95x135?text=Sem+Capa';
    const autor = Array.isArray(info.authors) && info.authors.length ? info.authors.join(', ') : 'Autor desconhecido';
    const paginas = info.pageCount || '';
    const categorias = Array.isArray(info.categories) ? info.categories : [];
    const descricao = info.description || '';

    return { fonte: 'Google Books', titulo, autor, capa, paginas, categorias, descricao };
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

  const container = document.getElementById('resultados-api');
  container.innerHTML = '<small>Buscando na OpenLibrary, Gutenberg e Google Books...</small>';

  const consultas = await Promise.allSettled([
    buscarNaOpenLibrary(termo),
    buscarNoGutendex(termo),
    buscarNoGoogleBooks(termo)
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
      const opcoes = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
      const arquivoComprimido = await imageCompression(file, opcoes);
      const nomeArquivo = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error } = await supabaseClient.storage.from('fotos-clube').upload(nomeArquivo, arquivoComprimido);
      if (!error) {
        const { data: urlData } = supabaseClient.storage.from('fotos-clube').getPublicUrl(nomeArquivo);
        if (urlData?.publicUrl) urlsFotos.push(urlData.publicUrl);
      } else {
        console.error('Erro ao enviar foto para o Storage:', error.message);
      }
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
    fotos: urlsFotos
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

// Edição e Exclusão
window.prepararEdicao = (id) => {
  const item = todosEncontros.find(e => e.id === id);
  if (!item) return;

  tabBtnLivro.click();
  document.getElementById('titulo-form-admin').textContent = `✏️ Editando: ${item.titulo}`;
  document.getElementById('btn-cancelar-edicao').classList.remove('oculto');
  document.getElementById('btn-salvar-modulo').textContent = 'Salvar Alterações';

  document.getElementById('edit-id').value = item.id;
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
  document.getElementById('titulo-form-admin').textContent = '⚙️ Novo Módulo / Leitura';
  document.getElementById('btn-cancelar-edicao').classList.add('oculto');
  document.getElementById('btn-salvar-modulo').textContent = 'Publicar no Site';
}
document.getElementById('btn-cancelar-edicao').onclick = resetarFormulario;

// 5. Carregar Dados, Calcular Performance e Renderizar
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
  atualizarPlacar();
  renderizarTela();
}

function atualizarPlacar() {
  const concluidos = todosEncontros.filter(i => i.status === 'lido');
  const paginasConcluidas = concluidos.reduce((acc, i) => acc + (i.paginas_totais || 0), 0);
  const paginasEmAndamento = todosEncontros
    .filter(i => i.status === 'atual')
    .reduce((acc, i) => acc + (i.pagina_meta || 0), 0);

  const notas = concluidos.filter(i => i.nota !== null && i.nota !== undefined).map(i => Number(i.nota));
  const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '-';

  document.getElementById('stat-livros').textContent = concluidos.length;
  document.getElementById('stat-paginas').textContent = paginasConcluidas + paginasEmAndamento;
  document.getElementById('stat-media').textContent = media !== '-' ? `${media} / 5` : '-';
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

function renderizarTela() {
  const statusFiltro = document.getElementById('filtro-status').value;
  const generoFiltro = document.getElementById('filtro-genero').value;
  const textoFiltro = document.getElementById('filtro-texto').value.toLowerCase().trim();

  // Destaque Leitura Atual
  const atual = todosEncontros.find(item => item.status === 'atual');
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
    const bateStatus = statusFiltro === 'todos' || item.status === statusFiltro;
    const generosItem = parseGeneros(item.genero).map(g => g.toLowerCase());
    const bateGenero = generoFiltro === 'todos' || generosItem.includes(generoFiltro.toLowerCase());
    const bateTexto =
      (item.titulo || '').toLowerCase().includes(textoFiltro) ||
      (item.autor || '').toLowerCase().includes(textoFiltro) ||
      (item.genero || '').toLowerCase().includes(textoFiltro);
    return bateStatus && bateGenero && bateTexto;
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
    const fotosHTML = (item.fotos || [])
      .map(url => `<img src="${escaparHTML(url)}" alt="Foto do encontro" loading="lazy">`)
      .join('');

    const botoesAdmin = usuarioLogado
      ? `<div style="display:flex; gap:6px;">
           <button onclick="prepararEdicao(${item.id})" class="btn-secundario">✏️ Editar</button>
           <button onclick="excluirModulo(${item.id}, '${escaparHTML(item.titulo).replace(/'/g, "\\'")}')" class="btn-perigo">🗑️</button>
         </div>`
      : '';

    lista.innerHTML += `
      <article class="modulo-livro">
        <div class="modulo-cabecalho">
          <div class="modulo-info-topo">
            <img src="${escaparHTML(item.capa || 'https://placehold.co/65x95?text=Capa')}" alt="Capa de ${escaparHTML(item.titulo)}">
            <div>
              <span class="tag tag-status">${escaparHTML(labelsStatus[item.status] || item.status)}</span>
              ${renderizarTagsGenero(item.genero)}
              <span class="tag" style="background:#555;">${escaparHTML(formatarDataBR(item.data_encontro))}</span>
              ${item.nota !== null && item.nota !== undefined ? `<span class="tag tag-nota">⭐ ${escaparHTML(item.nota)}/5</span>` : ''}
              <h3 style="margin:6px 0 2px 0;">${escaparHTML(item.titulo)}</h3>
              <small>Por <strong>${escaparHTML(item.autor)}</strong> ${item.paginas_totais ? `• ${item.paginas_totais} páginas` : ''}</small>
            </div>
          </div>
          ${botoesAdmin}
        </div>
        <div class="modulo-corpo">
          ${item.horario_local ? `<p class="linha-meta-modulo">📍 <strong>Local/Horário:</strong> ${escaparHTML(item.horario_local)}</p>` : ''}
          ${item.bio_autor ? `<div class="bloco-bio-autor">✍️ <strong>Sobre o Escritor:</strong>\n${escaparHTML(formatarTextoMultilinha(item.bio_autor))}</div>` : ''}
          ${item.discussao
            ? `<details class="spoiler-box">
                 <summary>💬 Ver discussões e anotações do encontro (Contém Spoilers)</summary>
                 <div class="texto-spoiler">${escaparHTML(formatarTextoMultilinha(item.discussao))}</div>
               </details>`
            : ''}
          ${fotosHTML ? `<div class="galeria-fotos">${fotosHTML}</div>` : ''}
        </div>
      </article>
    `;
  });
}

document.getElementById('filtro-status').onchange = renderizarTela;
document.getElementById('filtro-genero').onchange = renderizarTela;
document.getElementById('filtro-texto').oninput = renderizarTela;

montarSeletoresDeGenero();
verificarSessao();
carregarGuia();
carregarEncontros();