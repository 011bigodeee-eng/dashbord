# MD Nation — Personal Performance OS

## Modo temporário sem Supabase — ativo por padrão

O site agora abre **sem banco de dados, sem senha, sem `DATABASE_URL` e sem `AUTH_SECRET`**. A página inicial abre diretamente no **Studio**, sem tela de login. `/login` também redireciona para o painel. Use **Visualizar como aluno** no menu para explorar o Athlete. Essa seleção abre somente uma demonstração pública, não uma conta real.

- Os dois ambientes usam dados **fictícios**, gerados no navegador.
- Cadastros, treinos, pagamentos, avaliações, mensagens e solicitações da demonstração são salvos em `localStorage` e sobrevivem a recarregamentos nesse navegador.
- Studio e Athlete compartilham esses dados ao trocar de ambiente **no mesmo navegador**. Não há sincronização entre dispositivos, contas reais, garantia de retenção ou armazenamento seguro para informações pessoais.
- Convites reais por e-mail, login de contas reais, fotos e anexos privados ficam pausados. Nenhum dado do banco é consultado, copiado, alterado ou excluído.
- Limpar os dados do site, trocar de navegador ou usar navegação anônima separa/perde o histórico fictício local. Em Configurações, **Restaurar demonstração local** reinicia apenas a demonstração deste navegador, mediante confirmação.

Para executar:

```bash
npm ci
npm run dev
```

Na Vercel, basta publicar a `main`. Nenhuma variável é necessária neste modo. O deploy pula migrações e testa a compilação sem se conectar ao Supabase, mesmo se uma `DATABASE_URL` antiga estiver configurada. `npm run db:generate` usa uma URL fictícia apenas no subprocesso de geração de tipos: não conecta ao banco nem altera variáveis reais. A integração está temporariamente bloqueada por `databaseIntegrationEnabled=false` em `runtime.config.mjs`, inclusive se uma variável antiga `APP_MODE=database` existir na Vercel. `DEMO_MODE=false` de uma configuração anterior não bloqueia esta demonstração temporária.

`APP_MODE=standalone` torna a escolha explícita; a ausência de `APP_MODE` também ativa esse modo. Para reativar o banco, é necessário habilitar `databaseIntegrationEnabled` em `runtime.config.mjs`, definir `APP_MODE=database` no servidor e publicar um novo deploy.

```bash
npm run test:standalone   # Navegação, CRUD local, treino, feedback e reagendamento sem banco
npm test
npm run deploy:build     # Pula migrações enquanto a integração estiver bloqueada
```

Os testes de integração PostgreSQL descritos adiante só se aplicam com `APP_MODE=database` e um banco de desenvolvimento. Não são necessários para publicar a demonstração temporária. O service worker continua sem cache de respostas privadas e não há promessa de navegação offline completa.

### Reativar a integração quando o serviço voltar

1. Habilite `databaseIntegrationEnabled` em `runtime.config.mjs` e configure `APP_MODE=database`, `DATABASE_URL` e `AUTH_SECRET` para o banco correto.
2. Defina conscientemente `DEMO_MODE`/`NEXT_PUBLIC_DEMO_MODE` conforme o ambiente.
3. Faça backup do banco e um novo deploy. O build então aplica as migrações antes de compilar.
4. Contas reais voltam a usar autenticação e autorização no servidor. A seleção de perfil do modo temporário nunca é aceita como autenticação no modo de banco.

Os dados fictícios de `localStorage` **não são importados automaticamente** para o banco. A integração foi preservada, sem depender de o Supabase estar disponível agora.

## Fluxo conectado opcional

As instruções abaixo descrevem o modo `APP_MODE=database` e permanecem disponíveis para quando o serviço voltar.

Sua operação. Seus alunos. Sua evolução.

Aplicativo de gestão para personal trainers, com interface escura, gráficos interativos e operações persistidas em PostgreSQL. A demonstração usa somente dados fictícios e está identificada em todas as telas.

## Executar localmente

