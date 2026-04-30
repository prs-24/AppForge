// ============================================================
// AppForge — Core Type Definitions
// ============================================================

export interface AppConfig {
  id?: string;
  name: string;
  description?: string;
  version?: string;
  language?: string; // for i18n
  auth?: AuthConfig;
  ui?: UIConfig;
  api?: APIConfig;
  database?: DatabaseConfig;
  notifications?: NotificationConfig;
  theme?: ThemeConfig;
}

export interface AuthConfig {
  enabled: boolean;
  methods?: ('email' | 'google' | 'github')[];
  userFields?: FieldDefinition[];
  loginPage?: PageConfig;
  signupPage?: PageConfig;
}

export interface UIConfig {
  pages?: PageConfig[];
  components?: ComponentDefinition[];
  layout?: 'sidebar' | 'topnav' | 'minimal';
  theme?: string;
}

export interface PageConfig {
  id: string;
  name: string;
  path: string;
  title?: string;
  components?: ComponentDefinition[];
  permissions?: string[];
}

export interface ComponentDefinition {
  id: string;
  type: 'form' | 'table' | 'dashboard' | 'chart' | 'card' | 'list' | 'custom';
  title?: string;
  fields?: FieldDefinition[];
  columns?: ColumnDefinition[];
  dataSource?: string; // references API endpoint name
  actions?: ActionDefinition[];
  config?: Record<string, unknown>;
}

export interface FieldDefinition {
  name: string;
  label?: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'boolean' | 'select' | 'textarea' | 'file';
  required?: boolean;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  validation?: ValidationRule[];
  placeholder?: string;
}

export interface ColumnDefinition {
  key: string;
  label?: string;
  type?: string;
  sortable?: boolean;
  filterable?: boolean;
}

export interface ActionDefinition {
  id: string;
  label: string;
  type: 'submit' | 'delete' | 'navigate' | 'api';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  navigateTo?: string;
  confirmMessage?: string;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'required';
  value?: string | number;
  message?: string;
}

export interface APIConfig {
  endpoints?: EndpointDefinition[];
}

export interface EndpointDefinition {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  auth?: boolean;
  body?: FieldDefinition[];
  query?: FieldDefinition[];
  response?: Record<string, unknown>;
  dataSource?: string; // references database table
}

export interface DatabaseConfig {
  tables?: TableDefinition[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnSchema[];
  indexes?: string[];
}

export interface ColumnSchema {
  name: string;
  type: 'text' | 'integer' | 'boolean' | 'timestamp' | 'jsonb' | 'uuid' | 'decimal';
  nullable?: boolean;
  unique?: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
  references?: { table: string; column: string };
}

export interface NotificationConfig {
  events?: NotificationEvent[];
  email?: boolean;
  inApp?: boolean;
}

export interface NotificationEvent {
  trigger: string;
  template: string;
  channels: ('email' | 'inApp')[];
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  darkMode?: boolean;
  fontFamily?: string;
}

// Auth types
export interface User {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
  createdAt?: Date;
  firebaseUid?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

// Request extensions
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      appConfig?: AppConfig;
    }
  }
}
