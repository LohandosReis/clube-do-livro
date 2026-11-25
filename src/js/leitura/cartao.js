function obterDadosCartaoProgresso() {
  const atual = estadoApp.encontros.find(
    item => item.status === 'atual' && (item.tipo_postagem || 'clube') === 'clube'
  );
  if (!atual || !estadoApp.usuario) return null;

  const registrosAtuais = estadoApp.progressoLeitura.filter(item => item.encontro_id === atual.id);
  const paginasLidas = registrosAtuais.reduce(
    (total, item) => total + (Number(item.paginas_lidas) || 0),
    0
  );
  const edicaoLeitura = estadoApp.edicaoLeitura;
  const totalLivro = Number(edicaoLeitura?.paginas_totais) || 0;
  const percentual = totalLivro
    ? Math.min(100, Math.round((paginasLidas / totalLivro) * 100))
    : null;
  const incluirNome = document.getElementById('progresso-incluir-nome').checked;
  const incluirFoto = document.getElementById('progresso-incluir-foto').checked;

  return {
    atual,
    paginasLidas,
    totalLivro,
    edicao: edicaoLeitura?.edicao || '',
    percentual,
    nome: incluirNome ? (estadoApp.perfilUsuario?.nome || '') : '',
    fotoUrl: incluirFoto ? (estadoApp.perfilUsuario?.foto_url || '') : ''
  };
}

function carregarCapaParaCartao(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => resolve(null);
    imagem.src = url;
  });
}

function desenharTextoQuebrado(ctx, texto, x, y, largura, alturaLinha, limiteLinhas = 3) {
  const palavras = String(texto || '').split(/\s+/);
  let linha = '';
  let linhas = 0;

  palavras.forEach(palavra => {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > largura && linha) {
      ctx.fillText(linha, x, y + linhas * alturaLinha);
      linhas++;
      linha = palavra;
    } else {
      linha = tentativa;
    }
  });

  if (linha && linhas < limiteLinhas) {
    ctx.fillText(linha, x, y + linhas * alturaLinha);
  }
}

