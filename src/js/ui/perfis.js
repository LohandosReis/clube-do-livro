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

function renderizarFotosEmEdicao() {
  const box = document.getElementById('container-fotos-existentes');
  const hiddenInput = document.getElementById('edit-fotos-existentes');
  const editId = document.getElementById('edit-id').value;

  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(estadoApp.fotosEmEdicao);
  }

  if (!editId || !estadoApp.fotosEmEdicao.length) {
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
      ${estadoApp.fotosEmEdicao.map((url, index) => `
        <div class="foto-existente-item">
          <img src="${escaparHTML(url)}" alt="Foto ${index + 1}" loading="lazy">
          <button type="button" class="btn-remover-foto" data-action="remover-foto" data-id="${index}" title="Remover foto">×</button>
        </div>
      `).join('')}
    </div>
  `;
}

window.removerFotoExistente = async (index) => {
  const url = estadoApp.fotosEmEdicao[index];
  if (url && !confirm('Remover esta foto já publicada?')) return;
  estadoApp.fotosEmEdicao.splice(index, 1);
  renderizarFotosEmEdicao();

  if (!url) return;
  try {
    const marcador = '/fotos-clube/';
    const caminho = new URL(url).pathname.split(marcador)[1];
    if (caminho) {
      await supabaseClient.storage.from('fotos-clube').remove([decodeURIComponent(caminho)]);
    }
  } catch (error) {
    console.warn('Não foi possível remover o objeto antigo do Storage:', error);
  }
};

function renderizarUsuariosAdmin() {
  const container = document.getElementById('lista-usuarios-admin');
  if (!container || !estadoApp.ehAdminMaster) return;

  const listaPerfis = Object.values(estadoApp.perfis);
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
        <div class="acoes-usuario-admin">
          ${isMasterItem
            ? '<small>Administra conteúdo público</small>'
            : ''}
             <button
               type="button"
               class="btn-secundario"
               data-action="editar-perfil-membro"
               data-id="${escaparHTML(p.id)}"
             >Editar nome do perfil</button>
          ${!isMasterItem ? `<button
            type="button"
            class="${habilitado ? 'btn-primario' : 'btn-secundario'}"
            data-action="alternar-permissao"
            data-id="${escaparHTML(p.id)}"
            data-novo-valor="${!habilitado}"
          >
            ${habilitado ? '✅ Pode Publicar Resenhas (Clique p/ revogar)' : '🔒 Habilitar Resenhas Individuais'}
          </button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function criarCamposPerfilHTML(perfil) {
  const campos = [
    ['Apresentação', perfil.bio],
    ['Cidade e estado', perfil.cidade_estado],
    ['Gêneros favoritos', perfil.generos_favoritos],
    ['Livros favoritos', perfil.livros_favoritos],
    ['Autores favoritos', perfil.autores_favoritos]
  ];
  const linkSeguro = obterLinkPerfilSeguro(perfil.link_perfil);
  if (linkSeguro) {
    campos.push(['Link pessoal', `<a href="${escaparHTML(linkSeguro)}" target="_blank" rel="noopener noreferrer">Abrir link</a>`, true]);
  }
  if (perfil.campo_personalizado_nome && perfil.campo_personalizado_valor) {
    campos.push([perfil.campo_personalizado_nome, perfil.campo_personalizado_valor]);
  }

  return campos
    .filter(([, valor]) => Boolean(valor))
    .map(([rotulo, valor, ehHTML]) => `
      <div class="perfil-info-item">
        <strong>${escaparHTML(rotulo)}</strong>
        <span>${ehHTML ? valor : escaparHTML(valor)}</span>
      </div>
    `)
    .join('');
}

function obterLinkPerfilSeguro(valor) {
  if (!valor) return '';
  try {
    const url = new URL(valor);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function renderizarDiretorioPerfis(perfis, mensagem = '') {
  const container = document.getElementById('lista-perfis-membros');
  if (!container) return;
  if (mensagem) {
    container.innerHTML = `<p class="texto-suave">${escaparHTML(mensagem)}</p>`;
    return;
  }
  if (!perfis.length) {
    container.innerHTML = '<p class="texto-suave">Nenhum perfil optou por aparecer na busca ou não há resultados para esta pesquisa.</p>';
    return;
  }

  container.innerHTML = perfis.map(perfil => {
    const nome = perfil.nome || 'Membro do Clube';
    const foto = perfil.foto_url || avatarPadrao(nome);
    const url = new URL(window.location.href);
    url.searchParams.set('perfil', perfil.id);
    url.searchParams.set('secao', 'perfil-publico');
    url.hash = '';
    return `
      <article class="perfil-membro-card">
        <div class="perfil-membro-identidade">
          <img src="${escaparHTML(foto)}" alt="Foto de ${escaparHTML(nome)}" loading="lazy">
          <h4>${escaparHTML(nome)}</h4>
        </div>
        <div class="perfil-info-grid">${criarCamposPerfilHTML(perfil)}</div>
        <a class="btn-secundario btn-mini" href="${escaparHTML(url.href)}">Abrir perfil compartilhado</a>
      </article>
    `;
  }).join('');
}

function renderizarPerfilCompartilhado(perfil) {
  const container = document.getElementById('perfil-compartilhado');
  const nome = perfil.nome || 'Perfil de membro';
  const foto = perfil.foto_url || avatarPadrao(nome);
  const campos = criarCamposPerfilHTML(perfil);
  container.innerHTML = `
    <div class="perfil-membro-identidade perfil-compartilhado-identidade">
      <img src="${escaparHTML(foto)}" alt="Foto de ${escaparHTML(nome)}">
      <h2>${escaparHTML(nome)}</h2>
    </div>
    ${campos
      ? `<div class="perfil-info-grid">${campos}</div>`
      : '<p class="texto-suave">Este membro não compartilhou outras informações do perfil com você.</p>'}
    <button type="button" class="btn-secundario" data-action="voltar-pagina">← Voltar aos membros</button>
  `;
}

