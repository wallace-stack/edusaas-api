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
| Diretora | erikacarolinajunqueiradasilva@gmail.com | Horizonte@2026 |
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
auth/          — JWT, login
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

---

## Checklist antes de todo commit

- [ ] Raw SQL usa `$1`/`$2` (não `?`)
- [ ] Colunas camelCase com aspas duplas no SQL
- [ ] `"user"` com aspas duplas
- [ ] Entities com `timestamp` (não `datetime`)
- [ ] `extra: { family: 4 }` no TypeOrmModule
- [ ] `npm run build` passa sem erros