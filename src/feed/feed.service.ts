import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedPost, FeedPostType } from './feed-post.entity';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { UpdateFeedPostDto } from './dto/update-feed-post.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ClassesService } from '../classes/classes.service';
import { UserRole } from '../users/user.entity';
import { PlanLimitsService } from '../plans/plan-limits.service';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(FeedPost)
    private readonly feedRepository: Repository<FeedPost>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly classesService: ClassesService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async create(dto: CreateFeedPostDto, user: { userId: number; schoolId: number; role: UserRole }): Promise<FeedPost> {
    const isAdmin = [UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SECRETARY].includes(user.role);
    const isTeacher = user.role === UserRole.TEACHER;

    // Teacher: classId obrigatório + validar que ministra a turma
    if (isTeacher) {
      if (!dto.classId) {
        throw new BadRequestException('Professor deve informar classId para criar um post.');
      }
      await this.validateTeacherInClass(dto.classId, user.userId, user.schoolId);
    }

    // Apenas director e coordinator podem fixar posts
    const canPin = [UserRole.DIRECTOR, UserRole.COORDINATOR].includes(user.role);
    if (dto.pinned && !canPin) {
      throw new ForbiddenException('Apenas Diretor e Coordenador podem fixar posts.');
    }

    // Admin sem classId: post para escola inteira (news/event/update)
    if (isAdmin && !dto.classId && !dto.type) {
      dto.type = FeedPostType.NEWS;
    }

    const post = this.feedRepository.create({
      ...dto,
      authorId: user.userId,
      schoolId: user.schoolId,
      pinned: canPin ? (dto.pinned ?? false) : false,
    });

    return this.feedRepository.save(post);
  }

  async findAll(
    schoolId: number,
    userId: number,
    userRole: UserRole,
    page = 1,
    limit = 20,
    type?: FeedPostType,
  ): Promise<{ data: FeedPost[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const qb = this.feedRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.schoolId = :schoolId', { schoolId })
      .andWhere('post.active = true');

    // Filtro por tipo
    if (type) {
      qb.andWhere('post.type = :type', { type });
    }

    // Teacher: vê posts da escola (sem classId) + posts das turmas que ministra
    if (userRole === UserRole.TEACHER) {
      qb.andWhere(
        '(post.classId IS NULL OR post.classId IN ' +
          '(SELECT s.classId FROM subjects s WHERE s.teacherId = :teacherId AND s.schoolId = :schoolId))',
        { teacherId: userId, schoolId },
      );
    }

    // Student: vê todos os posts ativos da escola (sem filtro de turma — sem tabela aluno-turma)
    // Admin/Secretary/Coordinator/Director: vê tudo

    // Posts fixados no topo
    qb.orderBy('post.pinned', 'DESC').addOrderBy('post.createdAt', 'DESC');

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Remove senha do autor
    data.forEach((p) => {
      if (p.author) {
        delete (p.author as any).password;
        delete (p.author as any).resetToken;
        delete (p.author as any).resetTokenExpiry;
      }
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, schoolId: number): Promise<FeedPost> {
    const post = await this.feedRepository.findOne({
      where: { id, schoolId, active: true },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post não encontrado.');

    if (post.author) {
      delete (post.author as any).password;
      delete (post.author as any).resetToken;
      delete (post.author as any).resetTokenExpiry;
    }

    return post;
  }

  async update(
    id: string,
    dto: UpdateFeedPostDto,
    user: { userId: number; schoolId: number; role: UserRole },
  ): Promise<FeedPost> {
    const post = await this.findOne(id, user.schoolId);

    const canEdit = post.authorId === user.userId || user.role === UserRole.DIRECTOR;
    if (!canEdit) throw new ForbiddenException('Sem permissão para editar este post.');

    // Apenas director e coordinator podem alterar pinned
    const canPin = [UserRole.DIRECTOR, UserRole.COORDINATOR].includes(user.role);
    if (dto.pinned !== undefined && !canPin) {
      throw new ForbiddenException('Apenas Diretor e Coordenador podem fixar posts.');
    }

    Object.assign(post, dto);
    return this.feedRepository.save(post);
  }

  async remove(id: string, user: { userId: number; schoolId: number; role: UserRole }): Promise<{ message: string }> {
    const post = await this.findOne(id, user.schoolId);

    const canDelete = post.authorId === user.userId || user.role === UserRole.DIRECTOR;
    if (!canDelete) throw new ForbiddenException('Sem permissão para remover este post.');

    post.active = false;
    await this.feedRepository.save(post);
    return { message: 'Post removido com sucesso.' };
  }

  async uploadImages(
    id: string,
    files: Express.Multer.File[],
    user: { userId: number; schoolId: number; role: UserRole },
  ): Promise<FeedPost> {
    const post = await this.findOne(id, user.schoolId);

    const canUpload = post.authorId === user.userId || user.role === UserRole.DIRECTOR;
    if (!canUpload) throw new ForbiddenException('Sem permissão para adicionar imagens a este post.');

    const currentImages = post.images ?? [];
    const maxImages = await this.planLimitsService.getMaxImagesPerPost(post.schoolId);
    if (currentImages.length + files.length > maxImages) {
      throw new BadRequestException(
        `Máximo de ${maxImages} imagem(ns) por post no seu plano. O post já possui ${currentImages.length}.`,
      );
    }

    const urls = await Promise.all(files.map((f) => this.cloudinaryService.uploadImage(f)));
    post.images = [...currentImages, ...urls];
    return this.feedRepository.save(post);
  }

  private async validateTeacherInClass(classId: number, teacherId: number, schoolId: number): Promise<void> {
    const subjects = await this.classesService.findSubjectsByClass(classId, schoolId);
    const teaches = subjects.some((s) => s.teacherId === teacherId);
    if (!teaches) {
      throw new ForbiddenException('Professor não está vinculado a esta turma.');
    }
  }
}
