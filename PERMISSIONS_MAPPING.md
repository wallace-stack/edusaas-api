# Mapeamento de Permissões Granulares

> Lote 1 aplicado em `feat(permissions): lote 1 — guards aplicados`.
> Pendentes: `criar_aviso_global`, `criar_aviso_turma`, `nomear_turma`, `ver_relatorios_financeiros`, `lancar_financeiro`.

---

## Como aplicar em uma rota

```typescript
// Importar guard e decorator
import { PermissionGuard } from '../permissions/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { PermissionKey } from '../permissions/user-permission.entity';

// Na rota, adicionar @UseGuards(PermissionGuard) + @RequirePermission()
// O PermissionGuard deve vir APÓS AuthGuard('jwt') e RolesGuard
@UseGuards(AuthGuard('jwt'), SchoolAccessGuard, RolesGuard, PermissionGuard)
@Post()
@Roles(UserRole.COORDINATOR, UserRole.SECRETARY)
@RequirePermission(PermissionKey.CRIAR_AVISO_GLOBAL)
create(...) {}
```

---

## Tabela de Mapeamento

| Permissão | Label Legível | Arquivo | Método / Rota | Guards Atuais | Status |
|---|---|---|---|---|---|
| `criar_aviso_global` | Criar avisos para toda a escola | `src/notifications/notifications.controller.ts` | `POST /notifications` (quando `target` ≠ CLASS) | `@Roles(DIRECTOR, COORDINATOR, SECRETARY, TEACHER)` | Pendente aplicar |
| `criar_aviso_turma` | Criar avisos para turmas | `src/notifications/notifications.controller.ts` | `POST /notifications` (quando `target` = CLASS) | `@Roles(DIRECTOR, COORDINATOR, SECRETARY, TEACHER)` | Pendente aplicar |
| `editar_notas` | Lançar e editar notas | `src/grades/grades.controller.ts` | `POST /grades`, `POST /grades/bulk` | `@Roles(TEACHER, COORDINATOR, DIRECTOR)` | ✅ Aplicado (Lote 1) |
| `lancar_financeiro` | Lançar cobranças e pagamentos | `src/finance/finance.controller.ts` | `POST /finance/tuitions`, `PATCH /finance/tuitions/:id/pay`, `POST /finance/cashflow` | `@Roles(COORDINATOR, DIRECTOR, SECRETARY)` | Pendente (Lote 2) |
| `ver_relatorios_financeiros` | Ver relatórios financeiros | `src/finance/finance.controller.ts`, `src/metrics/metrics.controller.ts` | `GET /finance/report`, `GET /finance/defaulters`, `GET /metrics/director/financial`, `GET /metrics/director/financial/export-*` | `@Roles(DIRECTOR, SECRETARY)` / `@Roles(DIRECTOR)` | Pendente (Lote 2 — requer ajuste de @Roles) |
| `matricular_aluno` | Matricular alunos em turmas | `src/enrollment/enrollment.controller.ts` | `POST /enrollments`, `POST /enrollments/transfer`, `PATCH /enrollments/:id/transfer/:newClassId`, `DELETE /enrollments/:id` | `@Roles(DIRECTOR, COORDINATOR, SECRETARY)` | ✅ Aplicado (Lote 1) |
| `editar_aluno` | Editar dados de alunos | `src/users/users.controller.ts` | `POST /users` (role=student — indistinguível de staff a nível de rota) | `@Roles(COORDINATOR, DIRECTOR, SECRETARY)` | ⚠️ Parcial — `POST /users` coberto por `editar_usuario`; distinção aluno/staff requer service-level (próxima fase) |
| `criar_turma` | Criar novas turmas | `src/classes/classes.controller.ts` | `POST /classes` | `@Roles(COORDINATOR, DIRECTOR, SECRETARY)` | ✅ Aplicado (Lote 1) |
| `nomear_turma` | Nomear / renomear turmas | `src/classes/classes.controller.ts` | `PATCH /classes/:id` (rota ainda não existe) | `@Roles(DIRECTOR, COORDINATOR, SECRETARY)` | Pendente — criar rota `PATCH /classes/:id` antes |
| `gerenciar_professores_turma` | Atribuir professores a turmas | `src/classes/classes.controller.ts` | `POST /classes/:id/subjects` (campo teacherId), `PATCH /classes/:id/subjects/:subjectId` | `@Roles(COORDINATOR, DIRECTOR, SECRETARY)` | ⚠️ Parcial — `POST /classes/:id/subjects` coberto por `editar_materias_turma`; `PATCH` não existe ainda |
| `editar_materias_turma` | Editar matérias das turmas | `src/classes/classes.controller.ts` | `POST /classes/:id/subjects`, `DELETE /classes/:id/subjects/:subjectId` | `@Roles(DIRECTOR, COORDINATOR, SECRETARY)` | ✅ Aplicado (Lote 1) |
| `ver_chamadas_outras_turmas` | Ver chamadas de outras turmas | `src/attendance/attendance.controller.ts` | `GET /attendance/class/:classId/subject/:subjectId`, `GET /attendance/class/:classId/report` | `@Roles(TEACHER, COORDINATOR, DIRECTOR)` | ✅ Aplicado (Lote 1) — TEACHER bypassa o guard |
| `receber_caderno_planejamento` | Receber cadernos de planejamento | `src/teaching-plans/teaching-plans.controller.ts` | `GET /teaching-plans`, `GET /teaching-plans/:id`, `PATCH /teaching-plans/:id/review` | `@Roles(COORDINATOR, SECRETARY, DIRECTOR)` | ✅ Aplicado (Lote 1) |
| `configurar_modulo_infantil` | Configurar módulo infantil | `src/classes/classes.controller.ts`, `src/infantil/infantil.controller.ts` | `PATCH /classes/:id/mode`, `GET /infantil/records`, `GET /infantil/records/student/:id`, `GET /infantil/diario`, `GET /infantil/planejamento` | `@Roles(DIRECTOR, COORDINATOR, SECRETARY)` / `@Roles(TEACHER, ...)` | ✅ Aplicado (Lote 1) — TEACHER bypassa o guard |
| `editar_usuario` | Editar dados de usuários | `src/users/users.controller.ts` | `POST /users`, `GET /users`, `GET /users/:id` | `@Roles(COORDINATOR, DIRECTOR, SECRETARY)` | ✅ Aplicado (Lote 1) |
| `excluir_usuario` | Excluir / desativar usuários | `src/users/users.controller.ts` | `DELETE /users/:id` | `@Roles(COORDINATOR, DIRECTOR)` | ✅ Aplicado (Lote 1) |

