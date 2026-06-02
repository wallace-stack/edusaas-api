import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { SystemMessage, SystemMessageCategory } from './system-message.entity';
import { UserSystemMessage } from './user-system-message.entity';
import { Notification, NotificationTarget, NotificationType } from './notification.entity';
import { User, UserRole } from '../users/user.entity';

const SEED_MESSAGES: Array<{
  category: SystemMessageCategory;
  message: string;
  author?: string;
}> = [
  // ── Inspiracionais (15) ─────────────────────────────────────────────
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Cada dia é uma nova chance de fazer algo incrível.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Você foi feito para deixar sua marca no mundo.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Grandes conquistas começam com pequenos passos diários.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'O sucesso não acontece por acaso — ele é construído com dedicação.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Cada aula que você ministra planta uma semente de futuro.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'A educação é a arma mais poderosa para transformar o mundo.', author: 'Nelson Mandela' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Você não precisa ser perfeito para ser inspirador — só precisa ser verdadeiro.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'O caminho pode ser longo, mas cada passo conta.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Quem ilumina o caminho dos outros nunca caminha no escuro.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'O aprendizado começa onde o conforto termina.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Ser professor é carregar uma centelha que acende outras centelhas.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Hoje pode ser o dia que muda a vida de um aluno para sempre.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'Você inspira mais pessoas do que imagina. Continue assim.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'A sua presença nesta escola faz toda a diferença.' },
  { category: SystemMessageCategory.INSPIRATIONAL, message: 'O que você faz hoje escreve a história de amanhã.' },

  // ── Carinhosas (15) ──────────────────────────────────────────────────
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Obrigado por fazer parte da nossa escola. Você faz a diferença!' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Seu trabalho transforma vidas todos os dias. Não esqueça disso.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'A educação que você oferece hoje é o legado de amanhã.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'A nossa escola é melhor por ter você aqui.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Cada aluno que você ajuda é uma história que muda de rumo.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Você não é só um profissional — você é parte da família desta escola.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Seu esforço é visto e reconhecido. Obrigado por tudo!' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Lembre-se: o que você faz aqui importa muito mais do que parece.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Cuidar da educação é cuidar do futuro. Você faz isso todo dia.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Há alunos que sempre vão se lembrar de você. Você já deixou sua marca.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Que bom ter você na nossa equipe. A escola é mais forte com você.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Você merece ser feliz — dentro e fora da sala de aula.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Cada sorriso de aluno que você provoca vale mais do que parece.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Você é o motivo pelo qual alguns alunos amam vir para a escola.' },
  { category: SystemMessageCategory.AFFECTIONATE, message: 'Este sistema existe para facilitar o seu dia. Pode contar com a gente!' },

  // ── Engraçadas / Leves (15) ─────────────────────────────────────────
  { category: SystemMessageCategory.FUNNY, message: 'Por que o livro de matemática estava triste? Tinha muitos problemas!' },
  { category: SystemMessageCategory.FUNNY, message: 'Você sabia que sorrir gasta menos energia do que franzir a testa? Sorria mais!' },
  { category: SystemMessageCategory.FUNNY, message: 'Café + você = escola funcionando. Simples assim.' },
  { category: SystemMessageCategory.FUNNY, message: 'Por que o professor de inglês não vai à praia? Porque tem muito "sea" (mar)!' },
  { category: SystemMessageCategory.FUNNY, message: 'Um dia sem rir é um dia perdido. E você tem muitos alunos para te ajudar nisso!' },
  { category: SystemMessageCategory.FUNNY, message: 'Por que o aluno levou escada para a escola? Porque queria ir pro ensino médio!' },
  { category: SystemMessageCategory.FUNNY, message: 'Você sabia que professores têm superpoderes? Fazem silêncio com apenas um olhar.' },
  { category: SystemMessageCategory.FUNNY, message: 'Reunião de pais: o único lugar onde os adultos ficam mais nervosos que as crianças.' },
  { category: SystemMessageCategory.FUNNY, message: 'Conselho do dia: hidrate-se. Professores que bebem água falam melhor. Científico!' },
  { category: SystemMessageCategory.FUNNY, message: 'Por que o caderno foi ao médico? Estava com muitas folhas de falta!' },
  { category: SystemMessageCategory.FUNNY, message: 'Você é tão essencial para esta escola que nem o intervalo te esquece.' },
  { category: SystemMessageCategory.FUNNY, message: 'Se o dia estiver pesado, olhe pela janela. Sempre tem um aluno fazendo algo inesperado.' },
  { category: SystemMessageCategory.FUNNY, message: 'Pesquisa comprova: professores têm olhos na nuca. Os alunos confirmam.' },
  { category: SystemMessageCategory.FUNNY, message: 'Por que o giz nunca some na hora certa? Mistério da educação moderna.' },
  { category: SystemMessageCategory.FUNNY, message: 'Hoje é um ótimo dia para respirar fundo, tomar um café e arrasar!' },

  // ── Motivacionais (15) ───────────────────────────────────────────────
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Dias difíceis constroem pessoas fortes.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Acredite no seu potencial — ele é maior do que você imagina.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'O cansaço de hoje é a força de amanhã.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Não desista. O maior passo é o próximo.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Você já superou coisas que pareciam impossíveis. Este dia também passa.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Cada obstáculo superado te torna mais capaz do próximo.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'O progresso, por menor que seja, sempre vale a pena celebrar.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Você não precisa ter tudo resolvido para dar o próximo passo.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Grandes resultados vêm de pequenas ações consistentes.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Quando sentir que não aguenta mais, lembre do quanto já aguentou.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Você é mais forte do que seus desafios.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'A diferença entre o que você é e o que poderia ser é o que você faz hoje.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Foco. Você consegue. Um passo de cada vez.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Não compare sua jornada com a dos outros — cada caminho é único.' },
  { category: SystemMessageCategory.MOTIVATIONAL, message: 'Coragem não é ausência de medo, é seguir em frente mesmo com ele.' },

  // ── Educacionais (5 extras) ───────────────────────────────────────────
  { category: SystemMessageCategory.EDUCATIONAL, message: 'Sabia que a leitura em voz alta melhora a compreensão em até 30%? Pequenos hábitos, grandes resultados.' },
  { category: SystemMessageCategory.EDUCATIONAL, message: 'Turmas com rotinas claras têm melhor desempenho. Consistência é a chave.' },
  { category: SystemMessageCategory.EDUCATIONAL, message: 'O feedback positivo aumenta a autoestima e o desempenho. Uma palavra certa faz toda a diferença.' },
  { category: SystemMessageCategory.EDUCATIONAL, message: 'Alunos que se sentem vistos pelo professor têm melhor frequência. Você já fez isso hoje?' },
  { category: SystemMessageCategory.EDUCATIONAL, message: 'Aprender é um processo — erros fazem parte. Ajude seus alunos a ver os erros como degraus.' },
];

