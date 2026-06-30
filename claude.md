# EduSaaS — Contexto do Projeto

## Stack
- Backend: NestJS + TypeORM + PostgreSQL (Supabase) — `edusaas-api`
- Frontend: Next.js 14 + Tailwind + Shadcn/ui — `edusaas-web`
- Deploy: Render (API) + Vercel (Web)

## URLs
- API prod: https://edusaas-api-tbig.onrender.com
- Web prod: https://edusaas-web-xi.vercel.app
- Supabase: xxrxxxhqoofwfifacndm (sa-east-1 São Paulo)

---

## Regras CRÍTICAS — PostgreSQL (nunca ignorar)

1. Placeholders: `$1`, `$2`, `$3` — NUNCA usar `?`
2. Colunas camelCase em raw SQL com aspas: `"schoolId"`, `"studentId"`, `"classId"`
3. Tabelas reservadas com aspas: `"user"`, `"notification"`
4. Tipos nas Entities: `timestamp` — NUNCA `datetime`
5. Funções de data: `NOW()` — NUNCA `datetime('now')`
6. `extra: { family: 4 }` no TypeOrmModule — OBRIGATÓRIO para IPv4 no Render

## Conexão Supabase (app.module.ts)
```ts
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get('DATABASE_URL'),
    synchronize: true,
    logging: false,
    autoLoadEntities: true,
    ssl: { rejectUnauthorized: false },
    extra: { family: 4 },
  }),
  inject: [ConfigService],
})
```

DATABASE_URL:
`postgresql://postgres:zx0NYghGNEx8q3uW@db.xxrxxxhqoofwfifacndm.supabase.co:5432/postgres`

---

## Roles e Dashboards

| Role | Dashboard |
|------|-----------|
| director | /dashboard/diretor/* |
| coordinator | /dashboard/coordenador/* |
| secretary | /dashboard/secretaria/* |
| teacher | /dashboard/professor/* |
| student | /dashboard/aluno/* |

## Credenciais Demo — Colégio Horizonte

| Papel | Email | Senha |
|-------|-------|-------|
| Diretora | diretora@escolanovohorizonte.com.br | Horizonte@2026 |
| Coordenadora | patricia.sousa@horizonte.com | Horizonte@2026 |
| Secretaria | marcos.oliveira@horizonte.com | Horizonte@2026 |
| Aluno | sophia.ferreira@aluno.horizonte.com | Aluno@2026 |

---

## Endpoints de Manutenção

```bash
GET /seed/sync?token=seed-horizonte-2026      # sincroniza schema
GET /seed/demo?token=seed-horizonte-2026      # popula dados (idempotente)
GET /seed/reset-director?token=seed-horizonte-2026  # reseta senha diretora
GET /seed/db-info?token=seed-horizonte-2026   # diagnóstico banco
```

## Dados do Seed Demo
- 25 alunos (com CPF, phone, endereço, responsável)
- 4 turmas: 6ºA, 7ºA, 8ºA, 9ºA
- 12 disciplinas, 200 notas, 2200 chamadas
- 7 usuários de equipe

---

## Estrutura Backend (src/)
auth/          — JWT, login, login multi-escola (/login/select-school)
users/         — entity User, CRUD
schools/       — entity School, planos
classes/       — Turmas + disciplinas
students/      — Matrícula
attendance/    — Frequência/chamada
grades/        — Notas
secretary/     — listStudents (raw SQL com camelCase)
metrics/       — dashboards diretor/coord/prof
notifications/ — avisos institucionais (CRUD completo)
feed/          — mural da escola
seed/          — SeedController
database/seeds/— demo.seed.ts (idempotente, batches de 50)
database/migrations/ — fix-email-unique-multitenancy.ts (rodar 1x via npm run db:migrate)

---

## Multi-Tenancy — Email por Escola

A unicidade de e-mail é **composta**: `UNIQUE(email, schoolId)`.
O mesmo e-mail pode existir em escolas diferentes (ex: professor que trabalha em duas escolas).

### Constraint no banco
```sql
-- Nome fixo: UQ_user_email_schoolId (criada pela migration, reconhecida pela entity)
UNIQUE (email, "schoolId")
```

### Entity (user.entity.ts)
```ts
@Entity()
@Unique('UQ_user_email_schoolId', ['email', 'schoolId'])
export class User { ... }
// email não tem mais unique: true no @Column
```

### Fluxo de Login
```
POST /auth/login  { email, password }
  ├─ 1 escola com senha correta  → { access_token, user }
  ├─ 2+ escolas, 1 bate senha   → { access_token, user }  (loga direto)
  └─ 2+ escolas, 2+ batem senha → { requiresSchoolSelection: true, schools: [...] }
                                           │
                                           ▼
                                 POST /auth/login/select-school
                                 { email, password, schoolId }
                                           └─ { access_token, user }
```

### Métodos chave em UsersService
- `findByEmailAndSchool(email, schoolId)` — busca dentro de uma escola (uso principal)
- `findAllByEmail(email)` — retorna todos os vínculos (login + forgotPassword)
- `findByEmail(email)` — **@deprecated**, mantido apenas por compatibilidade

### Forgot Password multi-escola
- Um token de reset por vínculo (userId), não por e-mail global
- Envia um e-mail separado por escola com link identificado: "Resetar senha do Colégio X"
- O token já carrega o contexto do usuário correto — reset flow inalterado

### Como rodar a migration (1x no banco)
```bash
npm run db:migrate   # verifica duplicatas, dropa UNIQUE(email), cria UNIQUE(email,schoolId)
# rodar ANTES de reiniciar a API com as novas entities
```

---

## Problemas Conhecidos → Soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| `ENETUNREACH IPv6` | Falta `family: 4` ou URL com pooler | Adicionar `extra: { family: 4 }` + usar URL direta |
| `Tenant or user not found` | DATABASE_URL apontando para região errada | Usar `db.xxrxxxhqoofwfifacndm.supabase.co` |
| `syntax error at or near GROUP` | camelCase sem aspas no raw SQL | Adicionar aspas duplas: `"studentId"` |
| `datetime not supported` | Tipo MySQL nas entities | Trocar `datetime` → `timestamp` |
| `statement timeout` | Muitos inserts na mesma transação | Usar batches de 50 via QueryBuilder |
| FK violation ao deletar user | Dependências em outras tabelas | Deletar `notification`, `feed_posts` antes |
| `Nenhum aluno encontrado` | Raw SQL com sintaxe MySQL | Corrigir `?` → `$1` e aspas em camelCase |
| `Este e-mail já está cadastrado` | Constraint composta (email, schoolId) | Esperado — mesmo email já existe NESSA escola |

---

## Checklist antes de todo commit

- [ ] Raw SQL usa `$1`/`$2` (não `?`)
- [ ] Colunas camelCase com aspas duplas no SQL
- [ ] `"user"` com aspas duplas
- [ ] Entities com `timestamp` (não `datetime`)
- [ ] `extra: { family: 4 }` no TypeOrmModule
- [ ] `npm run build` passa sem erros
- [ ] Buscas de usuário por e-mail usam `findByEmailAndSchool` ou `findAllByEmail` (nunca `findByEmail` em código novo)
