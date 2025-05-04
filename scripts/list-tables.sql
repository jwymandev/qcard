-- Script to list all tables in the public schema
SELECT 
    tablename as "Table Name", 
    pg_size_pretty(pg_total_relation_size('"' || tablename || '"')) as "Size",
    pg_relation_size('"' || tablename || '"') > 0 as "Has Data"
FROM 
    pg_tables 
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename;