import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Pool, PoolClient, QueryResult, types } from 'pg';

// PostgreSQL DATE (OID 1082) should remain a date-only string.
// This prevents timezone conversion such as:
// "2001-07-20" -> "2001-07-19T18:30:00.000Z"
types.setTypeParser(1082, (value) => value);

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger = new Logger(DbService.name);

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST'),
      port: Number(this.configService.get<string>('DB_PORT')),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
    });
  }

  async onModuleInit() {
    try {
      const result = await this.pool.query('SELECT NOW()');

      this.logger.log('Database connected successfully');
      this.logger.debug(result.rows[0]);
    } catch (error) {
      console.error('❌ Database connection failed');
      console.error(error);
    }
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    return this.pool.query(sql, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database connection closed');
  }
}