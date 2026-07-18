-- Rattache les catégories à un type de demande, les sous-catégories à une
-- priorité par défaut, et un processus IT à un type/catégorie/sous-catégorie
-- imposés. Ajoute aussi un bénéficiaire optionnel sur le ticket.
--
-- Les colonnes requises sont ajoutées en nullable, remplies avec des valeurs
-- par défaut raisonnables pour les données existantes, puis rendues NOT NULL
-- (les catégories/processus déjà en base seront à réviser manuellement via
-- l'admin pour leur assigner le bon type/priorité, mais rien ne casse).

-- DropForeignKey (recréée plus bas avec ON DELETE RESTRICT car la colonne devient obligatoire)
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_subCategoryId_fkey";

-- DropIndex (le nom de catégorie n'est plus unique globalement, seulement par type)
DROP INDEX "Category_name_key";

-- AlterTable (colonnes nullable dans un premier temps)
ALTER TABLE "Category" ADD COLUMN "ticketTypeId" TEXT;
ALTER TABLE "SubCategory" ADD COLUMN "priorityId" TEXT;
ALTER TABLE "Process" ADD COLUMN "typeId" TEXT,
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "subCategoryId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "beneficiaryId" TEXT;

-- Backfill : catégories -> premier type de demande existant
UPDATE "Category"
SET "ticketTypeId" = (SELECT id FROM "TicketType" ORDER BY "createdAt" ASC, id ASC LIMIT 1)
WHERE "ticketTypeId" IS NULL;

-- Backfill : sous-catégories -> priorité "Moyenne" si elle existe, sinon la priorité la plus basse
UPDATE "SubCategory"
SET "priorityId" = COALESCE(
  (SELECT id FROM "Priority" WHERE name = 'Moyenne' LIMIT 1),
  (SELECT id FROM "Priority" ORDER BY level ASC, id ASC LIMIT 1)
)
WHERE "priorityId" IS NULL;

-- Garantit qu'aucune catégorie ne se retrouve sans sous-catégorie (nécessaire
-- puisque la sous-catégorie devient obligatoire sur le ticket)
INSERT INTO "SubCategory" (id, name, "categoryId", "priorityId", "isActive", "createdAt")
SELECT
  gen_random_uuid()::text,
  'Autre',
  c.id,
  COALESCE(
    (SELECT id FROM "Priority" WHERE name = 'Moyenne' LIMIT 1),
    (SELECT id FROM "Priority" ORDER BY level ASC, id ASC LIMIT 1)
  ),
  true,
  now()
FROM "Category" c
WHERE NOT EXISTS (SELECT 1 FROM "SubCategory" sc WHERE sc."categoryId" = c.id);

-- Backfill : tickets déjà créés sans sous-catégorie -> sous-catégorie "Autre"
-- de leur catégorie si elle existe, sinon la première sous-catégorie disponible
UPDATE "Ticket" t
SET "subCategoryId" = (
  SELECT sc.id FROM "SubCategory" sc
  WHERE sc."categoryId" = t."categoryId"
  ORDER BY (sc.name = 'Autre') DESC, sc."createdAt" ASC, sc.id ASC
  LIMIT 1
)
WHERE t."subCategoryId" IS NULL;

-- Backfill : processus existants -> premier type/catégorie/sous-catégorie
-- disponibles (à réviser manuellement depuis l'admin pour un rattachement
-- pertinent à chaque processus)
DO $$
DECLARE
  default_type_id TEXT;
  default_category_id TEXT;
  default_subcategory_id TEXT;
BEGIN
  SELECT id INTO default_type_id FROM "TicketType" ORDER BY "createdAt" ASC, id ASC LIMIT 1;
  SELECT id INTO default_category_id FROM "Category" WHERE "ticketTypeId" = default_type_id ORDER BY "createdAt" ASC, id ASC LIMIT 1;
  SELECT id INTO default_subcategory_id FROM "SubCategory" WHERE "categoryId" = default_category_id ORDER BY "createdAt" ASC, id ASC LIMIT 1;

  IF default_type_id IS NOT NULL THEN
    UPDATE "Process"
    SET "typeId" = default_type_id,
        "categoryId" = default_category_id,
        "subCategoryId" = default_subcategory_id
    WHERE "typeId" IS NULL;
  END IF;
END $$;

-- AlterTable : rendre les colonnes obligatoires maintenant qu'elles sont remplies
ALTER TABLE "Category" ALTER COLUMN "ticketTypeId" SET NOT NULL;
ALTER TABLE "SubCategory" ALTER COLUMN "priorityId" SET NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "subCategoryId" SET NOT NULL;
ALTER TABLE "Process" ALTER COLUMN "typeId" SET NOT NULL,
  ALTER COLUMN "categoryId" SET NOT NULL,
  ALTER COLUMN "subCategoryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Category_ticketTypeId_idx" ON "Category"("ticketTypeId");
CREATE UNIQUE INDEX "Category_ticketTypeId_name_key" ON "Category"("ticketTypeId", "name");
CREATE INDEX "Process_typeId_idx" ON "Process"("typeId");
CREATE INDEX "Process_categoryId_idx" ON "Process"("categoryId");
CREATE INDEX "Process_subCategoryId_idx" ON "Process"("subCategoryId");
CREATE INDEX "SubCategory_priorityId_idx" ON "SubCategory"("priorityId");
CREATE INDEX "Ticket_beneficiaryId_idx" ON "Ticket"("beneficiaryId");
CREATE INDEX "Ticket_subCategoryId_idx" ON "Ticket"("subCategoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "Priority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Process" ADD CONSTRAINT "Process_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Process" ADD CONSTRAINT "Process_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Process" ADD CONSTRAINT "Process_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
