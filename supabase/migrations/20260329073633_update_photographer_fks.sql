-- Update the foreign key on public.images (uploaded_by) to ON DELETE SET NULL
-- This prevents images from being cascaded and deleted if a photographer account is removed.

DO $$
DECLARE
    fk_record record;
    target_table text;
    drop_sql text;
    add_sql text;
BEGIN
    -- Dynamically find the foreign key assigned to images.uploaded_by
    FOR fk_record IN 
        SELECT
            tc.constraint_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'images'
          AND kcu.column_name = 'uploaded_by'
    LOOP
        target_table := fk_record.foreign_table_schema || '.' || fk_record.foreign_table_name;
        
        -- Build the DROP statement
        drop_sql := format('ALTER TABLE public.images DROP CONSTRAINT %I', fk_record.constraint_name);
        EXECUTE drop_sql;
        
        -- Build the ADD statement with ON DELETE SET NULL
        -- Keeping the exact same name and reference target, just changing the ON DELETE
        add_sql := format(
            'ALTER TABLE public.images ADD CONSTRAINT %I FOREIGN KEY (uploaded_by) REFERENCES %s(%I) ON DELETE SET NULL',
            fk_record.constraint_name,
            target_table,
            fk_record.foreign_column_name
        );
        EXECUTE add_sql;
        
        RAISE NOTICE 'Updated foreign key % on images.uploaded_by to ON DELETE SET NULL', fk_record.constraint_name;
    END LOOP;
END $$;
