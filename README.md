<p align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge" alt="Build" />
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node" />
</p>

<br />

<h1 align="center">🎓 EduSaaS API</h1>
<p align="center">Plataforma SaaS de gestão educacional — backend completo em NestJS</p>

---

## 📋 Sobre o Projeto

O **EduSaaS API** é o backend de uma plataforma SaaS voltada para a gestão completa de escolas privadas. Cada escola se cadastra de forma independente, recebe um período de trial de 14 dias e, ao final, pode assinar o plano Pro com pagamento recorrente via **Asaas**.

A API gerencia turmas, alunos, notas, frequência, finanças, notificações e muito mais — com segurança, isolamento por escola e controle de acesso baseado em papéis (RBAC).

---

## ✨ Funcionalidades

- 🏫 **Multi-tenant** — cada escola tem seus dados completamente isolados
- 🔐 **Autenticação JWT** com recuperação de senha por e-mail
- 🆓 **Trial de 14 dias** ativado automaticamente no cadastro
- 💳 **Pagamentos recorrentes** via Asaas (PIX, Boleto, Cartão de Crédito)
- 📚 **Gestão de turmas e disciplinas**
- 📊 **Lançamento e consulta de notas**
- 📅 **Controle de frequência** — individual e em lote
- 💰 **Módulo financeiro** — mensalidades e fluxo de caixa
- 🔔 **Notificações** internas por escola
- 📈 **Métricas** consolidadas em dashboard
- 📧 **E-mails transacionais** via Resend (boas-vindas, recuperação de senha, alerta de trial)
- 🛡️ **Rate limiting**, **Helmet** e validação de webhook

---

## 🛠️ Stack Tecnológica

<p>
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeORM-FF6C37?style=for-the-badge&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Resend-000000?style=for-the-badge&logoColor=white" />
  <img src="https://img.shields.io/badge/Helmet.js-333333?style=for-the-badge&logoColor=white" />
  <img src="https://img.shields.io/badge/bcrypt-003A70?style=for-the-badge&logoColor=white" />
</p>

| Camada | Tecnologia |
|---|---|
| Framework | NestJS 10 |
| Linguagem | TypeScript 5 |
| ORM | TypeORM |
| Banco de dados | MySQL 8 |
| Autenticação | JWT + Passport |
| Pagamentos | Asaas (sandbox / produção) |
| E-mail | Resend |
| Hash de senha | bcrypt |
| Segurança HTTP | Helmet |
| Rate Limiting | @nestjs/throttler |
| Agendamentos | @nestjs/schedule |

---

## 🏗️ Arquitetura

A aplicação é dividida em módulos independentes seguindo os princípios do NestJS:

```
src/
├── auth/           # Autenticação, registro, JWT, recuperação de senha
├── users/          # Gestão de usuários (diretor, professor, secretaria)
├── schools/        # Entidade escola, controle de trial e plano
├── asaas/          # Integração Asaas: clientes, assinaturas, webhook
├── classes/        # Turmas e disciplinas
├── grades/         # Notas por aluno e disciplina
├── attendance/     # Frequência individual e em lote
├── finance/        # Mensalidades e fluxo de caixa
├── notifications/  # Notificações internas por escola
├── metrics/        # Dashboard com métricas consolidadas
├── mail/           # E-mails transacionais via Resend
└── common/         # Guards, decorators e utilitários compartilhados
```

### Fluxo de acesso por plano

```
Cadastro → Trial 14 dias → [SchoolAccessGuard]
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
         trial + válido        active           overdue/cancelled
         ✅ Acesso OK         ✅ Acesso OK       ❌ HTTP 402
```

### Fluxo de pagamento (Asaas)

```
register() ──► createCustomer() ──► asaasCustomerId salvo
                                           │
                                  createSubscription()
                                           │
                               Webhook ──► PAYMENT_CONFIRMED
                                           │
                                  planStatus = 'active'
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js >= 18
- MySQL 8 rodando localmente ou via Docker
- Conta no [Asaas](https://asaas.com) (sandbox disponível gratuitamente)
- Conta no [Resend](https://resend.com) para envio de e-mails

### 1. Clone o repositório

```bash
git clone https://github.com/wallacearaujo/edusaas-api.git
cd edusaas-api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com seus valores locais:

```bash
cp .env.example .env
```

> ⚠️ O arquivo `.env` **nunca é commitado**. Ele está no `.gitignore`. Apenas o `.env.example` (sem valores reais) vai para o repositório.

### 4. Inicie o servidor em modo desenvolvimento

```bash
npm run start:dev
```

A API estará disponível em `http://localhost:3000`.

---

## 🔑 Variáveis de Ambiente

Todas as variáveis necessárias estão no arquivo [.env.example](.env.example). Abaixo a descrição de cada uma:

| Variável | Descrição |
|---|---|
| `DB_HOST` | Host do banco de dados MySQL |
| `DB_PORT` | Porta do MySQL (padrão: `3306`) |
| `DB_USERNAME` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |
| `DB_DATABASE` | Nome do banco de dados |
| `JWT_SECRET` | Chave secreta para assinar tokens JWT |
| `JWT_EXPIRES_IN` | Tempo de expiração do token (ex: `1d`, `7d`) |
| `MAIL_USER` | Usuário remetente dos e-mails |
| `MAIL_FROM` | Endereço "De:" nos e-mails enviados |
| `RESEND_API_KEY` | Chave de API do Resend para envio de e-mails |
| `FRONTEND_URL` | URL do frontend (usado em links nos e-mails) |
| `TRIAL_DAYS` | Duração do trial em dias (padrão: `14`) |
| `ASAAS_API_KEY` | Chave de API do Asaas (sandbox ou produção) |
| `ASAAS_WEBHOOK_TOKEN` | Token para validar requisições recebidas do Asaas |
| `ASAAS_API_URL` | URL base da API do Asaas |

