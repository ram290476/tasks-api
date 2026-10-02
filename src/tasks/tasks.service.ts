import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginatedDto } from './dto/paginated.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  create(ownerId: string, dto: CreateTaskDto): Promise<Task> {
    return this.tasks.save(this.tasks.create({ ...dto, ownerId }));
  }

  async findAll(
    ownerId: string,
    query: QueryTasksDto,
  ): Promise<PaginatedDto<Task>> {
    const { page, limit, status, priority, search, sortBy, order } = query;

    const qb = this.tasks
      .createQueryBuilder('task')
      .where('task.ownerId = :ownerId', { ownerId });
    if (status) qb.andWhere('task.status = :status', { status });
    if (priority) qb.andWhere('task.priority = :priority', { priority });
    if (search) {
      // Escape LIKE wildcards so user input is matched literally.
      const escaped = search.replace(/[\\%_]/g, '\\$&');
      qb.andWhere("task.title ILIKE :search ESCAPE '\\'", {
        search: `%${escaped}%`,
      });
    }

    // sortBy is whitelisted by the DTO enum, so interpolation is safe.
    const [data, total] = await qb
      .orderBy(`task.${sortBy}`, order)
      .addOrderBy('task.id', 'ASC') // stable pagination
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Tasks are always looked up by owner too: someone else's task is a 404, not a 403.
  async findOne(ownerId: string, id: string): Promise<Task> {
    const task = await this.tasks.findOneBy({ id, ownerId });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async update(ownerId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(ownerId, id);
    return this.tasks.save(Object.assign(task, dto));
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const { affected } = await this.tasks.delete({ id, ownerId });
    if (!affected) throw new NotFoundException(`Task ${id} not found`);
  }
}
