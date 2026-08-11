-- 月账单对账日推交易时的毕业标记
ALTER TABLE `Transaction` ADD COLUMN `graduatedFromDaily` BOOLEAN NOT NULL DEFAULT false;
