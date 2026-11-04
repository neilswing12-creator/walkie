
-- Data: glasses move from the HEAD slot to the new FACE slot
UPDATE "Item" SET "slot" = 'FACE' WHERE "key" = 'acc_sunglasses';
UPDATE "EquippedAccessory" SET "slot" = 'FACE' WHERE "itemId" IN (SELECT "id" FROM "Item" WHERE "key" = 'acc_sunglasses');
