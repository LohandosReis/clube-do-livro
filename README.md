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
   - indicações públicas;
   - comentários e notas públicas.

2. **Espaço autenticado**, disponível após cadastro ou login:
   - avaliação de livros;
   - comentários;
   - criação de indicações;
   - votação em indicações;
   - exclusão de conteúdo próprio;
   - publicação de resenhas individuais, quando habilitado pelo administrador.

O perfil **Admin Master** possui acesso ao painel administrativo, à manutenção dos livros e encontros, ao gerenciamento de permissões e à edição do guia.

## Funcionalidades

### Acompanhamento de leituras

- Destaque da leitura com status `atual`.
- Exibição da data, local ou horário do encontro.
- Meta textual da leitura.
- Progressão por página atual e total de páginas.
- Barra de progresso com limite máximo de 100%.
- Criação de evento no Google Agenda.
- Estatísticas gerais:
  - quantidade de livros concluídos;
  - páginas concluídas e em progresso;
  - média geral das notas.

### Catálogo e histórico

- Postagens separadas em:
  - `clube`: livros e encontros administrados pelo clube;
  - `individual`: leituras e resenhas publicadas por membros habilitados.
- Cadastro de título, autor, capa, gêneros, status, data, local, páginas, nota, contexto e discussão.
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
- Remoção individual de fotos já cadastradas.
- Edição do título e conteúdo do guia de discussão.
- Listagem de membros e alteração da permissão de publicar resenhas individuais.

### Comunidade

- Cadastro e login por e-mail e senha.
- Foto de perfil opcional no cadastro.
- Avaliação de cada livro em uma escala de 0 a 5.
- Uma avaliação por usuário em cada livro, atualizada por upsert.
- Comentários em cada livro.
- Indicação de novos livros com título, autor, gênero e justificativa.
- Voto único por membro em cada indicação.
- Ordenação das indicações pela quantidade de votos.
- Exclusão do próprio comentário ou indicação.
- O administrador também pode excluir comentários e indicações.

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
| `config.js` | Cliente Supabase, administrador mestre, gêneros, estado global e funções utilitárias. |
| `auth.js` | Perfil, sessão, login, cadastro, logout e interface de autenticação. |
| `livros-api.js` | Consultas às APIs externas e preenchimento do formulário administrativo. |
| `comunidade.js` | Avaliações, comentários, indicações e votos da comunidade. |
| `ui.js` | Gêneros, fotos, usuários administrativos, placar e renderização da interface. |
| `app.js` | Inicialização, eventos, CRUD de leituras e resenhas individuais. |
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

Como não existem etapas de build, abra `index.html` diretamente no navegador ou use um servidor HTTP local.

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

Um servidor local é recomendado, pois evita algumas diferenças de acesso e facilita o uso de recursos do navegador.

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
- cria o bucket público `fotos-clube`;
- cria as políticas de upload e exclusão de imagens.

O script foi escrito para preservar tabelas existentes e adicionar colunas quando necessário.

### 2. Configurar autenticação

No painel do Supabase:

1. Abra `Authentication`.
2. Confira a configuração de provedores.
3. Habilite `Email/Password`.
4. Configure o endereço de confirmação de cadastro conforme o domínio utilizado.
5. Em produção, configure os URLs permitidos de redirecionamento.

Por padrão, o fluxo aceita login por e-mail e senha.

### 3. Criar o primeiro usuário administrador

Cadastre no projeto Supabase uma conta com o e-mail definido em `EMAIL_ADMIN_MASTER` no arquivo `config.js`.

Depois use o botão **Admin Master** da interface para entrar.

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

Todas as entidades são públicas para leitura. Operações de escrita são protegidas por RLS.

### `perfis_clube`

Representa o perfil público de um membro.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave estrangeira do usuário em `auth.users`. |
| `email` | `text` | E-mail público exibido no painel administrativo. |
| `nome` | `text` | Nome ou apelido exibido na interface. |
| `foto_url` | `text` | URL pública da foto de perfil. |
| `pode_publicar_resenha` | `boolean` | Autoriza resenhas individuais. |
| `criado_em` | `timestamptz` | Data de criação. |

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
| `pagina_meta` | `integer` | Página atual ou meta alcançada. |
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
- `pagina_meta` não pode superar `paginas_totais`;
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

## Segurança e permissões

As tabelas usam RLS (Row Level Security). As regras principais são:

### Leitura

Todas as tabelas de conteúdo e perfis permitem leitura pública.

### Perfis

- o usuário pode criar seu próprio perfil;
- o usuário não pode inicialmente alterar sua própria autorização de resenha;
- o administrador pode alterar perfis e permissões.

### Leituras

- o administrador pode criar, editar e excluir qualquer postagem;
- um membro habilitado pode criar postagens do tipo `individual`;
- o membro só pode editar ou excluir suas próprias resenhas individuais;
- publicações do tipo `clube` não podem ser criadas por membros comuns.

### Avaliações

- qualquer pessoa pode ler;
- o usuário só pode criar ou alterar avaliações vinculadas ao próprio `usuario_id`;
- existe uma única avaliação por par usuário/livro.

### Comentários e indicações

- autenticação é necessária para criar;
- o autor pode excluir seu próprio conteúdo;
- o administrador pode excluir qualquer conteúdo.

### Fotos

O bucket `fotos-clube` é público para leitura.

- somente usuários autenticados podem enviar;
- o autor ou o administrador pode excluir um objeto;
- a exclusão chama o Storage após remoção da URL do estado local.

### Função administrativa

`clube_e_admin()` verifica o e-mail presente no JWT. Esse identificador precisa ser mantido sincronizado com `EMAIL_ADMIN_MASTER` no frontend.

## Fluxos de uso

### Cadastro de membro

1. Clicar em **Entrar / Cadastrar**.
2. Escolher **Criar Conta de Membro**.
3. Informar nome, e-mail e senha.
4. Opcionalmente enviar uma foto.
5. Aguardar confirmação de e-mail, conforme configuração do Supabase.
6. Entrar com as credenciais.

O perfil é criado ou atualizado em `perfis_clube`.

### Login administrativo

1. Clicar em **Admin Master**.
2. Informar o e-mail administrativo e a senha.
3. Após login, o sistema valida o e-mail.
4. Contas diferentes são desconectadas com uma mensagem de erro.

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
3. `carregarGuia()` busca o registro `id = 1`.
4. `carregarEncontros()` busca leituras e perfis.
5. `verificarSessao()` recupera a sessão atual.
6. `carregarComunidade()` busca avaliações, comentários, indicações e votos.

Os dados são carregados novamente após a maioria das operações de escrita.

## Interface e estilos

O tema utiliza paleta neutra com azul institucional e detalhes em verde, âmbar e roxo.

Principais componentes:

- cabeçalho fixado ao topo do fluxo da página;
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

O layout tem breakpoint em `600px` e adapta formulários, cabeçalhos e cartões para telas menores.

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
- O cadastro por e-mail depende da configuração de confirmação do Supabase.

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
- bucket `fotos-clube` existente;
- bucket público;
- políticas de Storage;
- limite de tamanho configurado no provedor;
- suporte do navegador à compressão de imagens.

### Administração não aparece

O e-mail deve corresponder exatamente à configuração em `config.js`, sem diferenças de caixa. Confira também o projeto Supabase usado pelo cliente.

### Guia não carrega

Crie o registro do guia pelo painel administrativo ou execute um `upsert` com `id = 1`.

### Nenhum livro encontrado na busca

Teste outro título ou autor. Open Library, Gutendex e OpenAlex podem não catalogar o termo pesquisado.
