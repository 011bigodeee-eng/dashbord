# MD Nation — Personal Performance OS

Sua operação. Seus alunos. Sua evolução.

Aplicativo de gestão para personal trainers, com interface escura, gráficos interativos e operações persistidas em PostgreSQL. A demonstração usa somente dados fictícios e está identificada em todas as telas.

## Executar localmente

Requisitos: Node.js 22.12+ (validado com Node 24), npm e Docker para o PostgreSQL local. Para banco gerenciado, configure `DATABASE_URL` e dispense o Docker.

```bash
bash scripts/setup-local.sh
npm run dev
```

Abra a porta 3000 e escolha **Acessar demonstração**. O script preserva um `.env` existente, gera um segredo de sessão aleatório para novas instalações, instala o lockfile, prepara o banco e executa o seed somente quando `DEMO_MODE=true`. O seed é idempotente: não apaga alterações da demonstração.

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

A identidade pública usa a marca **MD Nation** e a logo original fornecida pelo responsável, armazenada em `public/brand/logo.jpg`. Nome e textos da marca ficam centralizados em `lib/brand.ts`. Os identificadores internos de sessão, banco e variáveis `PULSE_*` permanecem compatíveis com as instalações existentes.

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
npm test                   # 4 testes de métricas e validação
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
um novo deploy. As migrações e o seed não são executados automaticamente pelo
build da Vercel.

Um 404 padrão da plataforma, sem invocações de função, indica que se deve conferir
o framework, a raiz e a saída do deploy. Falhas de conexão com banco ou de login
devem ser investigadas nos logs das funções depois que o Next.js estiver servido.

## Ambiente de nuvem e persistência

A tarefa já usa checkout isolado em `/workspace/dashbord`; não é necessário criar worktree. Dependências e arquivos são retidos, processos precisam ser reiniciados. `scripts/local-db.sh` inicia o container e aguarda prontidão. `scripts/snapshot-db.sh` salva um dump ignorado pelo Git em `.local/cloud-snapshot.sql`; se um novo daemon Docker não contiver o banco, o script local pode restaurar esse snapshot. Gere novo dump antes de publicar uma nova configuração de ambiente. O snapshot não substitui backups regulares ou um PostgreSQL gerenciado em produção. Restauração em nova tarefa ainda precisa ser verificada após publicação pela plataforma.

## Próximas etapas de produto

A versão cobre os fluxos centrais, mas não representa todo o escopo comercial final. Permanecem a normalização completa do domínio, recuperação de senha/MFA, notificações externas, relatórios avançados de retenção por coorte, evolução de cargas em gráfico dedicado, metas personalizadas e biblioteca de exercícios editável. Recursos de saúde não substituem avaliação profissional. Integrações bancárias, e-mail e storage externo exigem escolha de provedor e credenciais próprias.
