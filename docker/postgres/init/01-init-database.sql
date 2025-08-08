-- PostgreSQL initialization script for KIT Canteen Application
-- Creates database and user with proper permissions

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE kit_canteen'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kit_canteen')\gexec

-- Connect to the kit_canteen database
\c kit_canteen;

-- Create application user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kit_canteen_user') THEN
        CREATE ROLE kit_canteen_user WITH LOGIN PASSWORD 'kit_canteen_password';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE kit_canteen TO kit_canteen_user;
GRANT ALL ON SCHEMA public TO kit_canteen_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kit_canteen_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kit_canteen_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kit_canteen_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kit_canteen_user;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log completion
SELECT 'PostgreSQL initialization completed for kit_canteen database' as message;