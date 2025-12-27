-- Fix existing couriers to have is_active = 0 by default
-- Only couriers who are currently 'active' or 'on route' should have is_active = 1

USE nutribite_db;

-- Set is_active based on current status
UPDATE couriers 
SET is_active = CASE 
    WHEN status IN ('active', 'on route') THEN 1 
    ELSE 0 
END;

-- Ensure the column has a proper default value for new couriers
ALTER TABLE couriers 
MODIFY COLUMN is_active TINYINT(1) DEFAULT 0;

-- Verify the changes
SELECT courier_id, name, status, is_active, deliveries_assigned 
FROM couriers;