Requisitos gerais: Node.js 22.12+ (validado com Node 24) e npm. Docker e PostgreSQL são opcionais e só são necessários para o modo conectado; para banco gerenciado, configure `DATABASE_URL` e dispense o Docker.

```bash
bash scripts/setup-local.sh
npm run dev
```

Abra a porta 3000 e escolha **Visualizar como personal** ou **Visualizar como aluno**. O script preserva um `.env` existente e cria `APP_MODE=standalone` em novas instalações. Instala o lockfile e gera o cliente tipado sem conectar ao banco. Somente com `APP_MODE=database` prepara o PostgreSQL e executa o seed quando `DEMO_MODE=true`. O seed é idempotente: não apaga alterações da demonstração.

Alternativa manual:

```bash
cp .env.example .env
# Edite AUTH_SECRET usando um segredo aleatório com pelo menos 32 caracteres.
# Para demonstração, mantenha DEMO_MODE=true e NEXT_PUBLIC_DEMO_MODE=true.
bash scripts/local-db.sh
npm ci
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

`docker compose up -d db` também inicia um banco novo. As credenciais de `compose.yaml` são exclusivamente para desenvolvimento local. O banco só é exposto no loopback.

A identidade pública usa somente o nome **MD Nation**, em texto, sem imagem de logo. Nome e textos da marca ficam centralizados em `lib/brand.ts`. Os identificadores internos de sessão, banco e variáveis `PULSE_*` permanecem compatíveis com as instalações existentes.

## Configuração

| Variável                | Função                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | Conexão PostgreSQL do ambiente. Não compartilhe bancos de demonstração e produção.   |
| `AUTH_SECRET`           | Segredo de assinatura JWT, pelo menos 32 caracteres. Nunca versionar.                |
| `DEMO_MODE`             | `true` habilita o seed e o login público na conta fictícia. Desabilitar em uso real. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` mostra o botão de demonstração. Alterações exigem novo build.                 |
| `DEMO_PASSWORD`         | Opcional para o seed; se ausente, uma senha aleatória não divulgada é gerada.        |

Nenhuma integração bancária ou envio automático está conectado. O financeiro é manual. O WhatsApp só abre mediante ação explícita, com mensagem revisável; o sistema não confirma envio.

## Criar profissional privado

Use outro banco, configure `DEMO_MODE=false` e `NEXT_PUBLIC_DEMO_MODE=false`, e execute as migrações. Informe `PULSE_USER_EMAIL`, `PULSE_USER_NAME` e `PULSE_USER_PASSWORD` pelo ambiente seguro do terminal, depois rode:

```bash
npm run user:create
```

A senha deve ter pelo menos 12 caracteres. O comando armazena somente hash bcrypt. Não há cadastro público, recuperação de senha por e-mail ou MFA nesta versão. Use HTTPS em implantação real: cookies de produção são `Secure`, `HttpOnly` e `SameSite=Lax`. O acesso à conta demo é revogado quando `DEMO_MODE` é desabilitado. O limitador de tentativas de login é em memória; instalações com múltiplas instâncias precisam de armazenamento de rate limiting compartilhado.

## Funcionalidades

- **Dashboard:** indicadores calculados a partir do banco, períodos de crescimento, comparação histórica, distribuição por objetivos, receita, próximas sessões, alertas, consistência e atividade recente.
- **Alunos:** cadastro, edição, arquivamento/reativação, busca, filtros, ordenação, paginação e perfil com abas privadas. Arquivar preserva o histórico.
- **Treinos:** prescrição por aluno, divisão, exercícios, séries, repetições, carga, descanso, tempo e observações. Reordenação por drag and drop, duplicação, biblioteca pesquisável e histórico de versões ao editar.
- **Evolução e avaliações:** medidas informadas, gráficos por aluno/período, registros editáveis, próximas avaliações e anexos privados. Nenhum diagnóstico ou percentual de gordura é inferido automaticamente.
- **Fotos:** upload de JPEG/PNG/WebP com consentimento explícito, comparação com slider, datas e exclusão confirmada. Arquivos persistidos no banco, com acesso autenticado e verificação de proprietário em cada leitura. Não existem fotos fictícias de transformação.
- **Agenda:** dia/semana/mês, criação, edição, reagendamento, conclusão, ausência e cancelamento. A transação serializa gravações por profissional para detectar conflitos simultâneos.
- **Check-ins:** registro de treino concluído, histórico e consistência mensal.
- **Financeiro:** recebimentos manuais, pendências, edição, marcação de recebimento, filtros e CSV.
- **Planos:** criação, edição, status, valores, frequência e alunos vinculados.
- **Comunicação:** anotações, lembretes, modelos e abertura explícita do WhatsApp.
- **Relatórios:** seleção de período, totais calculados e CSV. PDF pelo diálogo de impressão do navegador, com CSS de impressão; não há geração de PDF assíncrona no servidor.
- **Interface:** busca global (`Ctrl/Cmd K`), menu recolhível, navegação mobile, modais acessíveis Radix, validação React Hook Form/Zod, feedback, estados vazios e redução de movimento.

