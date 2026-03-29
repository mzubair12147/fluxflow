export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  dbUrl: string;
}

export interface RedisConfig {
  host: string;
  port: number;
}
