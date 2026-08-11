-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `fingerprint` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'bill',
    ADD COLUMN `txTime` VARCHAR(191) NULL,
    MODIFY `uploadId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Transaction_fingerprint_key` ON `Transaction`(`fingerprint`);

