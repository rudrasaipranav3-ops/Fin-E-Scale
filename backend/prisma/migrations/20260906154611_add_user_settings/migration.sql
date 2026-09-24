-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "forecastAlerts" BOOLEAN NOT NULL DEFAULT true,
    "riskAlerts" BOOLEAN NOT NULL DEFAULT true,
    "recommendationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "dashboardDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "defaultForecastHorizon" INTEGER NOT NULL DEFAULT 30,
    "defaultDateRange" TEXT NOT NULL DEFAULT '30d',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
