-- Emergency database reset script for Digital Ocean
-- Run this with psql to reset your database without SSL verification issues

-- Drop all tables by dropping and recreating the schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Grant necessary permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Confirm reset was successful
SELECT 'Database schema has been reset successfully!' AS message;