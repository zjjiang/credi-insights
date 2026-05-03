-- AlterTable
ALTER TABLE `Upload` ADD COLUMN `billingEnd` DATETIME(3) NULL,
    ADD COLUMN `billingStart` DATETIME(3) NULL,
    ADD COLUMN `dueDate` DATETIME(3) NULL;
