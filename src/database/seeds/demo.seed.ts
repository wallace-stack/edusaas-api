import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { School, PlanStatus } from '../../schools/school.entity';
import { SchoolPlan } from '../../plans/plan-limits';
import { User, UserRole } from '../../users/user.entity';
import { SchoolClass } from '../../classes/class.entity';
import { SchoolSubject } from '../../classes/subject.entity';
import { Enrollment, EnrollmentStatus } from '../../enrollment/enrollment.entity';
import { Grade } from '../../grades/grade.entity';
import { Attendance, AttendanceStatus } from '../../attendance/attendance.entity';
import { Notification, NotificationType, NotificationTarget } from '../../notifications/notification.entity';
import { FeedPost, FeedPostType } from '../../feed/feed-post.entity';

// Retorna dias úteis (seg–sex) dos últimos `calendarDaysBack` dias corridos, em ordem cronológica
function getWorkingDaysInRange(calendarDaysBack: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= calendarDaysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d);
  }
  return days.reverse();
}

// Retorna um Set com os índices (base-0) que devem ser marcados como falta
function buildAbsentIndices(totalDays: number, attendanceRate: number): Set<number> {
  const absentCount = totalDays - Math.round(totalDays * attendanceRate);
  const absent = new Set<number>();
  if (absentCount <= 0) return absent;
  const step = totalDays / absentCount;
  for (let i = 0; i < absentCount; i++) {
    absent.add(Math.min(Math.round(i * step + step / 2), totalDays - 1));
  }
  return absent;
}

/**
 * Demo seed — idempotente (seguro rodar múltiplas vezes).
 * Checa por escola com nome 'Colégio Horizonte' antes de inserir.
 */