Os filtros de período dos relatórios afetam os totais e a exportação. Os gráficos identificados como “base atual” ou “últimos 12 meses” mantêm explicitamente esse contexto. Presença considera sessões finalizadas (`Concluído` e `Ausente`); agendamentos futuros não reduzem a taxa. Aderência no ranking considera treinos registrados dividido pela meta mensal do plano (frequência semanal × semanas do mês); sem frequência definida, não se inventa percentual.

## Arquitetura e dados

Next.js App Router, React, TypeScript, Tailwind CSS 4, componentes no padrão shadcn com Radix/CVA, Lucide, Recharts e Motion. Prisma 6 com adaptador `pg` e compilador JavaScript, PostgreSQL 17. Fontes e fotografia de academia ficam locais, sem dependência de CDN em tempo de execução. A imagem de ambiente fitness foi gerada para o projeto.

A primeira versão usa um armazenamento de registros tipados em JSONB: `User` → `Record` (`student`, `training`, `assessment`, `appointment`, `payment`, `service`, `workout`, `note`, `profile`, `activity`, `trainingHistory`) e `PrivateFile`. Os schemas Zod validam cada tipo no servidor. Todas as consultas e alterações são limitadas por `trainerId`, e referências a alunos/treinos são verificadas no servidor. Índices compostos e chaves estrangeiras protegem a propriedade dos registros/arquivos. A normalização das entidades de domínio em tabelas dedicadas é uma evolução de arquitetura ainda pendente; não se apresenta este modelo como a modelagem relacional integral do briefing.

Migrações SQL versionadas em `prisma/migrations` são aplicadas pelo runner transacional `scripts/migrate.ts`, com lock e SHA-256 para detectar alteração de migrações já executadas. O CLI Prisma usa seu schema engine WASM (`experimental.adapter` no Prisma 6) para gerar o cliente sem baixar binários nativos. O runner PostgreSQL evita uma limitação de introspecção do adaptador no `prisma db push`. Use **`npm run db:migrate`**, não `npx prisma db push`. Teste migrações em homologação e faça backup antes de alterações em produção.

Arquivos privados são limitados a 5 MB e validados por assinatura de formato. O armazenamento em BYTEA é adequado ao volume inicial; para escalar, migrar para object storage privado, implementar quotas e varredura de anexos. Backups do banco incluem dados sensíveis: restrinja acesso, criptografe no provedor e defina políticas de retenção e consentimento antes de uso com alunos reais. Não cadastre dados reais na demonstração pública.

## Validação

Com o aplicativo iniciado:

```bash
npm test                   # 5 testes de métricas, validação e duração
npm run test:integration    # CRUD, autorização, conflito concorrente e arquivos privados
npm run test:ui             # Login, cadastro, treinos, pagamento, rotas e mobile
npm run test:browser        # Capturas desktop/mobile e verificação de overflow
npm run typecheck
npm run build
```

