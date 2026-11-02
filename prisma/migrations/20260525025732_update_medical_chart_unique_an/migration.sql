/*
  Warnings:

  - A unique constraint covering the columns `[an]` on the table `medical_chart` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `medical_chart_hn_key` ON `medical_chart`;

-- CreateIndex
CREATE UNIQUE INDEX `medical_chart_an_key` ON `medical_chart`(`an`);
