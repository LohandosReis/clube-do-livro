const SUPABASE_URL = 'https://qajrzxmzetrherdrdjua.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TgvyvF09TZLgXP_bLk6K4A_95CEqCpq';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EMAIL_ADMIN_MASTER = 'lohanpereiradosreis@gmail.com';
const TAMANHO_MAXIMO_FOTO_PERFIL = 10 * 1024 * 1024;
const TIPOS_FOTO_PERFIL_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

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

// Estado global compartilhado entre os módulos
const estadoApp = {
  encontros: [],
  perfis: {},
  avaliacoes: [],
  comentarios: [],
  curtidasComentarios: [],
  respostasComentarios: [],
  curtidasProgressoCompartilhado: [],
  comentariosProgressoCompartilhado: [],
  indicacoes: [],
  votos: [],
  progressoLeitura: [],
  edicaoLeitura: null,
  metasLeitura: null,
  metricasGrupo: null,
  cartoesProgressoPublicos: [],
  progressoPublicado: null,
  cartaoProgressoBlob: null,
  cartaoProgressoUrl: '',
  sessao: null,
  usuario: null,
  perfilUsuario: null,
  detalhesPerfilUsuario: null,
  ehAdminMaster: false,
  recuperacaoSenhaAtiva: false,
  fotosEmEdicao: []
};

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
  return `https://placehold.co/44x44/1e4774/ffffff?text=${inicial}`;
}

function validarArquivoFotoPerfil(arquivo) {
  if (!arquivo) return '';
  if (!TIPOS_FOTO_PERFIL_ACEITOS.includes((arquivo.type || '').toLowerCase())) {
    return 'Formato não aceito. Escolha uma imagem JPG, PNG ou WebP.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_FOTO_PERFIL) {
    return 'A imagem ultrapassa o limite de 10 MB. Escolha um arquivo menor.';
  }
  return '';
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

async function fazerUploadFotoComprimida(file, prefixo = 'foto') {
  const opcoes = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
  const arquivoComprimido = await imageCompression(file, opcoes);
  const nomeArquivo = `${prefixo}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error } = await supabaseClient.storage.from('fotos-clube').upload(nomeArquivo, arquivoComprimido);
  if (error) throw error;

  const { data: urlData } = supabaseClient.storage.from('fotos-clube').getPublicUrl(nomeArquivo);
  return urlData?.publicUrl || '';
}

async function fazerUploadFotoPerfilComprimida(file, usuarioId) {
  const erroValidacao = validarArquivoFotoPerfil(file);
  if (erroValidacao) throw new Error(erroValidacao);

  const opcoes = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
  let arquivoComprimido;
  try {
    arquivoComprimido = await imageCompression(file, opcoes);
  } catch (error) {
    throw new Error(`Não foi possível processar a imagem. Tente JPG, PNG ou WebP com até 10 MB. ${error.message || ''}`.trim());
  }
  const nomeArquivo = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const sufixo = Math.random().toString(36).slice(2, 8);
  const caminho = `${usuarioId}/${Date.now()}-${sufixo}-${nomeArquivo}`;

  const { error } = await supabaseClient
    .storage
    .from('fotos-perfis-clube')
    .upload(caminho, arquivoComprimido);
  if (error) {
    throw new Error(`O armazenamento recusou a foto: ${error.message}. Confira o acesso ao bucket de fotos de perfil.`);
  }

  return caminho;
}

async function assinarFotosDePerfis(perfis, { exigirAssinatura = false } = {}) {
  const registros = perfis.map(perfil => ({
    ...perfil,
    foto_path: perfil.foto_url || ''
  }));
  const caminhos = Array.from(new Set(registros
    .map(perfil => perfil.foto_path)
    .filter(caminho => caminho && !/^https?:\/\//i.test(caminho))));

  if (!caminhos.length) return registros;

  const { data, error } = await supabaseClient
    .storage
    .from('fotos-perfis-clube')
    .createSignedUrls(caminhos, 3600);
  if (error) throw error;

  const resultados = new Map((data || []).map(item => [item.path, item]));
  return registros.map(perfil => {
    if (/^https?:\/\//i.test(perfil.foto_path)) {
      return { ...perfil, foto_url: perfil.foto_path };
    }

    const resultado = resultados.get(perfil.foto_path);
    if (exigirAssinatura && perfil.foto_path && (!resultado || resultado.error || !resultado.signedUrl)) {
      const detalhe = typeof resultado?.error === 'string'
        ? resultado.error
        : (resultado?.error?.message || 'O armazenamento não retornou um endereço para a foto.');
      throw new Error(`Não foi possível gerar um endereço seguro para a foto: ${detalhe}`);
    }

    return { ...perfil, foto_url: resultado?.signedUrl || '' };
  });
}

async function removerFotoPerfilAntiga(fotoPath) {
  if (!fotoPath) return true;

  let bucket = 'fotos-perfis-clube';
  let caminho = fotoPath;
  if (/^https?:\/\//i.test(fotoPath)) {
    const marcador = '/storage/v1/object/public/fotos-clube/';
    const url = new URL(fotoPath);
    const indice = url.pathname.indexOf(marcador);
    if (indice < 0) return false;
    bucket = 'fotos-clube';
    caminho = decodeURIComponent(url.pathname.slice(indice + marcador.length));
  }

  const { error } = await supabaseClient.storage.from(bucket).remove([caminho]);
  if (error) throw error;
  return true;
}