Os testes de integração e interface criam profissionais temporários separados e os removem no `finally`. Usam `PULSE_TEST_BASE_URL` quando configurada, ou a porta 3000. Execute somente contra banco de desenvolvimento. Os testes de navegador usam Playwright com Chromium disponibilizado pelo pacote `@sparticuz/chromium`, adequado ao Linux da nuvem; em outras plataformas use o Chromium oficial do Playwright ajustando o caminho do executável. Capturas são gravadas em `/tmp/pulse-desktop.png` e `/tmp/pulse-mobile.png`.

Não execute `next build` e `next dev` simultaneamente no mesmo checkout. Para produção:

```bash
npm run build
npm start
```

## Deploy na Vercel

O arquivo `vercel.json` define explicitamente o framework Next.js, a instalação,
o build e a saída `.next`. Isso evita um deploy estático com erro 404 quando o
projeto Vercel foi importado antes de existir código no repositório.

Em **Settings → Build and Deployment**, mantenha **Root Directory** vazio
(raiz do repositório). Não use `dashbord`: esse é o nome do checkout local,
e o `package.json` já está na raiz do Git. O preset é **Next.js**; não use
**Other**, saída `public` ou `out`, nem `scripts/setup-local.sh` como build.
Depois de atualizar essas configurações, faça um novo deploy da `main`.

A Vercel não executa o container Docker deste ambiente. Para usar os cadastros
e o login, configure um PostgreSQL gerenciado e, em **Settings → Environment
Variables**, defina `DATABASE_URL` e um `AUTH_SECRET` aleatório de pelo menos
32 caracteres. Não use a conexão `localhost` do exemplo nem coloque segredos
no Git. Para produção privada, defina `DEMO_MODE=false` e
`NEXT_PUBLIC_DEMO_MODE=false`.

Execute `npm run db:migrate` em um terminal seguro conectado ao banco de destino
e crie seu profissional com `npm run user:create`, conforme as instruções acima.
Para publicar uma demonstração, use um banco separado, habilite as duas variáveis
de demonstração e execute o seed contra esse banco. Alterações de variáveis exigem
um novo deploy. Somente com `APP_MODE=database`, o build da Vercel aplica as migrações SQL antes de compilar; no modo temporário, elas são puladas. O seed não é executado automaticamente.

Um 404 padrão da plataforma, sem invocações de função, indica que se deve conferir
o framework, a raiz e a saída do deploy. Falhas de conexão com banco ou de login
devem ser investigadas nos logs das funções depois que o Next.js estiver servido.

## Ambiente de nuvem e persistência

A tarefa já usa checkout isolado em `/workspace/dashbord`; não é necessário criar worktree. Dependências e arquivos são retidos, processos precisam ser reiniciados. `scripts/local-db.sh` inicia o container e aguarda prontidão. Em `APP_MODE=database`, `scripts/snapshot-db.sh` salva um dump ignorado pelo Git em `.local/cloud-snapshot.sql`; se um novo daemon Docker não contiver o banco, o script local pode restaurar esse snapshot. Gere novo dump antes de publicar uma nova configuração de ambiente. O snapshot não substitui backups regulares ou um PostgreSQL gerenciado em produção. Restauração em nova tarefa ainda precisa ser verificada após publicação pela plataforma.

## Próximas etapas de produto

A versão cobre os fluxos centrais, mas não representa todo o escopo comercial final. Permanecem a normalização completa do domínio, recuperação de senha/MFA, notificações push e automações externas, relatórios avançados de retenção por coorte, metas personalizadas e biblioteca de exercícios editável. Recursos de saúde não substituem avaliação profissional. Integrações bancárias e storage externo exigem escolha de provedor e credenciais próprias. O envio opcional de convites por e-mail usa Resend e exige configuração descrita abaixo.

## Studio + Athlete: dois ambientes, um banco

A identidade pública continua **MD Nation**, somente em texto. O painel do profissional é o **Studio** (`/`); o portal mobile do aluno é o **Athlete** (`/athlete`). Não são dois projetos separados.

### Atualizar uma instalação existente

Faça backup do banco de destino e aplique **antes do novo deploy**:

```bash
npm ci
npx prisma generate
npm run db:migrate
```

