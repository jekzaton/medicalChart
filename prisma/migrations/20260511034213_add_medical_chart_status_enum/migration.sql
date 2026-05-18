-- CreateTable
CREATE TABLE `medical_chart` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hn` VARCHAR(191) NOT NULL,
    `an` VARCHAR(191) NOT NULL,
    `fullname` VARCHAR(191) NOT NULL,
    `regdate` DATETIME(3) NOT NULL,
    `dchdate` DATETIME(3) NOT NULL,
    `doctor_code` VARCHAR(191) NOT NULL,
    `num_date` VARCHAR(191) NOT NULL,
    `status_chart` ENUM('success', 'warning') NOT NULL DEFAULT 'warning',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
