-- CreateIndex
CREATE UNIQUE INDEX "checklists_userId_weekId_key" ON "checklists"("userId", "weekId");

-- CreateIndex
CREATE UNIQUE INDEX "checklists_userId_dayId_key" ON "checklists"("userId", "dayId");
