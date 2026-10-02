import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  DB_PATH: string = 'data/tasks.sqlite';

  /** Auto-create schema. Disable once you introduce migrations. */
  @Transform(({ value }) =>
    // "false" / "0" must not coerce to true like Boolean("false") would.
    typeof value === 'string' ? !['false', '0'].includes(value) : value,
  )
  @IsBoolean()
  DB_SYNCHRONIZE: boolean = true;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_TTL_MS: number = 60_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 100;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return validated;
}