---

## 📡 Endpoints da API

### Autenticação

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Cadastro de escola + diretor | ❌ |
| `POST` | `/auth/login` | Login e geração de token JWT | ❌ |
| `POST` | `/auth/forgot-password` | Solicitar link de recuperação de senha | ❌ |
| `POST` | `/auth/reset-password` | Redefinir senha via token | ❌ |

### Usuários

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `GET` | `/users` | Listar usuários da escola | ✅ |
| `POST` | `/users` | Criar usuário (professor, secretaria) | ✅ |

### Turmas e Disciplinas

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `GET` | `/classes` | Listar turmas da escola | ✅ |
| `POST` | `/classes` | Criar turma | ✅ |
| `POST` | `/classes/:id/subjects` | Adicionar disciplina à turma | ✅ |

### Notas

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `POST` | `/grades` | Lançar nota | ✅ |
| `GET` | `/grades` | Consultar notas | ✅ |

### Frequência

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `POST` | `/attendance` | Registrar frequência | ✅ |
| `POST` | `/attendance/bulk` | Frequência em lote | ✅ |

### Financeiro

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `GET` | `/finance/tuitions` | Listar mensalidades | ✅ |
| `POST` | `/finance/tuitions` | Criar mensalidade | ✅ |
| `GET` | `/finance/cashflow` | Consultar fluxo de caixa | ✅ |
| `POST` | `/finance/cashflow` | Lançar entrada/saída | ✅ |

### Notificações e Métricas

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `GET` | `/notifications` | Listar notificações | ✅ |
| `POST` | `/notifications` | Criar notificação | ✅ |
| `GET` | `/metrics` | Dashboard de métricas | ✅ |

### Webhook

| Método | Endpoint | Descrição | Auth |
|---|---|---|---|
| `POST` | `/asaas/webhook` | Receber eventos do Asaas | Header token |

> **Auth ✅** = requer `Authorization: Bearer <token>` no header.

---

## 🛡️ Segurança

### JWT
Todos os endpoints protegidos exigem um token JWT válido no header `Authorization: Bearer <token>`. O token é gerado no login e contém `userId`, `schoolId` e `role`.

### Rate Limiting
Implementado via `@nestjs/throttler`:
- **Endpoints de auth** (`login`, `register`, `forgot-password`, `reset-password`): máximo **10 requests por minuto** por IP
- **Demais endpoints**: limite global de 100 req/min
- **Webhook do Asaas**: sem limite (`@SkipThrottle`)

### Helmet
Headers de segurança HTTP configurados com `helmet()`, incluindo `Content-Security-Policy`, `X-Frame-Options` e `X-Content-Type-Options`.

### Validação de Webhook
O endpoint `/asaas/webhook` valida o header `asaas-access-token` contra a variável de ambiente `ASAAS_WEBHOOK_TOKEN`. Requisições sem token válido recebem `401 Unauthorized`.

### bcrypt
Senhas são armazenadas com hash `bcrypt`. A comparação usa tempo constante para evitar timing attacks.

### CORS
Whitelist restrita de origens permitidas — apenas o domínio do frontend em produção e `localhost` em desenvolvimento.

### Guard de Plano
O `SchoolAccessGuard` bloqueia o acesso a qualquer endpoint autenticado caso o plano da escola esteja `overdue` ou `cancelled`, retornando `402 Payment Required`.

---

## ☁️ Deploy

### API — Render

1. Crie um novo **Web Service** no [Render](https://render.com)
2. Conecte o repositório GitHub
3. Defina o comando de build: `npm run build`
4. Defina o comando de start: `node dist/main`
5. Configure todas as variáveis de ambiente no painel do Render

### Banco de dados — Railway

1. Crie um novo projeto no [Railway](https://railway.app)
2. Adicione o plugin **MySQL**
3. Copie as credenciais geradas e preencha as variáveis `DB_*` no Render

> O TypeORM está configurado com `synchronize: true` — as tabelas são criadas automaticamente. Para produção, considere migrar para `migrations`.

---

## 🗺️ Roadmap

### Concluído ✅

- [x] Autenticação JWT com registro de escola
- [x] Recuperação de senha por e-mail
- [x] Trial de 14 dias automático
- [x] Integração com Asaas (clientes + assinaturas recorrentes)
- [x] Webhook do Asaas com validação de token
- [x] Gestão de turmas, disciplinas, notas e frequência
- [x] Módulo financeiro (mensalidades + fluxo de caixa)
- [x] Notificações internas
- [x] Métricas consolidadas
- [x] E-mails transacionais via Resend
- [x] Rate limiting e Helmet
- [x] Guard de acesso por plano (402 para inadimplentes)

### Próximos passos 🔜

- [ ] Painel de administração (super-admin) para gerenciar escolas
- [ ] Upload de foto de perfil (alunos e professores)
- [ ] Relatório de frequência em PDF
- [ ] Boletim escolar em PDF
- [ ] Notificações push via Firebase
- [ ] Suporte a múltiplos planos (Basic, Pro, Enterprise)
- [ ] Migrar `synchronize: true` para migrations do TypeORM
- [ ] Testes e2e com Supertest
- [ ] Documentação automática com Swagger/OpenAPI

---

## 👤 Autor

**Wallace Araujo**

<p>
  <a href="https://github.com/wallacearaujo">
    <img src="https://img.shields.io/badge/GitHub-wallacearaujo-181717?style=for-the-badge&logo=github&logoColor=white" />
  </a>
</p>

---

<p align="center">Feito com ☕ e muito TypeScript</p>
