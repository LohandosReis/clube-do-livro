const SUPABASE_URL = 'https://qajrzxmzetrherdrdjua.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TgvyvF09TZLgXP_bLk6K4A_95CEqCpq';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Estado global compartilhado entre os módulos
const estadoApp = {
  encontros: [],
  perfis: {},
  avaliacoes: [],
  comentarios: [],
  indicacoes: [],
  votos: [],
  sessao: null,
  usuario: null,
  perfilUsuario: null,
  ehAdminMaster: false,
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

async function fazerUploadFotoComprimida(file, prefixo = 'foto') {
  const opcoes = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
  const arquivoComprimido = await imageCompression(file, opcoes);
  const nomeArquivo = `${prefixo}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error } = await supabaseClient.storage.from('fotos-clube').upload(nomeArquivo, arquivoComprimido);
  if (error) throw error;

  const { data: urlData } = supabaseClient.storage.from('fotos-clube').getPublicUrl(nomeArquivo);
  return urlData?.publicUrl || '';
}