/*
  Warnings:

  - A unique constraint covering the columns `[hn]` on the table `medical_chart` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `medical_chart_hn_key` ON `medical_chart`(`hn`);
