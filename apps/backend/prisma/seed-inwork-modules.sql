-- Insert InWork available modules
INSERT INTO inwork_available_modules (module_id, module_name, descrizione, attivo, ordine, created_at, updated_at)
VALUES
  ('quality', 'Quality Control', 'Controllo Qualità produzione', true, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  module_name = VALUES(module_name),
  descrizione = VALUES(descrizione),
  attivo = VALUES(attivo),
  ordine = VALUES(ordine),
  updated_at = NOW();
