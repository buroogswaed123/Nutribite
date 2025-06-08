USE nutribite_db;

-- Remove verification related columns
ALTER TABLE users DROP COLUMN verification_token;
ALTER TABLE users DROP COLUMN verification_status;
ALTER TABLE users DROP COLUMN verification_expires_at;
ALTER TABLE users DROP COLUMN email_verified;

-- Keep only password reset columns
ALTER TABLE users MODIFY COLUMN reset_token VARCHAR(255) NULL;
ALTER TABLE users MODIFY COLUMN reset_token_expires_at TIMESTAMP NULL;