window.gerarCartaoProgresso = async () => {
  limparCartaoProgresso();
  const dados = obterDadosCartaoProgresso();
  if (!dados) return alert('Entre na sua conta e confira se há uma leitura atual.');
  if (!dados.paginasLidas) return alert('Registre páginas lidas antes de gerar o cartão.');

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return alert('Este navegador não permite gerar a imagem do cartão.');

  const fundo = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  fundo.addColorStop(0, '#f7f3eb');
  fundo.addColorStop(1, '#e8eef5');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#24426b';
  ctx.fillRect(0, 0, canvas.width, 22);
  ctx.fillStyle = '#24426b';
  ctx.font = '700 32px Arial, sans-serif';
  ctx.fillText('CLUBE DO LIVRO', 72, 100);
  ctx.fillStyle = '#5d6672';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('ACOMPANHAMENTO DE LEITURA', 72, 140);

  const [capa, fotoPerfil] = await Promise.all([
    carregarCapaParaCartao(dados.atual.capa),
    carregarCapaParaCartao(dados.fotoUrl)
  ]);
  if (capa) {
    const escala = Math.min(380 / capa.width, 570 / capa.height);
    const largura = capa.width * escala;
    const altura = capa.height * escala;
    ctx.drawImage(capa, 72, 205, largura, altura);
  } else {
    ctx.fillStyle = '#dfe7ef';
    ctx.fillRect(72, 205, 380, 570);
    ctx.fillStyle = '#24426b';
    ctx.font = '700 28px Arial, sans-serif';
    desenharTextoQuebrado(ctx, dados.atual.titulo, 100, 430, 325, 42, 5);
  }

  const xTexto = 500;
  ctx.fillStyle = '#1e242b';
  ctx.font = '700 48px Arial, sans-serif';
  desenharTextoQuebrado(ctx, dados.atual.titulo, xTexto, 260, 500, 60, 4);
  ctx.fillStyle = '#5d6672';
  ctx.font = '30px Arial, sans-serif';
  desenharTextoQuebrado(ctx, dados.atual.autor, xTexto, 500, 500, 40, 2);
  if (dados.edicao) {
    ctx.fillStyle = '#5d6672';
    ctx.font = '24px Arial, sans-serif';
    desenharTextoQuebrado(ctx, `${dados.edicao} · ${dados.totalLivro} páginas`, xTexto, 555, 500, 32, 2);
  }

  if (dados.fotoUrl && fotoPerfil) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(xTexto + 38, 660, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(fotoPerfil, xTexto + 4, 626, 68, 68);
    ctx.restore();
  }

  if (dados.nome) {
    ctx.fillStyle = '#24426b';
    ctx.font = '600 27px Arial, sans-serif';
    ctx.fillText(`Lendo com ${dados.nome}`, dados.fotoUrl && fotoPerfil ? xTexto + 88 : xTexto, 670);
  }

  ctx.fillStyle = '#24426b';
  ctx.font = '700 76px Arial, sans-serif';
  ctx.fillText(`${dados.paginasLidas}`, 72, 930);
  ctx.fillStyle = '#5d6672';
  ctx.font = '30px Arial, sans-serif';
  ctx.fillText(`páginas registradas${dados.totalLivro ? ` de ${dados.totalLivro}` : ''}`, 72, 980);

  if (dados.percentual !== null) {
    ctx.fillStyle = '#d3dce6';
    ctx.fillRect(72, 1030, 936, 22);
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(72, 1030, 936 * dados.percentual / 100, 22);
    ctx.fillStyle = '#24426b';
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText(`${dados.percentual}% do livro`, 72, 1095);
  }

  ctx.fillStyle = '#5d6672';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('Nosso Clube do Livro', 72, 1270);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return alert('Não foi possível gerar a imagem. Tente novamente.');

  if (estadoApp.cartaoProgressoUrl) URL.revokeObjectURL(estadoApp.cartaoProgressoUrl);
  estadoApp.cartaoProgressoBlob = blob;
  estadoApp.cartaoProgressoUrl = URL.createObjectURL(blob);

  const preview = document.getElementById('cartao-progresso-preview');
  preview.src = estadoApp.cartaoProgressoUrl;
  preview.classList.remove('oculto');

  if (!capa) {
    alert('A capa não pôde ser incluída pela origem da imagem; o cartão foi gerado com o título do livro.');
  }
};

window.baixarCartaoProgresso = async () => {
  if (!estadoApp.cartaoProgressoBlob) {
    return alert('Gere o cartão antes de baixá-lo.');
  }

  const link = document.createElement('a');
  link.href = estadoApp.cartaoProgressoUrl;
  link.download = 'meu-progresso-de-leitura.png';
  link.click();
};

window.compartilharCartaoProgresso = async () => {
  if (!estadoApp.cartaoProgressoBlob) {
    return alert('Gere o cartão antes de compartilhá-lo.');
  }

  const dados = obterDadosCartaoProgresso();
  if (!dados) return;
  const texto = `Estou lendo "${dados.atual.titulo}"${dados.edicao ? ` (${dados.edicao}, ${dados.totalLivro} páginas)` : ''} no Clube do Livro e já registrei ${dados.paginasLidas} páginas${dados.percentual !== null ? ` (${dados.percentual}%)` : ''}.`;
  if (typeof File === 'undefined') {
    return alert('Este navegador não permite compartilhar arquivos. Use “Baixar imagem” para salvar o cartão.');
  }
  const arquivo = new File([estadoApp.cartaoProgressoBlob], 'meu-progresso-de-leitura.png', {
    type: 'image/png'
  });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ title: 'Meu progresso de leitura', text: texto, files: [arquivo] });
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Não foi possível abrir o compartilhamento: ' + error.message);
      }
    }
    return;
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  alert('Seu navegador abriu o WhatsApp com o texto. Para compartilhar a imagem no WhatsApp ou Instagram, use também “Baixar imagem”.');
};

window.limparCartaoProgresso = () => {
  if (estadoApp.cartaoProgressoUrl) URL.revokeObjectURL(estadoApp.cartaoProgressoUrl);
  estadoApp.cartaoProgressoBlob = null;
  estadoApp.cartaoProgressoUrl = '';
  const preview = document.getElementById('cartao-progresso-preview');
  if (preview) {
    preview.removeAttribute('src');
    preview.classList.add('oculto');
  }
};