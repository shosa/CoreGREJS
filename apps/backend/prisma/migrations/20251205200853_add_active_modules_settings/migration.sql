-- Add active modules settings to core_settings table

-- Insert module settings (all enabled by default)
INSERT INTO core_settings (`key`, `value`, `type`, `group`, created_at, updated_at) VALUES
('module.riparazioni.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.produzione.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.qualita.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.export.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.scm_admin.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.tracking.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.mrp.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.users.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.settings.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.log.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.etichette.enabled', 'true', 'boolean', 'modules', NOW(), NOW()),
('module.dbsql.enabled', 'true', 'boolean', 'modules', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();
