CREATE TYPE "Status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');


CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "firebase_uid" TEXT,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "neighborhoods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "status" "Status" NOT NULL DEFAULT 'OPEN',
    "author_id" TEXT NOT NULL,
    "neighborhood_id" TEXT NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "status_change" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "from_status" "Status" NOT NULL,
    "to_status" "Status" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,

    CONSTRAINT "status_change_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_CategoryToReport" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToReport_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE UNIQUE INDEX "Role_title_key" ON "Role"("title");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "users_role_id_idx" ON "users"("role_id");

CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

CREATE INDEX "neighborhoods_city_id_idx" ON "neighborhoods"("city_id");

CREATE UNIQUE INDEX "neighborhoods_city_id_name_key" ON "neighborhoods"("city_id", "name");

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

CREATE INDEX "reports_author_id_idx" ON "reports"("author_id");

CREATE INDEX "reports_neighborhood_id_idx" ON "reports"("neighborhood_id");

CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

CREATE INDEX "attachments_report_id_idx" ON "attachments"("report_id");

CREATE INDEX "status_change_report_id_changed_at_idx" ON "status_change"("report_id", "changed_at");

CREATE INDEX "_CategoryToReport_B_index" ON "_CategoryToReport"("B");

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "status_change" ADD CONSTRAINT "status_change_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_CategoryToReport" ADD CONSTRAINT "_CategoryToReport_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_CategoryToReport" ADD CONSTRAINT "_CategoryToReport_B_fkey" FOREIGN KEY ("B") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