const HOURS_72 = 72 * 60 * 60 * 1000;

@Injectable()
export class SystemMessageScheduler implements OnModuleInit {
  private readonly logger = new Logger(SystemMessageScheduler.name);

  constructor(
    @InjectRepository(SystemMessage)
    private readonly msgRepo: Repository<SystemMessage>,
    @InjectRepository(UserSystemMessage)
    private readonly histRepo: Repository<UserSystemMessage>,
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Seed automático na primeira inicialização ──────────────────────────
  async onModuleInit() {
    const count = await this.msgRepo.count();
    if (count === 0) {
      await this.msgRepo.save(
        SEED_MESSAGES.map(m => this.msgRepo.create(m)),
      );
      this.logger.log(`Seed: ${SEED_MESSAGES.length} mensagens carinhosas inseridas.`);
    }
  }

  // ── Cron: diariamente às 9h — envia se passaram 72h por usuário ────────
  @Cron('0 9 * * *')
  async sendScheduledMessages() {
    this.logger.log('Verificando mensagens carinhosas programadas...');

    const activeMessages = await this.msgRepo.find({ where: { isActive: true } });
    if (activeMessages.length === 0) return;

    const users = await this.userRepo.find({ where: { isActive: true } });
    let sent = 0;

    for (const user of users) {
      try {
        // Verificar se passou 72h desde o último envio para este usuário
        const lastEntry = await this.histRepo.findOne({
          where: { userId: user.id },
          order: { sentAt: 'DESC' },
        });

        if (lastEntry) {
          const elapsed = Date.now() - new Date(lastEntry.sentAt).getTime();
          if (elapsed < HOURS_72) continue; // ainda não chegou a hora
        }

        // Sortear mensagem diferente da última enviada
        const excludeId = lastEntry?.messageId ?? -1;
        const pool = activeMessages.filter(m => m.id !== excludeId);
        if (pool.length === 0) continue;

        const chosen = pool[Math.floor(Math.random() * pool.length)];

        // Definir target adequado por role
        const target = user.role === UserRole.STUDENT
          ? NotificationTarget.STUDENT
          : NotificationTarget.SPECIFIC;

        // Criar notificação no sino
        const notif = this.notifRepo.create({
          title: this.titleByCategory(chosen.category),
          message: chosen.author
            ? `${chosen.message} — ${chosen.author}`
            : chosen.message,
          type: NotificationType.SYSTEM_MESSAGE,
          target,
          targetUserId: user.id,
          schoolId: user.schoolId,
          createdById: undefined as any,
          isRead: false,
        });
        await this.notifRepo.save(notif);

        // Registrar histórico para evitar repetição
        await this.histRepo.save(
          this.histRepo.create({ userId: user.id, messageId: chosen.id }),
        );

        sent++;
      } catch (err) {
        this.logger.error(`Erro ao enviar msg para user ${user.id}: ${err}`);
      }
    }

    this.logger.log(`Mensagens carinhosas enviadas: ${sent} notificações.`);
  }

  private titleByCategory(category: SystemMessageCategory): string {
    const titles: Record<SystemMessageCategory, string> = {
      [SystemMessageCategory.INSPIRATIONAL]: '✨ Inspiração do dia',
      [SystemMessageCategory.AFFECTIONATE]:  '💙 Mensagem carinhosa',
      [SystemMessageCategory.FUNNY]:         '😄 Momento leve',
      [SystemMessageCategory.MOTIVATIONAL]:  '🔥 Motivação',
      [SystemMessageCategory.EDUCATIONAL]:   '📚 Você sabia?',
    };
    return titles[category] ?? '💬 Mensagem do sistema';
  }
}
