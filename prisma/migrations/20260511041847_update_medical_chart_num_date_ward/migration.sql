/*
  Warnings:

  - Added the required column `ward_name` to the `medical_chart` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `medical_chart` ADD COLUMN `ward_name` VARCHAR(191) NOT NULL;
