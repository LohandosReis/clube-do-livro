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