-- Migration: Restructure SCM phases from launch-based to article-based
-- Now each article has its own timeline of phases

-- Step 1: Create new scm_article_phases table
CREATE TABLE `scm_article_phases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `article_id` INTEGER NOT NULL,
    `phase_id` INTEGER NULL,
    `nome` VARCHAR(100) NOT NULL,
    `stato` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `data_inizio` DATETIME(3) NULL,
    `data_fine` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 2: Add foreign keys
ALTER TABLE `scm_article_phases` ADD CONSTRAINT `scm_article_phases_article_id_fkey`
    FOREIGN KEY (`article_id`) REFERENCES `scm_launch_articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `scm_article_phases` ADD CONSTRAINT `scm_article_phases_phase_id_fkey`
    FOREIGN KEY (`phase_id`) REFERENCES `scm_standard_phases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 3: Migrate data from scm_launch_phases to scm_article_phases
-- For each launch phase, create a copy for each article in that launch
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
ORDER BY a.id, p.id;

-- Step 4: Update scm_progress_tracking to reference article phases
-- Create a temporary mapping table
CREATE TEMPORARY TABLE phase_mapping AS
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
-- Note: We'll assign tracking to the first article of each launch
UPDATE scm_progress_tracking pt
INNER JOIN (
    SELECT
        old_phase_id,
        MIN(new_phase_id) as new_phase_id
    FROM phase_mapping
    GROUP BY old_phase_id
) mapping ON pt.phase_id = mapping.old_phase_id
SET pt.phase_id = mapping.new_phase_id;

-- Step 5: Drop foreign key constraint from scm_progress_tracking first
ALTER TABLE `scm_progress_tracking` DROP FOREIGN KEY `scm_progress_tracking_phase_id_fkey`;

-- Step 6: Drop old scm_launch_phases table
DROP TABLE `scm_launch_phases`;

-- Step 7: Add new foreign key constraint to scm_progress_tracking
ALTER TABLE `scm_progress_tracking` ADD CONSTRAINT `scm_progress_tracking_phase_id_fkey`
    FOREIGN KEY (`phase_id`) REFERENCES `scm_article_phases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
