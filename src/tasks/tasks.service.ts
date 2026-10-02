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

  create(dto: CreateTaskDto): Promise<Task> {
    return this.tasks.save(this.tasks.create(dto));
  }

  async findAll(query: QueryTasksDto): Promise<PaginatedDto<Task>> {
    const { page, limit, status, priority, search, sortBy, order } = query;

    const qb = this.tasks.createQueryBuilder('task');
    if (status) qb.andWhere('task.status = :status', { status });
    if (priority) qb.andWhere('task.priority = :priority', { priority });
    if (search) {
      // Escape LIKE wildcards so user input is matched literally.
      const escaped = search.replace(/[\\%_]/g, '\\$&');
      qb.andWhere("LOWER(task.title) LIKE LOWER(:search) ESCAPE '\\'", {
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

  async findOne(id: string): Promise<Task> {
    const task = await this.tasks.findOneBy({ id });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    return this.tasks.save(Object.assign(task, dto));
  }

  async remove(id: string): Promise<void> {
    const { affected } = await this.tasks.delete({ id });
    if (!affected) throw new NotFoundException(`Task ${id} not found`);
  }
}