export async function runDemoSeed(dataSource: DataSource): Promise<void> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // ── Idempotência ──────────────────────────────────────────────────────────
    const existingSchool = await qr.manager.findOne(School, {
      where: { name: 'Colégio Horizonte' },
    });
    if (existingSchool) {
      console.log('Demo seed já foi executado anteriormente. Pulando.');
      await qr.rollbackTransaction();
      return;
    }

    // ── Escola ────────────────────────────────────────────────────────────────
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const school = await qr.manager.save(
      School,
      qr.manager.create(School, {
        name: 'Colégio Horizonte',
        cnpj: '00.000.000/0001-00',
        email: 'contato@horizonte.demo',
        phone: '(11) 99999-0000',
        address: 'Rua das Flores, 100 — São Paulo, SP',
        plan: SchoolPlan.PRO,
        planStatus: PlanStatus.ACTIVE,
        trialEndsAt,
        isActive: true,
      }),
    );

    // ── Senhas ────────────────────────────────────────────────────────────────
    const staffPassword = await bcrypt.hash('Horizonte@2026', 10);
    const studentPassword = await bcrypt.hash('Aluno@2026', 10);

    // Helper: cria usuário apenas se email ainda não existe
    async function upsertUser(data: Partial<User>): Promise<User> {
      const found = await qr.manager.findOne(User, { where: { email: data.email! } });
      if (found) return found;
      return qr.manager.save(User, qr.manager.create(User, { ...data, isActive: true }));
    }

    // ── Equipe ────────────────────────────────────────────────────────────────
    const diretora    = await upsertUser({ name: 'Érika Junqueira',  email: 'erikacarolinajunqueiradasilva@gmail.com', password: staffPassword, role: UserRole.DIRECTOR,     schoolId: school.id });
    const coordenadora = await upsertUser({ name: 'Patrícia Sousa',  email: 'patricia.sousa@horizonte.com',           password: staffPassword, role: UserRole.COORDINATOR,  schoolId: school.id });
    const secretaria  = await upsertUser({ name: 'Marcos Oliveira',  email: 'marcos.oliveira@horizonte.com',          password: staffPassword, role: UserRole.SECRETARY,    schoolId: school.id });
    const profAna     = await upsertUser({ name: 'Ana Lima',         email: 'ana.lima@horizonte.com',                 password: staffPassword, role: UserRole.TEACHER,      schoolId: school.id });
    const profBruno   = await upsertUser({ name: 'Bruno Carvalho',   email: 'bruno.carvalho@horizonte.com',           password: staffPassword, role: UserRole.TEACHER,      schoolId: school.id });
    const profCarla   = await upsertUser({ name: 'Carla Mendes',     email: 'carla.mendes@horizonte.com',             password: staffPassword, role: UserRole.TEACHER,      schoolId: school.id });
    const profDiego   = await upsertUser({ name: 'Diego Rocha',      email: 'diego.rocha@horizonte.com',              password: staffPassword, role: UserRole.TEACHER,      schoolId: school.id });

    // ── Turmas ────────────────────────────────────────────────────────────────
    async function upsertClass(name: string, year: number): Promise<SchoolClass> {
      const found = await qr.manager.findOne(SchoolClass, { where: { name, schoolId: school.id, year } });
      if (found) return found;
      return qr.manager.save(SchoolClass, qr.manager.create(SchoolClass, { name, year, schoolId: school.id, isActive: true }));
    }

    const turma1A = await upsertClass('1º Ano A', 2026);
    const turma2B = await upsertClass('2º Ano B', 2026);
    const turma3C = await upsertClass('3º Ano C', 2026);

    // ── Disciplinas ───────────────────────────────────────────────────────────
    async function upsertSubject(name: string, teacher: User, turma: SchoolClass): Promise<SchoolSubject> {
      const found = await qr.manager.findOne(SchoolSubject, { where: { name, classId: turma.id, schoolId: school.id } });
      if (found) return found;
      return qr.manager.save(SchoolSubject, qr.manager.create(SchoolSubject, {
        name, teacherId: teacher.id, classId: turma.id, schoolId: school.id, isActive: true,
      }));
    }

    // subjects[turmaId][key] = SchoolSubject
    const subjects: Record<number, SchoolSubject[]> = {};
    for (const turma of [turma1A, turma2B, turma3C]) {
      subjects[turma.id] = [
        await upsertSubject('Matemática', profAna,   turma),
        await upsertSubject('Português',  profBruno, turma),
        await upsertSubject('Ciências',   profCarla, turma),
        await upsertSubject('História',   profDiego, turma),
      ];
    }

    // ── Alunos + Matrículas + Notas + Chamadas ────────────────────────────────
    type AlunoDef = {
      name: string; email: string; turma: SchoolClass;
      instr1: number; instr2: number; attendanceRate: number;
    };

    const alunosDefs: AlunoDef[] = [
      // 1º Ano A
      { name: 'Sophia Ferreira',    email: 'sophia.ferreira@aluno.horizonte.com',    turma: turma1A, instr1: 8.0, instr2: 7.5, attendanceRate: 0.85 },
      { name: 'Arthur Costa',       email: 'arthur.costa@aluno.horizonte.com',       turma: turma1A, instr1: 5.5, instr2: 6.0, attendanceRate: 0.85 },
      { name: 'Helena Alves',       email: 'helena.alves@aluno.horizonte.com',       turma: turma1A, instr1: 9.5, instr2: 9.0, attendanceRate: 0.85 },
      { name: 'Mateus Nascimento',  email: 'mateus.nascimento@aluno.horizonte.com',  turma: turma1A, instr1: 4.0, instr2: 3.5, attendanceRate: 0.85 },
      { name: 'Laura Souza',        email: 'laura.souza@aluno.horizonte.com',        turma: turma1A, instr1: 7.0, instr2: 7.5, attendanceRate: 0.85 },
      { name: 'Bernardo Lima',      email: 'bernardo.lima@aluno.horizonte.com',      turma: turma1A, instr1: 5.0, instr2: 5.5, attendanceRate: 0.85 },
      { name: 'Alice Oliveira',     email: 'alice.oliveira@aluno.horizonte.com',     turma: turma1A, instr1: 8.5, instr2: 9.0, attendanceRate: 0.85 },
      { name: 'João Santos',        email: 'joao.santos@aluno.horizonte.com',        turma: turma1A, instr1: 6.5, instr2: 6.0, attendanceRate: 0.85 },
      // 2º Ano B
      { name: 'Gabriel Rocha',      email: 'gabriel.rocha@aluno.horizonte.com',      turma: turma2B, instr1: 7.5, instr2: 8.0, attendanceRate: 0.85 },
      { name: 'Larissa Mendes',     email: 'larissa.mendes@aluno.horizonte.com',     turma: turma2B, instr1: 5.0, instr2: 5.5, attendanceRate: 0.85 },
      { name: 'Felipe Carvalho',    email: 'felipe.carvalho@aluno.horizonte.com',    turma: turma2B, instr1: 9.0, instr2: 9.5, attendanceRate: 0.85 },
      { name: 'Amanda Ribeiro',     email: 'amanda.ribeiro@aluno.horizonte.com',     turma: turma2B, instr1: 4.5, instr2: 4.0, attendanceRate: 0.85 },
      { name: 'Gustavo Pereira',    email: 'gustavo.pereira@aluno.horizonte.com',    turma: turma2B, instr1: 6.0, instr2: 6.5, attendanceRate: 0.85 },
      { name: 'Isabela Martins',    email: 'isabela.martins@aluno.horizonte.com',    turma: turma2B, instr1: 8.5, instr2: 7.5, attendanceRate: 0.85 },
      { name: 'Vinicius Gomes',     email: 'vinicius.gomes@aluno.horizonte.com',     turma: turma2B, instr1: 5.5, instr2: 5.0, attendanceRate: 0.85 },
      { name: 'Natália Araujo',     email: 'natalia.araujo@aluno.horizonte.com',     turma: turma2B, instr1: 7.0, instr2: 8.0, attendanceRate: 0.85 },
      { name: 'Eduardo Dias',       email: 'eduardo.dias@aluno.horizonte.com',       turma: turma2B, instr1: 3.5, instr2: 4.0, attendanceRate: 0.68 },
      // 3º Ano C
      { name: 'Lucas Ferreira',     email: 'lucas.ferreira@aluno.horizonte.com',     turma: turma3C, instr1: 8.5, instr2: 9.0, attendanceRate: 0.85 },
      { name: 'Mariana Costa',      email: 'mariana.costa@aluno.horizonte.com',      turma: turma3C, instr1: 7.0, instr2: 6.5, attendanceRate: 0.85 },
      { name: 'Pedro Alves',        email: 'pedro.alves@aluno.horizonte.com',        turma: turma3C, instr1: 5.5, instr2: 6.0, attendanceRate: 0.85 },
      { name: 'Juliana Nascimento', email: 'juliana.nascimento@aluno.horizonte.com', turma: turma3C, instr1: 9.0, instr2: 8.5, attendanceRate: 0.85 },
      { name: 'Rafael Souza',       email: 'rafael.souza@aluno.horizonte.com',       turma: turma3C, instr1: 4.0, instr2: 5.0, attendanceRate: 0.65 },
      { name: 'Beatriz Lima',       email: 'beatriz.lima@aluno.horizonte.com',       turma: turma3C, instr1: 6.5, instr2: 7.0, attendanceRate: 0.85 },
      { name: 'Thiago Oliveira',    email: 'thiago.oliveira@aluno.horizonte.com',    turma: turma3C, instr1: 5.2, instr2: 5.8, attendanceRate: 0.70 },
      { name: 'Camila Santos',      email: 'camila.santos@aluno.horizonte.com',      turma: turma3C, instr1: 8.0, instr2: 7.5, attendanceRate: 0.85 },
    ];

    const workingDays = getWorkingDaysInRange(30);
    let totalGrades = 0;
    let totalAttendance = 0;
    let totalPresent = 0;

    for (const def of alunosDefs) {
      const aluno = await upsertUser({
        name: def.name, email: def.email, password: studentPassword,
        role: UserRole.STUDENT, schoolId: school.id,
      });

      // Matrícula
      const existingEnrollment = await qr.manager.findOne(Enrollment, {
        where: { studentId: aluno.id, classId: def.turma.id, year: 2026 },
      });
      if (!existingEnrollment) {
        await qr.manager.save(Enrollment, qr.manager.create(Enrollment, {
          studentId: aluno.id, classId: def.turma.id,
          schoolId: school.id, year: 2026, status: EnrollmentStatus.ACTIVE,
        }));
      }

      const turmaSubjects = subjects[def.turma.id];

      // Notas — 2 instrumentos × 4 disciplinas × period 1
      for (const subj of turmaSubjects) {
        const instruments: [number, number, string, number][] = [
          [1, def.instr1, 'Prova',    2],
          [2, def.instr2, 'Trabalho', 1],
        ];
        for (const [instrument, value, label, weight] of instruments) {
          const existingGrade = await qr.manager.findOne(Grade, {
            where: { studentId: aluno.id, subjectId: subj.id, classId: def.turma.id, period: 1, instrument, schoolId: school.id },
          });
          if (!existingGrade) {
            await qr.manager.save(Grade, qr.manager.create(Grade, {
              studentId: aluno.id, subjectId: subj.id, classId: def.turma.id,
              schoolId: school.id, period: 1, instrument, label, weight, value,
            }));
            totalGrades++;
          }
        }
      }

      // Chamadas — dias úteis dos últimos 30 dias corridos
      const absentSet = buildAbsentIndices(workingDays.length, def.attendanceRate);
      for (const subj of turmaSubjects) {
        for (let i = 0; i < workingDays.length; i++) {
          const date = workingDays[i];
          const status = absentSet.has(i) ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
          await qr.manager.save(Attendance, qr.manager.create(Attendance, {
            studentId: aluno.id, subjectId: subj.id, classId: def.turma.id,
            schoolId: school.id, date, status,
          }));
          totalAttendance++;
          if (status === AttendanceStatus.PRESENT) totalPresent++;
        }
      }
    }

    // ── Notificações ──────────────────────────────────────────────────────────
    const notifsDefs = [
      {
        title: 'Semana de provas do 1º bimestre',
        message: 'As provas acontecerão entre os dias 07 e 11 de abril. Consulte o cronograma no mural.',
        target: NotificationTarget.ALL_SCHOOL,
        type: NotificationType.EXAM_SCHEDULED,
        createdBy: diretora,
      },
      {
        title: 'Reunião de coordenação',
        message: 'Reunião pedagógica na quinta-feira às 14h na sala dos professores.',
        target: NotificationTarget.ALL_ADMINS,
        type: NotificationType.SYSTEM,
        createdBy: coordenadora,
      },
      {
        title: 'Entrega de relatórios de frequência',
        message: 'Os relatórios do 1º bimestre devem ser entregues até sexta-feira.',
        target: NotificationTarget.DIRECTOR,
        type: NotificationType.SYSTEM,
        createdBy: secretaria,
      },
    ];

    for (const n of notifsDefs) {
      const found = await qr.manager.findOne(Notification, { where: { title: n.title, schoolId: school.id } });
      if (!found) {
        await qr.manager.save(Notification, qr.manager.create(Notification, {
          title: n.title, message: n.message, target: n.target, type: n.type,
          schoolId: school.id, createdById: n.createdBy.id, isRead: false,
        }));
      }
    }

    // ── Feed ──────────────────────────────────────────────────────────────────
    const feedDefs = [
      {
        title: 'Feira de Ciências 2026',
        content: 'Feira de Ciências 2026 — inscrições abertas até 15 de abril. Acesse o formulário na secretaria.',
        type: FeedPostType.GLOBAL,
        author: coordenadora,
      },
      {
        title: 'Parabéns ao 3º Ano C!',
        content: 'Parabéns ao 3º Ano C pelo excelente desempenho no simulado regional!',
        type: FeedPostType.GLOBAL,
        author: diretora,
      },
    ];

    for (const f of feedDefs) {
      const found = await qr.manager.findOne(FeedPost, { where: { title: f.title, schoolId: school.id } });
      if (!found) {
        await qr.manager.save(FeedPost, qr.manager.create(FeedPost, {
          title: f.title, content: f.content, type: f.type,
          schoolId: school.id, authorId: f.author.id, active: true, pinned: false,
        }));
      }
    }

    await qr.commitTransaction();

    console.log('\n✅ Demo seed concluído com sucesso!');
    console.log(`   🏫 Escola: ${school.name} (id: ${school.id})`);
    console.log(`   👥 ${alunosDefs.length} alunos | 3 turmas | 7 usuários de equipe`);
    console.log(`   📚 12 disciplinas (4 por turma × 3 turmas)`);
    console.log(`   📝 ${totalGrades} notas (2 instrumentos × 4 disciplinas × ${alunosDefs.length} alunos)`);
    console.log(`   📋 ${totalAttendance} registros de frequência | ${workingDays.length} dias úteis | ${totalPresent} presenças | ${totalAttendance - totalPresent} faltas`);
    console.log(`   🔔 3 notificações | 📰 2 posts no feed`);
    console.log('\n   Login da diretora : erikacarolinajunqueiradasilva@gmail.com / Horizonte@2026');
    console.log('   Login do aluno    : sophia.ferreira@aluno.horizonte.com / Aluno@2026\n');

  } catch (err) {
    await qr.rollbackTransaction();
    console.error('Erro no demo seed — rollback realizado:', err);
    throw err;
  } finally {
    await qr.release();
  }
}
