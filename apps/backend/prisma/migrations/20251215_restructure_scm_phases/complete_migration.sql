-- Complete the migration (table already exists from previous partial run)

-- Step 1: Migrate data from scm_launch_phases to scm_article_phases (if not already done)
-- First check if there's data to migrate
INSERT INTO `scm_article_phases` (
    `article_id`,
    `phase_id`,
    `nome`,
    `stato`,
    `data_inizio`,
    `data_fine`,
    `note`,
    `created_at`,
    `updated_at`
)
SELECT
    a.id AS article_id,
    p.phase_id,
    p.nome,
    p.stato,
    p.data_inizio,
    p.data_fine,
    p.note,
    p.created_at,
    p.updated_at
FROM scm_launch_phases p
CROSS JOIN scm_launch_articles a
WHERE p.launch_id = a.launch_id
  AND NOT EXISTS (
    SELECT 1 FROM scm_article_phases ap
    WHERE ap.article_id = a.id AND ap.phase_id = p.phase_id
  )
ORDER BY a.id, p.id;

-- Step 2: Update scm_progress_tracking to reference article phases
CREATE TEMPORARY TABLE IF NOT EXISTS phase_mapping AS
SELECT
    old_p.id AS old_phase_id,
    new_p.id AS new_phase_id,
    a.id AS article_id
FROM scm_launch_phases old_p
CROSS JOIN scm_launch_articles a
INNER JOIN scm_article_phases new_p
    ON new_p.article_id = a.id
    AND new_p.phase_id = old_p.phase_id
    AND new_p.nome = old_p.nome
WHERE old_p.launch_id = a.launch_id;

-- Update progress tracking references
UPDATE scm_progress_tracking pt
INNER JOIN (
    SELECT
        old_phase_id,
        MIN(new_phase_id) as new_phase_id
    FROM phase_mapping
    GROUP BY old_phase_id
) mapping ON pt.phase_id = mapping.old_phase_id
SET pt.phase_id = mapping.new_phase_id
WHERE pt.phase_id IN (SELECT id FROM scm_launch_phases);

-- Step 3: Drop foreign key constraint from scm_progress_tracking
ALTER TABLE `scm_progress_tracking` DROP FOREIGN KEY `scm_progress_tracking_phase_id_fkey`;

-- Step 4: Drop old scm_launch_phases table
DROP TABLE IF EXISTS `scm_launch_phases`;

-- Step 5: Add new foreign key constraint to scm_progress_tracking
ALTER TABLE `scm_progress_tracking` ADD CONSTRAINT `scm_progress_tracking_phase_id_fkey`
    FOREIGN KEY (`phase_id`) REFERENCES `scm_article_phases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
