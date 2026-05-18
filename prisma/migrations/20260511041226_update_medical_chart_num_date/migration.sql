/*
  Warnings:

  - You are about to alter the column `num_date` on the `medical_chart` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `medical_chart` MODIFY `num_date` INTEGER NOT NULL DEFAULT 0;
