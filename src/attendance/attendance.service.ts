import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance, AttendanceStatus } from './attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  // Registra frequência de um aluno
  async create(dto: CreateAttendanceDto, schoolId: number): Promise<Attendance> {
    const attendance = this.attendanceRepository.create({ ...dto, schoolId });
    return this.attendanceRepository.save(attendance);
  }

  // Registra frequência em massa (toda a turma de uma vez)
  async bulkCreate(dto: BulkAttendanceDto, schoolId: number): Promise<Attendance[]> {
    const attendances = dto.attendances.map(item =>
      this.attendanceRepository.create({
        date: new Date(dto.date),
        subjectId: dto.subjectId,
        classId: dto.classId,
        studentId: item.studentId,
        status: item.status,
        schoolId,
      }),
    );
    return this.attendanceRepository.save(attendances);
  }

  // Frequência de um aluno
  async findByStudent(studentId: number, schoolId: number): Promise<any> {
    const records = await this.attendanceRepository.find({
      where: { studentId, schoolId },
      relations: ['subject'],
      order: { date: 'DESC' },
    });

    const total = records.length;
    const present = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const justified = records.filter(r => r.status === AttendanceStatus.JUSTIFIED).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      records,
      summary: { total, present, absent, justified, percentage },
      status: percentage >= 75 ? 'Regular' : 'Irregular — risco de reprovação',
    };
  }

  // Frequência de uma turma em uma data
  async findByClassAndDate(classId: number, date: string, schoolId: number): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: { classId, schoolId },
      relations: ['student'],
    });
  }

  // Relatório de frequência da turma
  async getClassAttendanceReport(classId: number, schoolId: number): Promise<any> {
    const records = await this.attendanceRepository.find({
      where: { classId, schoolId },
      relations: ['student'],
    });

    const studentMap: any = {};
    records.forEach(record => {
      const name = record.student.name;
      if (!studentMap[name]) {
        studentMap[name] = { total: 0, present: 0, absent: 0, justified: 0 };
      }
      studentMap[name].total++;
      if (record.status === AttendanceStatus.PRESENT) studentMap[name].present++;
      if (record.status === AttendanceStatus.ABSENT) studentMap[name].absent++;
      if (record.status === AttendanceStatus.JUSTIFIED) studentMap[name].justified++;
    });

    return Object.entries(studentMap).map(([student, data]: any) => ({
      student,
      ...data,
      percentage: Math.round((data.present / data.total) * 100),
      status: (data.present / data.total) >= 0.75 ? 'Regular' : 'Irregular',
    }));
  }
}