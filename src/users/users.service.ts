import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(
    email: string,
    passwordHash: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    try {
      const user = await this.users.save(
        this.users.create({ email, passwordHash }),
      );
      return { id: user.id, email: user.email, createdAt: user.createdAt };
    } catch (err) {
      // Unique index is the source of truth; this also covers concurrent signups.
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }
}
