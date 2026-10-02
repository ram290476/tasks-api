import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/** "false" / "0" must not coerce to true like Boolean("false") would. */
const ToBoolean = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? !['false', '0', ''].includes(value) : value,
  );

export enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace',
  Silent = 'silent',
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
  @IsNotEmpty()
  DATABASE_URL: string;

  @ToBoolean()
  @IsBoolean()
  DB_SSL: boolean = false;

  /** Apply pending migrations on startup. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  DB_POOL_MAX: number = 10;

  @ToBoolean()
  @IsBoolean()
  DB_MIGRATIONS_RUN: boolean = true;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS: number = 900;

  @IsString()
  @IsNotEmpty()
  JWT_ISSUER: string = 'tasks-api';

  /** Comma-separated list of allowed origins. Unset = CORS disabled. */
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  /**
   * Number of reverse proxies / load balancers in front of the app. Required
   * for correct client IPs (and therefore rate limiting) behind a proxy.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY_HOPS: number = 0;

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Info;

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
