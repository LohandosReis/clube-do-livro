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

function preencherFormularioComLivro(livro, containerResultados) {
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

  containerResultados.innerHTML = '<small>✅ Dados preenchidos automaticamente! Revise e ajuste o que quiser antes de publicar.</small>';
}

async function executarBuscaLivros() {
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
      div.onclick = () => preencherFormularioComLivro(livro, container);
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Erro na busca de livros:', err);
    container.innerHTML = '<small>Não foi possível concluir a busca agora. Tente novamente em instantes.</small>';
  } finally {
    btnBuscar.disabled = false;
  }
}