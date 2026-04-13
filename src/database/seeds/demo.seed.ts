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
      const studentCount = await qr.manager.count(User, {
        where: { schoolId: existingSchool.id, role: UserRole.STUDENT },
      });
      if (studentCount >= 25) {
        console.log(`Demo seed já completo (escola ID ${existingSchool.id}, ${studentCount} alunos). Pulando.`);
        await qr.rollbackTransaction();
        return;
      }
      console.log(`Escola encontrada (ID ${existingSchool.id}) mas com apenas ${studentCount} alunos — completando seed...`);
    }

    // ── Escola ────────────────────────────────────────────────────────────────
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const school = existingSchool ?? await qr.manager.save(
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

    // ── Cleanup de duplicatas da equipe ───────────────────────────────────────
    const emailsEquipe = [
      'erikacarolinajunqueiradasilva@gmail.com',
      'patricia.sousa@horizonte.com',
      'marcos.oliveira@horizonte.com',
      'ana.lima@horizonte.com',
      'bruno.carvalho@horizonte.com',
      'carla.mendes@horizonte.com',
      'diego.rocha@horizonte.com',
    ];

    for (const email of emailsEquipe) {
      const users = await qr.manager.find(User, { where: { email } });
      if (users.length > 1) {
        const [keep, ...duplicates] = users.sort((a, b) => b.id - a.id);
        await qr.manager.delete(User, duplicates.map(u => u.id));
        await qr.manager.update(User, keep.id, {
          schoolId: school.id,
          password: staffPassword,
          isActive: true,
        });
      } else if (users.length === 1) {
        await qr.manager.update(User, users[0].id, {
          schoolId: school.id,
          password: staffPassword,
          isActive: true,
        });
      }
    }

    // Helper: cria ou migra usuário para a escola demo (atualiza schoolId + senha se já existir)
    async function upsertUser(data: Partial<User>): Promise<User> {
      const found = await qr.manager.findOne(User, { where: { email: data.email! } });
      if (found) {
        found.name = data.name ?? found.name;
        found.password = data.password ?? found.password;
        found.role = data.role ?? found.role;
        found.schoolId = data.schoolId ?? found.schoolId;
        found.isActive = data.isActive ?? true;
        if (data.phone !== undefined) found.phone = data.phone;
        if (data.document !== undefined) found.document = data.document;
        if (data.birthDate !== undefined) found.birthDate = data.birthDate;
        if (data.address !== undefined) found.address = data.address;
        if (data.addressNumber !== undefined) found.addressNumber = data.addressNumber;
        if (data.city !== undefined) found.city = data.city;
        if (data.state !== undefined) found.state = data.state;
        if (data.zipCode !== undefined) found.zipCode = data.zipCode;
        if (data.guardianName !== undefined) found.guardianName = data.guardianName;
        if (data.guardianPhone !== undefined) found.guardianPhone = data.guardianPhone;
        if (data.guardianRelation !== undefined) found.guardianRelation = data.guardianRelation;
        return qr.manager.save(User, found);
      }
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
      phone: string; document: string; birthDate: Date;
      address: string; city: string; state: string; zipCode: string; addressNumber: string;
      guardianName: string; guardianPhone: string; guardianRelation: string;
    };

    const alunosDefs: AlunoDef[] = [
      // 1º Ano A
      { name: 'Sophia Ferreira',    email: 'sophia.ferreira@aluno.horizonte.com',    turma: turma1A, instr1: 8.0, instr2: 7.5, attendanceRate: 0.85, phone: '(11) 91234-5601', document: '111.222.333-01', birthDate: new Date('2012-03-15'), address: 'Rua das Acácias', addressNumber: '10',  city: 'São Paulo', state: 'SP', zipCode: '01310-100', guardianName: 'Maria Ferreira',    guardianPhone: '(11) 98765-4301', guardianRelation: 'Mãe' },
      { name: 'Arthur Costa',       email: 'arthur.costa@aluno.horizonte.com',       turma: turma1A, instr1: 5.5, instr2: 6.0, attendanceRate: 0.85, phone: '(11) 91234-5602', document: '111.222.333-02', birthDate: new Date('2011-07-22'), address: 'Av. Paulista',        addressNumber: '200', city: 'São Paulo', state: 'SP', zipCode: '01310-200', guardianName: 'José Costa',        guardianPhone: '(11) 98765-4302', guardianRelation: 'Pai' },
      { name: 'Helena Alves',       email: 'helena.alves@aluno.horizonte.com',       turma: turma1A, instr1: 9.5, instr2: 9.0, attendanceRate: 0.85, phone: '(11) 91234-5603', document: '111.222.333-03', birthDate: new Date('2012-11-05'), address: 'Rua Augusta',         addressNumber: '45',  city: 'São Paulo', state: 'SP', zipCode: '01305-000', guardianName: 'Ana Alves',         guardianPhone: '(11) 98765-4303', guardianRelation: 'Mãe' },
      { name: 'Mateus Nascimento',  email: 'mateus.nascimento@aluno.horizonte.com',  turma: turma1A, instr1: 4.0, instr2: 3.5, attendanceRate: 0.85, phone: '(11) 91234-5604', document: '111.222.333-04', birthDate: new Date('2011-01-18'), address: 'Rua Consolação',      addressNumber: '88',  city: 'São Paulo', state: 'SP', zipCode: '01302-000', guardianName: 'Carlos Nascimento', guardianPhone: '(11) 98765-4304', guardianRelation: 'Pai' },
      { name: 'Laura Souza',        email: 'laura.souza@aluno.horizonte.com',        turma: turma1A, instr1: 7.0, instr2: 7.5, attendanceRate: 0.85, phone: '(11) 91234-5605', document: '111.222.333-05', birthDate: new Date('2012-06-30'), address: 'Rua Haddock Lobo',    addressNumber: '12',  city: 'São Paulo', state: 'SP', zipCode: '01414-001', guardianName: 'Paula Souza',       guardianPhone: '(11) 98765-4305', guardianRelation: 'Mãe' },
      { name: 'Bernardo Lima',      email: 'bernardo.lima@aluno.horizonte.com',      turma: turma1A, instr1: 5.0, instr2: 5.5, attendanceRate: 0.85, phone: '(11) 91234-5606', document: '111.222.333-06', birthDate: new Date('2011-09-14'), address: 'Al. Santos',          addressNumber: '300', city: 'São Paulo', state: 'SP', zipCode: '01419-001', guardianName: 'Roberto Lima',      guardianPhone: '(11) 98765-4306', guardianRelation: 'Pai' },
      { name: 'Alice Oliveira',     email: 'alice.oliveira@aluno.horizonte.com',     turma: turma1A, instr1: 8.5, instr2: 9.0, attendanceRate: 0.85, phone: '(11) 91234-5607', document: '111.222.333-07', birthDate: new Date('2012-04-20'), address: 'Rua Oscar Freire',    addressNumber: '55',  city: 'São Paulo', state: 'SP', zipCode: '01426-001', guardianName: 'Sandra Oliveira',   guardianPhone: '(11) 98765-4307', guardianRelation: 'Mãe' },
      { name: 'João Santos',        email: 'joao.santos@aluno.horizonte.com',        turma: turma1A, instr1: 6.5, instr2: 6.0, attendanceRate: 0.85, phone: '(11) 91234-5608', document: '111.222.333-08', birthDate: new Date('2011-12-03'), address: 'Rua da Consolação',   addressNumber: '77',  city: 'São Paulo', state: 'SP', zipCode: '01301-000', guardianName: 'Marcos Santos',     guardianPhone: '(11) 98765-4308', guardianRelation: 'Pai' },
      // 2º Ano B
      { name: 'Gabriel Rocha',      email: 'gabriel.rocha@aluno.horizonte.com',      turma: turma2B, instr1: 7.5, instr2: 8.0, attendanceRate: 0.85, phone: '(11) 91234-5609', document: '111.222.333-09', birthDate: new Date('2010-08-17'), address: 'Rua Bela Cintra',     addressNumber: '130', city: 'São Paulo', state: 'SP', zipCode: '01415-000', guardianName: 'Fernanda Rocha',    guardianPhone: '(11) 98765-4309', guardianRelation: 'Mãe' },
      { name: 'Larissa Mendes',     email: 'larissa.mendes@aluno.horizonte.com',     turma: turma2B, instr1: 5.0, instr2: 5.5, attendanceRate: 0.85, phone: '(11) 91234-5610', document: '111.222.333-10', birthDate: new Date('2010-02-28'), address: 'Rua Pamplona',        addressNumber: '60',  city: 'São Paulo', state: 'SP', zipCode: '01405-001', guardianName: 'Luiz Mendes',       guardianPhone: '(11) 98765-4310', guardianRelation: 'Pai' },
      { name: 'Felipe Carvalho',    email: 'felipe.carvalho@aluno.horizonte.com',    turma: turma2B, instr1: 9.0, instr2: 9.5, attendanceRate: 0.85, phone: '(11) 91234-5611', document: '111.222.333-11', birthDate: new Date('2011-05-10'), address: 'Rua Estados Unidos',  addressNumber: '22',  city: 'São Paulo', state: 'SP', zipCode: '01427-000', guardianName: 'Cláudia Carvalho',  guardianPhone: '(11) 98765-4311', guardianRelation: 'Mãe' },
      { name: 'Amanda Ribeiro',     email: 'amanda.ribeiro@aluno.horizonte.com',     turma: turma2B, instr1: 4.5, instr2: 4.0, attendanceRate: 0.85, phone: '(11) 91234-5612', document: '111.222.333-12', birthDate: new Date('2010-10-25'), address: 'Rua Peixoto Gomide',  addressNumber: '95',  city: 'São Paulo', state: 'SP', zipCode: '01409-000', guardianName: 'Antônio Ribeiro',   guardianPhone: '(11) 98765-4312', guardianRelation: 'Pai' },
      { name: 'Gustavo Pereira',    email: 'gustavo.pereira@aluno.horizonte.com',    turma: turma2B, instr1: 6.0, instr2: 6.5, attendanceRate: 0.85, phone: '(11) 91234-5613', document: '111.222.333-13', birthDate: new Date('2010-04-07'), address: 'Al. Campinas',        addressNumber: '150', city: 'São Paulo', state: 'SP', zipCode: '01404-001', guardianName: 'Renata Pereira',    guardianPhone: '(11) 98765-4313', guardianRelation: 'Mãe' },
      { name: 'Isabela Martins',    email: 'isabela.martins@aluno.horizonte.com',    turma: turma2B, instr1: 8.5, instr2: 7.5, attendanceRate: 0.85, phone: '(11) 91234-5614', document: '111.222.333-14', birthDate: new Date('2011-08-19'), address: 'Rua Itapeva',         addressNumber: '33',  city: 'São Paulo', state: 'SP', zipCode: '01313-000', guardianName: 'Eduardo Martins',   guardianPhone: '(11) 98765-4314', guardianRelation: 'Pai' },
      { name: 'Vinicius Gomes',     email: 'vinicius.gomes@aluno.horizonte.com',     turma: turma2B, instr1: 5.5, instr2: 5.0, attendanceRate: 0.85, phone: '(11) 91234-5615', document: '111.222.333-15', birthDate: new Date('2010-12-01'), address: 'Rua Caio Prado',      addressNumber: '70',  city: 'São Paulo', state: 'SP', zipCode: '01313-020', guardianName: 'Denise Gomes',      guardianPhone: '(11) 98765-4315', guardianRelation: 'Mãe' },
      { name: 'Natália Araujo',     email: 'natalia.araujo@aluno.horizonte.com',     turma: turma2B, instr1: 7.0, instr2: 8.0, attendanceRate: 0.85, phone: '(11) 91234-5616', document: '111.222.333-16', birthDate: new Date('2010-06-14'), address: 'Rua da Glória',       addressNumber: '18',  city: 'São Paulo', state: 'SP', zipCode: '01310-940', guardianName: 'Fábio Araujo',      guardianPhone: '(11) 98765-4316', guardianRelation: 'Pai' },
      { name: 'Eduardo Dias',       email: 'eduardo.dias@aluno.horizonte.com',       turma: turma2B, instr1: 3.5, instr2: 4.0, attendanceRate: 0.68, phone: '(11) 91234-5617', document: '111.222.333-17', birthDate: new Date('2010-03-22'), address: 'Rua Marquês de Itu',  addressNumber: '42',  city: 'São Paulo', state: 'SP', zipCode: '01202-001', guardianName: 'Solange Dias',      guardianPhone: '(11) 98765-4317', guardianRelation: 'Mãe' },
      // 3º Ano C
      { name: 'Lucas Ferreira',     email: 'lucas.ferreira@aluno.horizonte.com',     turma: turma3C, instr1: 8.5, instr2: 9.0, attendanceRate: 0.85, phone: '(11) 91234-5618', document: '111.222.333-18', birthDate: new Date('2009-09-11'), address: 'Rua Martiniano',      addressNumber: '25',  city: 'São Paulo', state: 'SP', zipCode: '01223-010', guardianName: 'Vera Ferreira',     guardianPhone: '(11) 98765-4318', guardianRelation: 'Mãe' },
      { name: 'Mariana Costa',      email: 'mariana.costa@aluno.horizonte.com',      turma: turma3C, instr1: 7.0, instr2: 6.5, attendanceRate: 0.85, phone: '(11) 91234-5619', document: '111.222.333-19', birthDate: new Date('2009-01-30'), address: 'Rua Boa Vista',       addressNumber: '110', city: 'São Paulo', state: 'SP', zipCode: '01014-001', guardianName: 'Paulo Costa',       guardianPhone: '(11) 98765-4319', guardianRelation: 'Pai' },
      { name: 'Pedro Alves',        email: 'pedro.alves@aluno.horizonte.com',        turma: turma3C, instr1: 5.5, instr2: 6.0, attendanceRate: 0.85, phone: '(11) 91234-5620', document: '111.222.333-20', birthDate: new Date('2009-05-08'), address: 'Rua XV de Novembro',  addressNumber: '66',  city: 'São Paulo', state: 'SP', zipCode: '01013-001', guardianName: 'Lúcia Alves',       guardianPhone: '(11) 98765-4320', guardianRelation: 'Mãe' },
      { name: 'Juliana Nascimento', email: 'juliana.nascimento@aluno.horizonte.com', turma: turma3C, instr1: 9.0, instr2: 8.5, attendanceRate: 0.85, phone: '(11) 91234-5621', document: '111.222.333-21', birthDate: new Date('2009-11-16'), address: 'Rua Direita',         addressNumber: '9',   city: 'São Paulo', state: 'SP', zipCode: '01002-000', guardianName: 'Marcos Nascimento', guardianPhone: '(11) 98765-4321', guardianRelation: 'Pai' },
      { name: 'Rafael Souza',       email: 'rafael.souza@aluno.horizonte.com',       turma: turma3C, instr1: 4.0, instr2: 5.0, attendanceRate: 0.65, phone: '(11) 91234-5622', document: '111.222.333-22', birthDate: new Date('2009-07-04'), address: 'Rua do Carmo',        addressNumber: '37',  city: 'São Paulo', state: 'SP', zipCode: '01002-020', guardianName: 'Teresa Souza',      guardianPhone: '(11) 98765-4322', guardianRelation: 'Mãe' },
      { name: 'Beatriz Lima',       email: 'beatriz.lima@aluno.horizonte.com',       turma: turma3C, instr1: 6.5, instr2: 7.0, attendanceRate: 0.85, phone: '(11) 91234-5623', document: '111.222.333-23', birthDate: new Date('2009-02-20'), address: 'Rua São Bento',       addressNumber: '51',  city: 'São Paulo', state: 'SP', zipCode: '01011-100', guardianName: 'Henrique Lima',     guardianPhone: '(11) 98765-4323', guardianRelation: 'Pai' },
      { name: 'Thiago Oliveira',    email: 'thiago.oliveira@aluno.horizonte.com',    turma: turma3C, instr1: 5.2, instr2: 5.8, attendanceRate: 0.70, phone: '(11) 91234-5624', document: '111.222.333-24', birthDate: new Date('2009-10-13'), address: 'Rua Florêncio',       addressNumber: '83',  city: 'São Paulo', state: 'SP', zipCode: '01015-010', guardianName: 'Elaine Oliveira',   guardianPhone: '(11) 98765-4324', guardianRelation: 'Mãe' },
      { name: 'Camila Santos',      email: 'camila.santos@aluno.horizonte.com',      turma: turma3C, instr1: 8.0, instr2: 7.5, attendanceRate: 0.85, phone: '(11) 91234-5625', document: '111.222.333-25', birthDate: new Date('2008-08-27'), address: 'Largo do Arouche',    addressNumber: '14',  city: 'São Paulo', state: 'SP', zipCode: '01219-010', guardianName: 'Ricardo Santos',    guardianPhone: '(11) 98765-4325', guardianRelation: 'Pai' },
    ];

    const workingDays = getWorkingDaysInRange(30);
    let totalGrades = 0;
    let totalAttendance = 0;
    let totalPresent = 0;

    for (const def of alunosDefs) {
      const aluno = await upsertUser({
        name: def.name, email: def.email, password: studentPassword,
        role: UserRole.STUDENT, schoolId: school.id,
        phone: def.phone, document: def.document, birthDate: def.birthDate,
        address: def.address, addressNumber: def.addressNumber,
        city: def.city, state: def.state, zipCode: def.zipCode,
        guardianName: def.guardianName, guardianPhone: def.guardianPhone, guardianRelation: def.guardianRelation,
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
      const attendanceRecords: Partial<Attendance>[] = [];
      for (const subj of turmaSubjects) {
        const existingAttCount = await qr.manager.count(Attendance, {
          where: { studentId: aluno.id, subjectId: subj.id, classId: def.turma.id, schoolId: school.id },
        });
        if (existingAttCount > 0) continue;

        for (let i = 0; i < workingDays.length; i++) {
          const date = workingDays[i];
          const status = absentSet.has(i) ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
          attendanceRecords.push({
            studentId: aluno.id, subjectId: subj.id, classId: def.turma.id,
            schoolId: school.id, date, status,
          });
          totalAttendance++;
          if (status === AttendanceStatus.PRESENT) totalPresent++;
        }
      }

      // Inserir em lotes de 50 para não ultrapassar o statement timeout do Supabase
      const BATCH_SIZE = 50;
      for (let i = 0; i < attendanceRecords.length; i += BATCH_SIZE) {
        const batch = attendanceRecords.slice(i, i + BATCH_SIZE);
        await qr.manager
          .createQueryBuilder()
          .insert()
          .into(Attendance)
          .values(batch)
          .execute();
      }
    }

    // ── Verificação pós-seed ──────────────────────────────────────────────────
    const verificacao = await qr.manager.findOne(User, {
      where: { email: 'alice.oliveira@aluno.horizonte.com' },
      select: ['name', 'phone', 'document', 'address', 'guardianName'],
    });
    console.log('VERIFICACAO ALICE:', JSON.stringify(verificacao));

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

    console.log('\n✅ Seed concluído — Colégio Horizonte');
    console.log(`   Escola ID: ${school.id}`);
    console.log(`   Usuários migrados/criados: 7 (equipe) + ${alunosDefs.length} (alunos)`);
    console.log(`   Alunos: ${alunosDefs.length}`);
    console.log(`   📚 12 disciplinas | 📝 ${totalGrades} notas | 📋 ${totalAttendance} chamadas`);
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
