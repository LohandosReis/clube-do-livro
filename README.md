# Clube do Livro

Aplicação web estática para acompanhar leituras de um clube de leitura, gerenciar encontros, publicar resenhas individuais, avaliar livros, comentar e indicar próximas leituras.

O projeto não usa framework ou processo de compilação. Os arquivos são carregados diretamente pelo navegador, com dados, autenticação e armazenamento de imagens fornecidos pelo Supabase.

## Índice

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Configuração do Supabase](#configuração-do-supabase)
- [Configuração da aplicação](#configuração-da-aplicação)
- [Modelo de dados](#modelo-de-dados)
- [Segurança e permissões](#segurança-e-permissões)
- [Fluxos de uso](#fluxos-de-uso)
- [Integrações externas](#integrações-externas)
- [Carregamento e inicialização](#carregamento-e-inicialização)
- [Interface e estilos](#interface-e-estilos)
- [Variáveis e convenções](#variáveis-e-convenções)
- [Personalização](#personalização)
- [Manutenção](#manutenção)
- [Limitações conhecidas](#limitações-conhecidas)
- [Solução de problemas](#solução-de-problemas)

## Visão geral

A aplicação está dividida em duas experiências principais:

1. **Espaço público**, disponível para todos:
   - leitura atual;
   - próximos encontros;
   - histórico de leituras;
   - filtros por tipo, status, gênero e texto;
   - guia editável de discussão;
   - indicações, comentários, avaliações e resenhas já publicados pelos membros.

2. **Espaço autenticado**, disponível após cadastro ou login:
   - avaliação de livros;
   - comentários;
   - criação de indicações;
   - votação em indicações;
   - edição do próprio perfil e busca de membros que optaram por aparecer;
   - exclusão de conteúdo próprio;
   - publicação de resenhas individuais, quando habilitado pelo administrador.
   - registro pessoal de páginas lidas por dia;
   - acompanhamento diário, semanal, mensal e histórico da leitura atual.

O perfil **Admin Master** possui acesso ao painel administrativo, à manutenção dos livros e encontros, ao gerenciamento de permissões e à edição do guia.

### Navegação e identidade visual

O conteúdo é organizado em áreas independentes: **Início**, **Métricas**, **Biblioteca**, **Comunidade**, **Meu perfil**, **Membros** e, para o Admin Master, **Administração**. A navegação altera a seção sem recarregar a aplicação, atualiza o endereço com `?secao=` e respeita os botões Voltar do site e do navegador. O perfil próprio e a busca de membros ficam em páginas separadas.

O tema usa superfícies claras como base, azul como cor principal, preto/grafite para texto e vermelho como cor de ênfase e ações de perigo, seguindo a proporção visual aproximada 60/30/10.

## Funcionalidades

### Acompanhamento de leituras

- Destaque da leitura com status `atual`.
- Exibição da data, local ou horário do encontro.
- Meta textual da leitura.
- Barra de progresso coletivo calculada pela média do percentual lido pelos membros que registraram páginas para o livro atual.
- O percentual de cada participante é limitado a 100%; a tela também informa a média de páginas por participante e o total de páginas registrado pelo grupo.
- O campo de total de páginas é necessário para calcular o percentual coletivo.
- Criação de evento no Google Agenda.
- Estatísticas gerais:
  - quantidade de livros concluídos;
  - páginas de livros concluídos e páginas registradas pelo grupo no livro atual;
  - média geral das notas.

### Catálogo e histórico

- Postagens separadas em:
  - `clube`: livros e encontros administrados pelo clube;
  - `individual`: leituras e resenhas publicadas por membros habilitados.
- Cadastro de título, autor, capa, gêneros, status, data, local, páginas, nota, contexto e discussão.
- Biblioteca em grade com capa e informações principais; cada livro abre uma página de detalhes com encontro, contexto do autor, notas, resenhas, fotos e comentários.
- A página de detalhes oferece retorno direto à biblioteca e mantém suporte ao histórico do navegador.
- Galeria de fotos por encontro.
- Filtro por:
  - tipo da postagem;
  - status;
  - gênero;
  - título, autor, gênero ou nome do autor da postagem.

### Administração

- Cadastro e edição de módulos de leitura.
- Cancelamento de edição.
- Exclusão de registros.
- Busca automática de livros nas APIs externas.
- Seleção múltipla de gêneros.
- Upload de fotos com compressão no navegador.
- Fotos de perfil aceitam JPG, PNG e WebP, com limite de 10 MB antes da compressão; a interface mostra prévia e mensagens de validação/envio.
- Se o cadastro exigir confirmação por e-mail, a foto não é enviada antes da confirmação; a interface orienta o membro a adicioná-la depois de entrar.
- Remoção individual de fotos já cadastradas.
- Edição do título e conteúdo do guia de discussão.
- Listagem de membros, edição de nome/foto e alteração da permissão de publicar resenhas individuais.
- Edição e remoção de qualquer livro, resenha, comentário, indicação ou avaliação pública; também pode remover votos.
- Confirmação explícita antes de salvar edições ou excluir conteúdo.

### Comunidade

- Cadastro e login por e-mail e senha.
- Foto de perfil opcional no cadastro.
- Avaliação de cada livro em uma escala de 0 a 5.
- Uma avaliação por usuário em cada livro, atualizada por upsert.
- Comentários em cada livro.
- Curtidas e respostas em comentários publicados pelos membros.
- Indicação de novos livros com título, autor, gênero e justificativa.
- Voto único por membro em cada indicação.
- Ordenação das indicações pela quantidade de votos.
- Exclusão do próprio comentário ou indicação.
- Visitantes sem login podem apenas visualizar conteúdo já publicado; formulários, votação, avaliação e comentários só aparecem para membros autenticados.
- O Admin Master pode editar ou remover perfis públicos, comentários, indicações e avaliações de qualquer membro, além de remover votos.

### Perfil e diretório de membros

- O botão com a foto e o nome do usuário no cabeçalho abre diretamente a página completa do próprio perfil.
- Cada membro pode editar o próprio nome ou apelido, foto, biografia, cidade/estado, gêneros, livros e autores favoritos, link pessoal e um campo personalizado.
- Cada campo tem uma preferência independente: somente a própria pessoa, membros conectados ou todos os visitantes.
- O diretório só funciona para membros conectados e lista apenas perfis que ativaram explicitamente a opção de aparecer na busca.
- As informações do perfil compartilhadas por um link respeitam as mesmas preferências. E-mail, metas e histórico pessoal de leitura não são incluídos.
- Fotos novas ficam em um bucket privado e são exibidas por URLs temporárias somente quando a preferência do campo permite. Fotos antigas em endereços públicos precisam ser reenviadas para poder restringir sua visibilidade.

### Acompanhamento pessoal

- Um usuário autenticado pode registrar quantas páginas leu em cada data.
- Os registros são separados por usuário e pela leitura atual.
- Cada membro pode excluir seus próprios registros diários pela lista de registros.
- A interface mostra os totais de hoje, da semana atual, do mês atual e do período registrado.
- A tela calcula média por dia ativo e sequência de dias consecutivos.
- Mostra o recorde pessoal de dias consecutivos, páginas restantes e ritmo diário necessário até o próximo encontro.
- Inclui gráfico semanal e mapa de atividade das últimas 12 semanas.
- Um mapa visual de 84 dias usa blocos coloridos para representar o desempenho diário.
- Metas pessoais configuráveis de páginas por dia e por semana; deixar o campo vazio ou informar zero desativa a meta.
- As barras de desempenho das metas consideram todos os registros pessoais, inclusive de livros anteriores.
- Arquivo anual privado dos livros do clube concluídos, com páginas registradas, dias de leitura e quantidade de livros por ano.
- Os registros são preservados quando o clube conclui um livro e agrupados pelo ano de `data_leitura`.
- O cartão individual pode ser gerado, baixado ou compartilhado; incluir o nome é opcional.
- A foto do perfil no cartão também pode ser incluída ou omitida.
- A publicação do cartão no site é opt-in e pode ser retirada pela própria pessoa.

### Métricas do grupo

- Mostra totais do livro atual, hoje, semana e mês.
- Calcula o progresso médio do livro atual usando apenas os registros dos membros, sem exibir dados individuais.
- Conta como participante quem registrou mais de zero páginas para o livro atual.
- Conta membros ativos nos últimos sete dias.
- Exibe atividade diária somente quando há ao menos três leitores naquele dia; os nomes de animais são aleatórios e não identificam membros.
- Exibe cartões públicos somente de membros que ativaram explicitamente a publicação.
- Os cartões de progresso compartilhados podem receber curtidas e comentários de outros membros conectados.
- Alterar a quantidade registrada em uma data substitui o valor daquela data.

## Arquitetura

A aplicação segue uma arquitetura de página única em JavaScript vanilla. Não existe servidor Node.js, framework frontend ou processo de build.

O carregamento ocorre pela seguinte cadeia:

```text
index.html
  ├── Supabase JS
  ├── Browser Image Compression
  ├── config.js
  ├── auth.js
  ├── livros-api.js
  ├── comunidade.js
  ├── ui.js
  └── app.js
```

`config.js` cria o estado global e centraliza utilitários compartilhados. Os outros scripts dependem desses símbolos globais e da instanciação `supabaseClient`.

```text
Navegador
  ├── Supabase Auth
  ├── Supabase Database (Postgres)
  ├── Supabase Storage
  ├── Open Library API
  ├── Gutendex API
  ├── OpenAlex API
  └── Google Agenda
```

Os scripts usam código global em vez de módulos ES. A ordem definida em `index.html` é necessária.

## Tecnologias

- HTML5.
- CSS3.
- JavaScript vanilla.
- Supabase JS SDK 2.
- Supabase Auth.
- Supabase Postgres.
- Supabase Storage.
- Browser Image Compression.
- Google Fonts.
- Open Library.
- Gutendex / Project Gutenberg.
- OpenAlex.
- Google Agenda por URL compartilhada.

Não há dependências de npm declaradas e não é necessário executar `npm install`.

## Estrutura do projeto

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura da página, formulários, seções e carregamento dos scripts. |
| `style.css` | Tema visual, componentes, layout responsivo e animações. |
| `config.js` | Cliente Supabase, administrador mestre, gêneros, estado global e validação/utilitários de imagem. |
| `auth.js` | Perfil, sessão, login, cadastro, validação de senha, recuperação de senha, logout e interface de autenticação. |
| `livros-api.js` | Consultas às APIs externas e preenchimento do formulário administrativo. |
| `comunidade.js` | Avaliações, comentários, indicações e votos da comunidade. |
| `ui.js` | Gêneros, fotos, usuários administrativos, placar e renderização da interface. |
| `app.js` | Inicialização, navegação e histórico de páginas, eventos, CRUD de leituras e resenhas individuais. |
| `supabase-migration.sql` | Criação das tabelas, funções, índices implícitos, políticas RLS e Storage. |
| `README.md` | Documentação completa do projeto. |

## Pré-requisitos

- Navegador moderno com JavaScript habilitado.
- Conexão com a internet.
- Projeto Supabase próprio ou credenciais válidas de um projeto existente.
- Serviço de hospedagem estática opcional para publicação.

APIs externas podem aplicar limites ou ficar temporariamente indisponíveis.

## Instalação e execução

### Executar localmente

Como não existem etapas de build, abra `index.html` diretamente no navegador ou use um servidor HTTP local. Use um endereço HTTP/HTTPS para cadastro com confirmação por e-mail e recuperação de senha; esses fluxos de autenticação não funcionam corretamente em `file://`.

Exemplo com Python:

```text
cd caminho\do\clube-do-livro
python -m http.server 5500
```

Depois acesse `http://localhost:5500`.

Exemplo com Node.js usando `npx`:

```text
npx serve .
```

Um servidor local é recomendado, pois evita algumas diferenças de acesso e facilita o uso de recursos do navegador. Para testar os links de autenticação, use o endereço HTTP local, por exemplo `http://localhost:5500`.

### Publicar

O projeto pode ser publicado em qualquer hospedagem estática, como GitHub Pages, Netlify, Cloudflare Pages ou Vercel.

Publique todos os arquivos na raiz do site ou ajuste as referências relativas caso o conteúdo seja colocado em subdiretório.

## Configuração do Supabase

### 1. Criar o projeto

Crie um projeto no Supabase e execute o conteúdo de `supabase-migration.sql` no SQL Editor.

O script:

- cria ou atualiza as tabelas;
- cria funções auxiliares;
- habilita Row Level Security;
- cria políticas de leitura e escrita;
- cria o bucket público `fotos-clube` para fotos de livros;
- cria o bucket privado `fotos-perfis-clube` para fotos de perfil;
- cria as políticas de upload, leitura autorizada e exclusão de imagens.

O script foi escrito para preservar tabelas existentes e adicionar colunas quando necessário. Se já executou uma versão anterior, execute novamente o arquivo completo para aplicar as tabelas, políticas e permissões mais recentes.

### 2. Configurar autenticação

No painel do Supabase:

1. Abra `Authentication`.
2. Confira a configuração de provedores.
3. Habilite `Email/Password`.
4. Configure a confirmação de e-mail conforme a política desejada para o clube e revise o template de confirmação.
5. Em `URL Configuration`, configure o `Site URL` do site publicado e adicione à lista `Redirect URLs` todos os endereços usados para confirmação e recuperação.
6. Adapte a política de senha do Supabase para aceitar senhas com pelo menos 8 caracteres.

O cadastro e a redefinição redirecionam para o endereço atual do site, incluindo o caminho da página. Cadastre cada endereço exato necessário, por exemplo `http://localhost:5500/` para desenvolvimento e `https://seu-dominio.example/` para produção (ou o caminho real onde `index.html` está hospedado). Não use `file://`. Se o Supabase rejeitar o retorno com erro de URL não permitida, confira esses valores em `Authentication > URL Configuration`.

O formulário exige pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número. Configure no Supabase um comprimento mínimo compatível e os critérios adicionais disponíveis no painel. A validação do formulário melhora a experiência, mas, se o Supabase não aplicar os mesmos critérios no servidor, outros clientes ainda poderão enviar senhas diferentes.

### 3. Criar o primeiro usuário administrador

Cadastre no projeto Supabase uma conta com o e-mail definido em `EMAIL_ADMIN_MASTER` no arquivo `config.js`.

Depois use o único botão **Entrar / Cadastrar** da interface e informe as credenciais dessa conta.

Ao criar o perfil, o sistema força `pode_publicar_resenha = true` para o administrador.

### 4. Criar o guia inicial

Na primeira execução, a tabela `guia_clube` pode não possuir o registro `id = 1`. A aplicação tenta carregar esse registro e mostra uma mensagem de erro caso ele não exista.

O administrador pode criar o guia pela aba correspondente. O código usa `upsert` com `id = 1`.

## Configuração da aplicação

As principais configurações ficam em `config.js`:

```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_PUBLICAVEL';
const EMAIL_ADMIN_MASTER = 'email-do-administrador@example.com';
```

Substitua os valores antes de publicar em outro projeto Supabase.

### Supabase URL

Use a URL do projeto encontrada em:

`Supabase > Project Settings > API > Project URL`.

### Chave publicável

Use a chave pública ou publishable key disponibilizada pelo Supabase. Ela é usada no navegador e não substitui as políticas de segurança do banco.

Não coloque uma chave secreta de servidor em `config.js`.

### Administrador master

O administrador é identificado pelo e-mail em `EMAIL_ADMIN_MASTER`. A identificação é feita em comparações sem diferenciação de maiúsculas e minúsculas.

O mesmo e-mail precisa corresponder à função SQL `clube_e_admin()`, definida em `supabase-migration.sql`. A função SQL deve ser atualizada caso o e-mail do administrador seja alterado.

## Modelo de dados

As leituras do clube e o conteúdo comunitário publicado podem ser lidos por visitantes. Perfis e dados pessoais têm regras de acesso próprias; operações de escrita são protegidas por RLS.

### `perfis_clube`

Armazena os campos básicos do perfil. O e-mail é privado e não pode ser consultado diretamente pelo cliente. Nome e foto só são retornados pelas funções de perfil de acordo com as preferências de visibilidade.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave estrangeira do usuário em `auth.users`. |
| `email` | `text` | Campo legado privado; o painel administrativo recebe e-mail por uma função restrita. |
| `nome` | `text` | Nome ou apelido exibido na interface. |
| `foto_url` | `text` | Caminho no bucket privado ou URL de foto legada. |
| `pode_publicar_resenha` | `boolean` | Autoriza resenhas individuais. |
| `criado_em` | `timestamptz` | Data de criação. |

### `perfis_clube_detalhes`

Armazena informações opcionais do perfil e preferências independentes de privacidade. O acesso direto à tabela é limitado ao próprio membro; o site usa funções SQL que retornam somente os campos autorizados.

| Coluna | Tipo | Descrição |
|---|---|---|
| `usuario_id` | `uuid` | Dono do perfil e chave primária. |
| `bio` | `text` | Biografia. |
| `cidade_estado` | `text` | Cidade e estado informados pela pessoa. |
| `generos_favoritos` | `text` | Gêneros literários favoritos. |
| `livros_favoritos` | `text` | Livros favoritos. |
| `autores_favoritos` | `text` | Autores favoritos. |
| `link_perfil` | `text` | Link pessoal com protocolo HTTP ou HTTPS. |
| `campo_personalizado_nome`, `campo_personalizado_valor` | `text` | Rótulo e conteúdo de um campo adicional. |
| `listar_no_diretorio` | `boolean` | Adesão explícita ao diretório de membros. |
| `visibilidade_*` | `text` | `privado`, `membros` ou `publico` para cada campo. |
| `atualizado_em` | `timestamptz` | Momento da última edição. |

### `encontros`

Representa tanto os módulos principais do clube quanto resenhas individuais.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `bigint identity` | Identificador único. |
| `titulo` | `text` | Título do livro. |
| `autor` | `text` | Autor do livro. |
| `capa` | `text` | URL da imagem de capa. |
| `genero` | `text` | Gêneros separados por vírgulas. |
| `status` | `text` | `atual`, `proximo` ou `lido`. |
| `data_encontro` | `date` | Data do encontro ou publicação. |
| `horario_local` | `text` | Horário, local ou descrição da leitura individual. |
| `paginas_totais` | `integer` | Quantidade total de páginas. |
| `pagina_meta` | `integer` | Campo legado mantido para compatibilidade; não é usado no progresso coletivo atual. |
| `meta_texto` | `text` | Descrição da meta semanal. |
| `nota` | `numeric(3,1)` | Nota de referência ou nota do autor da resenha. |
| `bio_autor` | `text` | Contexto sobre o autor ou obra. |
| `discussao` | `text` | Conteúdo de discussão ou resenha. |
| `fotos` | `jsonb` | Lista de URLs das fotos. |
| `tipo_postagem` | `text` | `clube` ou `individual`. |
| `autor_postagem_id` | `uuid` | Autor autenticado da resenha individual. |
| `autor_postagem_nome` | `text` | Nome exibido na postagem. |
| `criado_em` | `timestamptz` | Data de criação. |

Restrições:

- páginas não podem ser negativas;
- `pagina_meta` (campo legado) não pode superar `paginas_totais`;
- nota deve estar entre 0 e 5.

### `guia_clube`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `integer` | Identificador único; a aplicação utiliza `id = 1`. |
| `titulo` | `text` | Título exibido no detalhamento. |
| `conteudo` | `text` | Orientações e perguntas de discussão. |
| `atualizado_em` | `timestamptz` | Momento da última atualização. |

### `avaliacoes_livro`

| Coluna | Tipo | Descrição |
|---|---|---|
| `encontro_id` | `bigint` | Livro avaliado. |
| `usuario_id` | `uuid` | Autor da avaliação. |
| `nota` | `numeric(3,1)` | Nota de 0 a 5. |
| `atualizado_em` | `timestamptz` | Última atualização. |

Chave primária composta: `(encontro_id, usuario_id)`.

### `comentarios_livro`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `bigint identity` | Identificador único. |
| `encontro_id` | `bigint` | Livro comentado. |
| `usuario_id` | `uuid` | Autor do comentário. |
| `texto` | `text` | Conteúdo do comentário. |
| `criado_em` | `timestamptz` | Data de criação. |

### Interações nos comentários de livros

`curtidas_comentarios_livro` registra uma curtida por membro e comentário; a chave primária (`comentario_id`, `usuario_id`) impede curtidas repetidas. O autor não pode curtir o próprio comentário.

| Coluna | Tipo | Descrição |
|---|---|---|
| `comentario_id` | `bigint` | Comentário curtido. |
| `usuario_id` | `uuid` | Membro que curtiu. |
| `criado_em` | `timestamptz` | Data da curtida. |

`respostas_comentarios_livro` guarda respostas vinculadas a um comentário:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `bigint identity` | Identificador da resposta. |
| `comentario_id` | `bigint` | Comentário ao qual a resposta pertence. |
| `usuario_id` | `uuid` | Membro que escreveu a resposta. |
| `texto` | `text` | Resposta não vazia, com até 1000 caracteres. |
| `criado_em` | `timestamptz` | Data da resposta. |

### `indicacoes_livro`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `bigint identity` | Identificador único. |
| `usuario_id` | `uuid` | Membro que indicou o livro. |
| `titulo` | `text` | Título sugerido. |
| `autor` | `text` | Autor sugerido. |
| `genero` | `text` | Gênero opcional. |
| `motivo` | `text` | Justificativa opcional. |
| `criado_em` | `timestamptz` | Data da indicação. |

### `votos_indicacao`

| Coluna | Tipo | Descrição |
|---|---|---|
| `indicacao_id` | `bigint` | Indicação votada. |
| `usuario_id` | `uuid` | Membro que votou. |
| `criado_em` | `timestamptz` | Data do voto. |

Chave primária composta: `(indicacao_id, usuario_id)`.

### `progresso_leitura`

| Coluna | Tipo | Descrição |
|---|---|---|
| `usuario_id` | `uuid` | Usuário que registrou o progresso. |
| `encontro_id` | `bigint` | Leitura atual vinculada ao registro. |
| `data_leitura` | `date` | Dia em que as páginas foram lidas. |
| `paginas_lidas` | `integer` | Quantidade de páginas no dia. |
| `atualizado_em` | `timestamptz` | Última atualização do registro. |

Chave primária composta: `(usuario_id, encontro_id, data_leitura)`.

Os registros são privados entre usuários e também não são acessíveis ao Admin Master diretamente. Uma função SQL privilegiada retorna apenas estatísticas agregadas para o painel do grupo.

### `progresso_leitura_compartilhado`

Armazena apenas a decisão explícita de publicar um cartão e se o nome pode aparecer:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id_publico` | `uuid` | Identificador aleatório usado pelas interações públicas, sem expor o UUID da conta. |
| `usuario_id` | `uuid` | Dono da preferência de publicação. |
| `encontro_id` | `bigint` | Livro associado ao cartão. |
| `mostrar_nome` | `boolean` | Indica se o nome do perfil foi autorizado para exibição. |
| `mostrar_foto` | `boolean` | Indica se a foto do perfil foi autorizada para exibição. |
| `publicado_em` | `timestamptz` | Momento em que a publicação foi ativada. |

Chave primária composta: `(usuario_id, encontro_id)`. A tabela não permite leitura pública direta; a função `clube_cartoes_progresso_publicos()` retorna apenas dados dos cartões publicados, sem IDs de conta. A pessoa pode revogar a publicação pela própria interface.

### Interações em cartões de progresso compartilhado

- `curtidas_progresso_compartilhado` guarda uma curtida por membro e cartão publicado. A chave primária (`publicacao_id`, `usuario_id`) impede curtidas repetidas.
- `comentarios_progresso_compartilhado` guarda comentários de até 1000 caracteres, vinculados ao identificador aleatório `id_publico`.
- Essas interações só ficam visíveis enquanto o cartão estiver compartilhado e corresponder à leitura atual com progresso registrado.
- Ao retirar a publicação do cartão, as curtidas e os comentários associados são removidos em cascata.

Colunas de `curtidas_progresso_compartilhado`: `publicacao_id` (`uuid` do cartão), `usuario_id` (`uuid` do membro) e `criado_em` (`timestamptz`).

Colunas de `comentarios_progresso_compartilhado`: `id` (`bigint identity`), `publicacao_id` (`uuid` do cartão), `usuario_id` (`uuid` do autor), `texto` (`text`) e `criado_em` (`timestamptz`).

### `metas_leitura`

Armazena as metas privadas de cada usuário. Há uma linha por conta:

| Coluna | Tipo | Descrição |
|---|---|---|
| `usuario_id` | `uuid` | Dono das metas e chave primária. |
| `paginas_dia` | `integer` | Meta diária; zero significa desativada. |
| `paginas_semana` | `integer` | Meta semanal; zero significa desativada. |
| `atualizado_em` | `timestamptz` | Última atualização da linha. |

O histórico anual não exige uma tabela separada: é calculado a partir dos registros privados em `progresso_leitura`, agrupando por ano de `data_leitura` e exibindo livros do clube com status `lido`.

## Segurança e permissões

As tabelas usam RLS (Row Level Security). As regras principais são:

### Leitura

Leituras do clube, comentários, indicações e avaliações publicadas podem ser lidas por visitantes. O cliente não pode ler diretamente e-mails nem detalhes privados dos perfis.

### Perfis

- o usuário pode consultar e editar somente seu próprio registro de detalhes;
- funções SQL filtram campos do perfil pelas preferências de privacidade;
- o diretório exige autenticação e adesão explícita do membro;
- e-mail e dados pessoais de leitura não são retornados no diretório ou nos links compartilhados;
- permissões de publicação de resenha não podem ser alteradas pelo próprio membro.

### Leituras

- o administrador pode criar, editar e excluir qualquer postagem;
- um membro habilitado pode criar postagens do tipo `individual`;
- o membro só pode editar ou excluir suas próprias resenhas individuais;
- publicações do tipo `clube` não podem ser criadas por membros comuns.
- o Admin Master pode editar e excluir qualquer leitura ou resenha pública.

### Progresso de leitura

- cada usuário pode ler, editar e apagar apenas seus próprios registros diários;
- cada usuário pode consultar e alterar somente suas metas em `metas_leitura`;
- o Admin Master não tem leitura direta desses registros;
- `clube_metricas_grupo()` retorna somente métricas agregadas, sem IDs ou linhas individuais;
- `clube_cartoes_progresso_publicos()` retorna somente cartões publicados explicitamente;
- o cartão só é mostrado publicamente após o usuário habilitar a publicação.

### Avaliações

- qualquer pessoa pode ler;
- o usuário só pode criar ou alterar avaliações vinculadas ao próprio `usuario_id`;
- o Admin Master pode editar ou excluir avaliações de qualquer membro;
- existe uma única avaliação por par usuário/livro.

### Comentários e indicações

- autenticação é necessária para criar;
- o autor pode excluir seu próprio conteúdo;
- o Admin Master pode editar ou excluir qualquer comentário e indicação.
- visitantes podem ler curtidas e respostas; somente membros conectados podem curtir ou responder;
- não é permitido curtir o próprio comentário;
- o autor pode apagar suas respostas e o Admin Master pode moderar respostas.

### Interações em progresso compartilhado

- somente membros conectados podem curtir e comentar nos cartões compartilhados por outras pessoas;
- o autor do cartão não pode curtir nem comentar no próprio cartão;
- visitantes podem visualizar as interações;
- o autor pode excluir seus comentários; o Admin Master pode editar ou excluir comentários;
- a RLS verifica que o cartão continua publicado e que o progresso permanece visível antes de permitir interações.

### Fotos

O bucket `fotos-clube` é público para leitura e guarda fotos dos livros.

- O bucket privado `fotos-perfis-clube` guarda fotos de perfil novas; cada arquivo fica na pasta do UUID do próprio usuário.
- Fotos privadas são assinadas por tempo limitado após a função SQL confirmar que a visibilidade do perfil autoriza o acesso.
- O próprio usuário pode enviar e excluir arquivos apenas de sua pasta.
- Fotos legadas em URLs públicas permanecem públicas no serviço que as hospeda até serem substituídas ou removidas.

Os registros de metas e progresso pessoal continuam privados para cada membro, inclusive para o Admin Master; as permissões administrativas abrangem o conteúdo público do site.

### Função administrativa

`clube_e_admin()` verifica o e-mail presente no JWT. Esse identificador precisa ser mantido sincronizado com `EMAIL_ADMIN_MASTER` no frontend.

## Fluxos de uso

### Cadastro de membro

1. Clicar em **Entrar / Cadastrar**.
2. Escolher **Criar Conta de Membro**.
3. Informar nome, e-mail, senha e confirmação da senha.
4. Usar a indicação de força e o botão **Mostrar/Ocultar** para conferir a senha.
5. Opcionalmente enviar uma foto.
6. Aguardar confirmação de e-mail, conforme configuração do Supabase.
7. Entrar com as credenciais.

O perfil é criado ou atualizado em `perfis_clube`.

### Recuperar ou alterar a senha

1. Na tela de login, informar o e-mail da conta e clicar em **Esqueci minha senha**.
2. Abrir o link enviado pelo Supabase no mesmo site configurado na lista `Redirect URLs`.
3. Definir e confirmar uma senha que atenda aos requisitos descritos acima.
4. Salvar. A sessão será iniciada com a nova senha.

A mensagem após solicitar o link é genérica para não revelar se um endereço está cadastrado. Se o link expirou, use **Voltar ao login** e solicite outro. A recuperação depende dos templates e do serviço de e-mail configurados no projeto Supabase.

### Login único

1. Clicar em **Entrar / Cadastrar**.
2. Informar o e-mail e a senha.
3. O sistema identifica o tipo da conta pelo e-mail configurado.
4. Contas administrativas recebem o painel **Admin Master**.
5. Demais contas recebem apenas os recursos de membro.

### Criar leitura

1. Entrar como administrador.
2. Abrir **Gerenciar Livros / Encontros**.
3. Opcionalmente pesquisar o livro.
4. Selecionar pelo menos um gênero.
5. Informar status, data e informações de progresso.
6. Adicionar fotos.
7. Publicar.

### Editar ou excluir leitura

Use os botões **Editar** e **Excluir** em qualquer módulo que o usuário tenha permissão para gerenciar.

Na edição administrativa:

- os dados do registro são preenchidos no formulário;
- novas fotos são adicionadas às existentes;
- fotos antigas podem ser removidas;
- o registro é atualizado pelo `id`.

### Publicar resenha individual

1. Entrar como membro habilitado.
2. Clicar em **Nova Resenha / Leitura Individual**.
3. Informar título, autor, gênero, páginas, nota e texto.
4. Publicar.

O administrador pode habilitar ou revogar essa permissão na aba **Usuários e Permissões**.

### Avaliar, comentar e indicar

- A avaliação exige login e aceita valores de 0 a 5.
- Comentários exigem login.
- Indicações exigem login.
- A votação exige login e pode ser alternada.
- Exclusões exigem ser o autor ou o administrador.

### Curtir e responder a comentários

1. Abrir os comentários de um livro.
2. Entrar na conta para curtir um comentário de outra pessoa ou responder a um comentário.
3. O autor pode apagar sua própria resposta; o Admin Master pode moderar respostas.

### Interagir com progresso compartilhado

1. Um membro ativa a publicação do cartão de progresso pessoal.
2. Outros membros conectados podem curtir ou comentar no cartão, na área **Ritmo do Clube**.
3. Visitantes podem ler as curtidas e comentários, mas precisam entrar para interagir.

### Editar perfil e encontrar membros

1. Entrar na conta e abrir **Meu perfil** para editar as próprias informações.
2. Preencher apenas as informações que deseja compartilhar.
3. Escolher separadamente quem pode ver cada campo.
4. Salvar. Para restringir uma foto pública antiga, reenviá-la usando o formulário antes de mudar a visibilidade.
5. Abrir **Membros** para pesquisar perfis que autorizaram aparecer no diretório.

## Integrações externas

### Open Library

Endpoint utilizado:

```text
https://openlibrary.org/search.json
```

Retorna título, autores, capa, páginas medianas e assuntos.

### Gutendex

Endpoint utilizado:

```text
https://gutendex.com/books/
```

É usado principalmente para obras de domínio público.

### OpenAlex

Endpoint utilizado:

```text
https://api.openalex.org/works
```

Retorna registros acadêmicos e literários relacionados ao termo pesquisado.

Os resultados são combinados, ordenados por relevância e limitados a 14 itens.

### Google Agenda

Cada leitura atual gera uma URL de evento com:

- título;
- descrição;
- local;
- data.

O evento é criado no Google Agenda em uma aba externa.

### Google Fonts

As fontes `Fraunces` e `Plus Jakarta Sans` são carregadas por CDN. Se o CDN estiver indisponível, o navegador utiliza fontes serifadas e sem serifa locais.

## Carregamento e inicialização

Ao terminar o carregamento da página, o sistema verifica se as bibliotecas Supabase e Browser Image Compression estão disponíveis.

Na inicialização:

1. `montarSeletoresDeGenero()` popula os campos de gênero.
2. `registrarEventos()` liga formulários e ações.
3. A seção inicial é apresentada para evitar mostrar todas as áreas durante o carregamento.
4. `carregarGuia()` busca o registro `id = 1`.
5. `carregarEncontros()` busca leituras e atualiza perfis, comunidade, progresso pessoal e métricas coletivas.
6. `verificarSessao()` recupera a sessão atual.
7. `inicializarNavegacao()` aplica a seção indicada na URL e configura o histórico.

Os dados são carregados novamente após a maioria das operações de escrita.

## Interface e estilos

O tema combina superfícies claras (60%), azul institucional (30%) e detalhes vermelhos (10%), com texto em grafite/preto. A barra de navegação separa início, métricas, biblioteca, comunidade, perfil, membros e administração.

Principais componentes:

- cabeçalho com navegação principal responsiva;
- cabeçalho contextual para cada área e retorno à seção anterior;
- placar de estatísticas;
- cards com bordas e sombras suaves;
- painel administrativo com abas;
- chips de gêneros;
- caixas retráteis;
- galeria de fotos;
- barra de progresso;
- comentários com avatar;
- cartões de indicação;
- badges de status e nota;
- botões primário, secundário e de perigo.

O layout tem breakpoint em `600px`; em telas menores, a navegação pode ser rolada horizontalmente e formulários, cabeçalhos e cartões se reorganizam.

Animações são reduzidas quando o usuário possui preferência `prefers-reduced-motion`.

## Variáveis e convenções

### Estado global

`estadoApp`, definido em `config.js`, contém:

- `encontros`;
- `perfis`;
- `avaliacoes`;
- `comentarios`;
- `indicacoes`;
- `votos`;
- `sessao`;
- `usuario`;
- `perfilUsuario`;
- `ehAdminMaster`;
- `fotosEmEdicao`.

### Gêneros

Os gêneros disponíveis são definidos em `GENEROS_DISPONIVEIS`.

Os gêneros de um livro são armazenados como uma única string separada por vírgulas. Utilitários como `parseGeneros()` transformam essa string em lista.

### HTML seguro

Valores fornecidos por usuários devem ser exibidos com `escaparHTML()` antes da interpolação em templates.

### Identificadores

Os módulos usam `id` numérico para `encontros`, comentários e indicações.

Os perfis e usuários Supabase usam UUID.

## Personalização

### Alterar administrador

Altere simultaneamente:

1. `EMAIL_ADMIN_MASTER` em `config.js`;
2. a comparação em `clube_e_admin()` no arquivo SQL.

Não mantenha versões diferentes do e-mail no frontend e no banco.

### Alterar gêneros

Edite o array `GENEROS_DISPONIVEIS` em `config.js`. Os campos de admin, filtro, indicação e resenha são reconstruídos a partir desse array.

### Alterar limites de imagens

A função `fazerUploadFotoComprimida()` usa:

- tamanho máximo de 0,3 MB;
- largura ou altura máxima de 1280 pixels;
- Web Worker quando disponível.

Esses valores podem ser ajustados em `config.js`.

### Alterar a aparência

As principais propriedades visuais ficam nas variáveis CSS no início de `style.css`.

Exemplos:

- `--cor-primaria`;
- `--cor-fundo`;
- `--cor-card`;
- `--texto`;
- `--raio-lg`;
- `--sombra-card`.

### Alterar fontes externas

As fontes são declaradas em `index.html` e referenciadas em `style.css`.

## Manutenção

### Atualizar conteúdo

Use o painel administrativo para leituras, encontros e guia.

### Atualizar usuários

Use a aba **Usuários e Permissões** para habilitar ou revogar publicação individual.

### Remover dados

Exclusão de uma leitura remove avaliações, comentários e indicações dependentes por cascata.

Exclusão de usuário pode remover suas avaliações, comentários, indicações e votos por cascata. Leituras individuais mantêm o registro, mas o `autor_postagem_id` pode ser definido como nulo, enquanto o nome textual permanece salvo.

### Migrações

Para mudanças no esquema:

1. adicionar ou alterar tabelas no SQL Editor;
2. atualizar as políticas RLS;
3. atualizar os scripts JavaScript;
4. testar leitura pública;
5. testar escrita de membro;
6. testar operações administrativas.

O script fornecido pode ser executado novamente com segurança para os objetos cobertos por `create table if not exists`, `drop policy if exists` e `on conflict`.

## Limitações conhecidas

- Não há framework ou sistema de compilação.
- Scripts são globais e dependem da ordem de carregamento.
- Não há testes automatizados incluídos.
- O conteúdo público não possui cache local.
- Cada atualização recarrega múltiplas consultas ao Supabase.
- O e-mail do administrador está duplicado no frontend e no SQL.
- Imagens antigas removidas do formulário são excluídas do Storage; o sistema não cria registros históricos dessas exclusões.
- APIs públicas podem responder lentamente ou falhar.
- `confirm()` e `alert()` do navegador são usados para confirmações e mensagens.
- O HTML de resenha e comentário é interpretado como texto simples por meio de escape.
- Cadastro, confirmação e recuperação por e-mail dependem dos provedores, templates, URLs permitidos e serviço de e-mail do Supabase.

## Solução de problemas

### Mensagem de dependência ausente

Verifique:

- acesso à internet;
- bloqueios de CDN;
- console do navegador;
- ordem de scripts em `index.html`.

### Erro ao conectar ao Supabase

Confira:

- URL do projeto;
- chave publicável;
- projeto ativo;
- execução do arquivo SQL;
- configuração de autenticação.

### Usuário não aparece no painel

O perfil é criado em `perfis_clube` durante cadastro ou login. Confira se o usuário possui um perfil e se a política de inserção permite a operação.

### Link de confirmação ou recuperação não retorna ao site

- Abra o site por HTTP/HTTPS, não por `file://`.
- Confira se o endereço completo usado pelo site está em `Authentication > URL Configuration > Redirect URLs`.
- Confirme o `Site URL`, os templates de e-mail e o envio de mensagens do projeto Supabase.
- Para desenvolvimento local, permita o endereço e a porta usados pelo servidor local, por exemplo `http://localhost:5500/`.

### E-mail de confirmação ou redefinição não chega

Confira a pasta de spam, o template do e-mail, os limites de envio e a configuração do provedor de e-mail do projeto Supabase. O aplicativo não envia essas mensagens diretamente.

### Senha rejeitada

Use pelo menos 8 caracteres, com uma letra maiúscula, uma minúscula e um número. Se a senha atende a esses requisitos e ainda é recusada, verifique a política configurada em `Authentication` no Supabase.

### Usuário não consegue publicar resenha

Confira:

- login ativo;
- `pode_publicar_resenha = true`;
- e-mail não correspondente ao administrador;
- políticas RLS da tabela `encontros`;
- perfil carregado corretamente.

### Erro ao enviar foto

Confira:

- usuário autenticado;
- formato JPG, PNG ou WebP;
- imagem com até 10 MB antes da compressão;
- bucket `fotos-clube` existente e público para fotos de encontros;
- bucket privado `fotos-perfis-clube` existente para fotos de perfil;
- políticas de Storage;
- limite de tamanho configurado no provedor;
- suporte do navegador à compressão de imagens;
- mensagem de erro e prévia exibidas junto ao campo de foto no perfil.

### Administração não aparece

O e-mail deve corresponder exatamente à configuração em `config.js`, sem diferenças de caixa. Confira também o projeto Supabase usado pelo cliente.

### Guia não carrega

Crie o registro do guia pelo painel administrativo ou execute um `upsert` com `id = 1`.

### Nenhum livro encontrado na busca

Teste outro título ou autor. Open Library, Gutendex e OpenAlex podem não catalogar o termo pesquisado.
