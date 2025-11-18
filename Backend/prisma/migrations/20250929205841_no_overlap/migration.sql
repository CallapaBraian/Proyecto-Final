-- Habilitar extensión para usar GiST con tipos btree
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Columna generada con rango [checkin, checkout) SIN zona horaria
ALTER TABLE "Reservation"
ADD COLUMN "period" tsrange
GENERATED ALWAYS AS (tsrange("checkin", "checkout", '[)')) STORED;

-- Evitar reservas solapadas por habitación
ALTER TABLE "Reservation"
ADD CONSTRAINT "no_overlap"
EXCLUDE USING gist ("roomId" WITH =, "period" WITH &&);