---

## Observações por Permissão

### `criar_aviso_global` vs `criar_aviso_turma`
Ambas mapeiam para `POST /notifications`. A distinção é feita no **corpo da requisição**:
- `target = CLASS` → permissão `criar_aviso_turma`
- `target = ALL_SCHOOL | ALL_STUDENTS | ALL_ADMINS | SPECIFIC | DIRECTOR` → permissão `criar_aviso_global`

Implementação sugerida: validar no `NotificationsService.create()` após verificar o `dto.target`.

### `nomear_turma` vs `criar_turma` vs `editar_materias_turma`
As três mapeiam para endpoints de `ClassesController`, mas cobrem ações diferentes:
- `criar_turma` → `POST /classes`
- `nomear_turma` → campo `name` em eventual `PATCH /classes/:id` (a rota ainda não existe — a criação já inclui o nome)
- `editar_materias_turma` + `gerenciar_professores_turma` → `POST /classes/:id/subjects` / `DELETE /classes/:id/subjects/:subjectId`

Recomendação: criar um `PATCH /classes/:id` para renomear turma e aplicar `nomear_turma` nele.

### `ver_chamadas_outras_turmas`
Um professor pode ver a chamada de turmas que não são as suas. O controle atual é por `@Roles(TEACHER, ...)` sem restrição por turma. Esta permissão permite bloquear professores que não devem ver chamadas alheias.

### `receber_caderno_planejamento`
Secretaria por padrão = `true` (pode receber planejamentos dos professores). Pode ser desligado individualmente se uma secretária específica não cuida dessa função.

### `ver_relatorios_financeiros`
Parte dos endpoints está restrita a `@Roles(DIRECTOR)`. Para que uma secretária com essa permissão acesse, será necessário expandir o `@Roles()` nesses endpoints ao aplicar o guard.

---

## Próximos Passos

1. Revisar este mapeamento com o time
2. Para cada linha "Pendente aplicar":
   a. Adicionar `PermissionGuard` ao `@UseGuards()` da rota
   b. Adicionar `@RequirePermission(PermissionKey.XXXX)` ao método
   c. Atualizar o Status neste arquivo para "Aplicado"
3. Atualizar os `@Roles()` onde necessário (ex: `ver_relatorios_financeiros` para secretaria)
