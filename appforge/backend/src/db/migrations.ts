import { query } from './pool';

export async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');

  // Enable UUID extension
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      display_name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      firebase_uid VARCHAR(255) UNIQUE,
      avatar_url TEXT,
      locale VARCHAR(10) DEFAULT 'en',
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // App configurations table
  await query(`
    CREATE TABLE IF NOT EXISTS app_configs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      config JSONB NOT NULL DEFAULT '{}',
      version VARCHAR(20) DEFAULT '1.0.0',
      is_published BOOLEAN DEFAULT FALSE,
      published_url TEXT,
      github_repo TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Dynamic app data table (stores runtime data for generated apps)
  await query(`
    CREATE TABLE IF NOT EXISTS app_data (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      app_id UUID REFERENCES app_configs(id) ON DELETE CASCADE,
      table_name VARCHAR(100) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Notifications table
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      app_id UUID REFERENCES app_configs(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(50) DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // CSV imports table
  await query(`
    CREATE TABLE IF NOT EXISTS csv_imports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      app_id UUID REFERENCES app_configs(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      filename VARCHAR(255),
      table_name VARCHAR(100),
      row_count INTEGER DEFAULT 0,
      column_mapping JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Audit log table
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      app_id UUID REFERENCES app_configs(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100),
      entity_id VARCHAR(255),
      changes JSONB DEFAULT '{}',
      ip_address VARCHAR(45),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Indexes for performance
  await query(`CREATE INDEX IF NOT EXISTS idx_app_configs_user_id ON app_configs(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_data_app_id ON app_data(app_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_data_table_name ON app_data(app_id, table_name)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_data_user_id ON app_data(user_id)`);

  // Trigger to auto-update updated_at
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  for (const table of ['users', 'app_configs', 'app_data']) {
    await query(`
      DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
      CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  console.log('✅ Database migrations completed');
}
