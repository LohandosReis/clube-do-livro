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
        <label class="genero-chip" for="${id}">
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

function obterGenerosSelecionados() {
  return Array.from(document.querySelectorAll('.checkbox-genero:checked'))
    .map(el => el.value.trim())
    .filter(Boolean);
}

function definirGenerosSelecionados(generoValor) {
  const selecionados = new Set(parseGeneros(generoValor).map(g => g.toLowerCase()));
  document.querySelectorAll('.checkbox-genero').forEach(el => {
    el.checked = selecionados.has(el.value.toLowerCase());
  });
}

document.getElementById('btn-limpar-generos').onclick = () => {
  definirGenerosSelecionados([]);
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

// 3. Buscar Livro no Google Books
document.getElementById('btn-buscar-api').onclick = async () => {
  const termo = document.getElementById('input-busca-livro').value.trim();
  if (!termo) return;

  const container = document.getElementById('resultados-api');
  container.innerHTML = '<small>Buscando livros...</small>';

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termo)}&maxResults=5`);
    const dados = await res.json();
    container.innerHTML = '';

    if (!dados.items || !dados.items.length) {
      container.innerHTML = '<small>Nenhum livro encontrado.</small>';
      return;
    }

    dados.items.forEach(item => {
      const info = item.volumeInfo || {};
      const capa = info.imageLinks?.thumbnail?.replace('http:', 'https:') || 'https://placehold.co/95x135?text=Sem+Capa';
      const autor = info.authors ? info.authors.join(', ') : 'Autor desconhecido';
      const paginas = info.pageCount || '';

      const div = document.createElement('div');
      div.className = 'item-api';
      div.innerHTML = `<img src="${escaparHTML(capa)}" alt="${escaparHTML(info.title || 'Capa')}"><p><strong>${escaparHTML(info.title || 'Sem título')}</strong><br><small>${escaparHTML(autor)}</small></p>`;
      div.onclick = () => {
        document.getElementById('livro-titulo').value = info.title || '';
        document.getElementById('livro-autor').value = autor;
        document.getElementById('livro-capa').value = capa;
        if (paginas) document.getElementById('livro-paginas-totais').value = paginas;
        container.innerHTML = '<small>✅ Dados do livro preenchidos!</small>';
      };
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Erro na busca Google Books:', err);
    container.innerHTML = '<small>Erro ao consultar a API do Google Books.</small>';
  }
};

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
  let urlsFotos = editId ? JSON.parse(document.getElementById('edit-fotos-existentes').value || '[]') : [];
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
  document.getElementById('edit-fotos-existentes').value = JSON.stringify(item.fotos || []);
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