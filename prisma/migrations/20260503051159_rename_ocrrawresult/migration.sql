/*
  Warnings:

  - You are about to drop the column `ocrRawResult` on the `Upload` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Upload` DROP COLUMN `ocrRawResult`,
    ADD COLUMN `parsedRawText` TEXT NULL;