A migração `202610250003_athlete` adiciona papéis e tabelas do portal sem apagar os registros existentes. Contas antigas recebem `TRAINER`. Execute com a `DATABASE_URL` do banco correto em um terminal seguro. O `vercel.json` usa `npm run deploy:build`: em `APP_MODE=database`, primeiro aplica as migrações e depois compila o Next.js; no modo temporário padrão, apenas compila. A nova versão só deve ser promovida quando ambos terminarem com sucesso. Configure `DATABASE_URL` para o banco de destino e use bancos separados para Production e Preview. Sem conexão válida, o build falha em vez de publicar uma aplicação incompatível com o schema antigo. O banco deste ambiente não é o banco Supabase de produção. O comando `npm run build` isolado continua sem aplicar migrações.

Para o modo demonstrativo, rode `npm run db:seed` com `DEMO_MODE=true`. O seed prepara um profissional e o aluno fictício Rafael Martins, preservando os dados existentes. A página de login oferece **Visualizar como personal** e **Visualizar como aluno**; há também troca autorizada entre os ambientes de demonstração. Esses atalhos só funcionam com `DEMO_MODE=true` no servidor, e contas demonstrativas são bloqueadas com o modo desabilitado. Não cadastre dados reais nas contas compartilhadas.

### Convidar um aluno real

1. Entre na conta privada do personal e cadastre um aluno ativo.
2. Abra **Portal dos Alunos → Acessos → Convidar por e-mail**.
3. Informe o e-mail do aluno e gere o convite. O link é individual, válido por 72 horas e utilizável uma única vez. Renovar revoga convites anteriores ainda não utilizados.
4. Sem serviço de e-mail configurado, copie o link e compartilhe-o por um canal privado. A interface informa explicitamente que nenhum e-mail foi enviado.
5. O aluno abre `/convite/<token>`, confirma a própria senha (mínimo de 12 caracteres) e entra no Athlete. O personal não define nem recebe a senha do aluno.
6. Ative/desative acessos na mesma tela. Desativar o acesso ou arquivar o cadastro impede imediatamente novas requisições, inclusive de sessões que já estavam abertas. Reativar o acesso exige também que o aluno esteja ativo.

Tokens de convite são armazenados apenas como SHA-256. O link completo é uma credencial temporária: não publique em logs, capturas, canais públicos ou no Git. O sistema não vincula um convite a um e-mail já utilizado por outra conta.

### Envio opcional por e-mail

Configure no servidor/Vercel:

| Variável         | Finalidade                                                     |
| ---------------- | -------------------------------------------------------------- |
| `RESEND_API_KEY` | Chave privada do Resend, nunca `NEXT_PUBLIC_*`.                |
| `EMAIL_FROM`     | Remetente autorizado em um domínio verificado no Resend.       |
| `APP_URL`        | URL HTTPS pública do aplicativo, usada nos links dos convites. |

Não são necessárias chaves da API do Supabase para esses fluxos: o aplicativo usa PostgreSQL via Prisma. A ação de gerar convite solicita o envio ao Resend somente quando as três configurações existem e a conta do profissional não é demonstrativa. Contas demo nunca enviam e-mails reais. A interface distingue **link para compartilhar**, **aceito pelo provedor** e **falha no envio**. Aceitação pelo provedor não confirma entrega ao destinatário. Sem credenciais, o compartilhamento manual continua funcional. O envio real por Resend não foi validado neste ambiente sem credenciais do provedor.

### Fluxos integrados

- **Prescrição:** atribua/edite fichas na tela existente ou em Portal dos Alunos → Fichas e avaliações. O Athlete exibe apenas fichas do próprio aluno, sem controles para editar a prescrição. Cada execução mantém um snapshot da versão utilizada.
- **Execução:** cargas, repetições e séries realizadas são gravadas no servidor; a sessão pode ser pausada e retomada após recarregar a página. Cronômetro de descanso é local; duração da sessão é calculada no servidor, descontando pausas. Há estado de salvamento, erro e tentativa manual de salvar. Finalizar exige ao menos uma série concluída e admite execução parcial, identificada no histórico. A conclusão é transacional e idempotente: um único check-in atualiza os indicadores do personal.
- **Avaliações:** são privadas por padrão. O personal escolhe campos publicados por avaliação; desmarcar todos oculta a avaliação. Data é mostrada quando há publicação. Observações privadas, financeiro e anotações internas nunca são incluídos na API do aluno.
- **Evolução:** gráficos de medidas autorizadas, frequência e maior carga efetivamente utilizada por sessão, com seleção de período. Não há resultados físicos inventados ou diagnóstico automático. Fotos são mostradas somente quando vinculadas ao próprio aluno e com consentimento registrado. O aluno não pode baixar fotos de outra pessoa nem documentos privados do personal.
- **Agenda:** o aluno solicita data/horário e acompanha o status. A sessão original não muda até a aprovação do personal. Aprovação verifica conflitos dentro de transação; recusa mantém a agenda e registra a resposta.
- **Comunicação:** o personal publica orientações, avisos e lembretes. O aluno marca mensagens como lidas, acessa o WhatsApp explicitamente quando o telefone foi compartilhado e envia feedback/esforço percebido dos treinos. Não há WhatsApp ou mensagens automáticas simuladas.
- **Sincronização:** dados e atividades são consultados a cada 30 segundos quando a página está visível, além da atualização após cada ação. Não é anunciado tempo real via WebSocket. O dashboard exibe atividade do Athlete e acesso rápido às solicitações.

### Papéis e isolamento

`UserRole` contém `TRAINER`, `STUDENT` e `ADMIN`. `StudentAccess` vincula uma conta de aluno a um cadastro e ao profissional responsável. `/api/athlete` é exclusivo de alunos; APIs administrativas exigem profissional. Autorização acontece no servidor, tanto na leitura quanto em cada alteração. O papel vem do banco, não de parâmetros ou filtros do navegador. Um convite nunca cria um profissional.

`ADMIN` fica desabilitado por padrão. `ADMIN_ACCESS_ENABLED=true` permite autenticar uma conta administrativa provisionada fora do aplicativo, mas não libera acesso automático a dados de outros profissionais: a administração geral e o faturamento SaaS continuam como evolução futura. Não existe endpoint público para alterar papéis. Cada profissional continua isolado por `trainerId`; não há assinatura comercial SaaS ou integração bancária nova nesta versão.

As novas entidades relacionais são `StudentAccess`, `PortalInvitation`, `WorkoutSession`, `AssessmentShare`, `PortalMessage` e `RescheduleRequest`. O domínio administrativo existente mantém o armazenamento JSONB validado. A arquitetura permite múltiplos profissionais, mas cada conta de aluno pertence a um único vínculo nesta versão.

### Instalação mobile e conectividade

O Athlete inclui manifest, ícones tipográficos com o nome MD Nation e service worker de rede, sem cache de respostas privadas. Em navegadores compatíveis pode ser adicionado à tela inicial; o botão só aparece quando o navegador disponibiliza a instalação. No iOS, use o menu Compartilhar → Adicionar à Tela de Início.

**Não há suporte offline completo nem sincronização em segundo plano.** A execução e os registros exigem internet. O portal mostra aviso ao perder conexão; dados ainda não confirmados precisam de nova tentativa de salvamento. Retomar uma sessão recupera o último progresso confirmado no servidor. Não há push notifications ou e-mails de lembrete automáticos.

### Testar a expansão

Com PostgreSQL migrado e o servidor iniciado, em banco de desenvolvimento:

```bash
npm run test:portal       # Convites, papéis, privacidade, execução e reagendamentos
npm run test:portal:ui    # Fluxo mobile do aluno integrado à aprovação/feedback no Studio
npm run test:integration # Regressão dos fluxos administrativos
npm run test:ui
npm test
npm run typecheck
npm run build
```

Os testes criam contas isoladas e removem os próprios registros no final. O teste de interface grava capturas em `/tmp/md-athlete-home-mobile.png`, `/tmp/md-athlete-workout-mobile.png` e `/tmp/md-studio-portal.png`. A demo é separada dessas contas de teste. Não execute builds enquanto `next dev` estiver ativo no mesmo checkout.
