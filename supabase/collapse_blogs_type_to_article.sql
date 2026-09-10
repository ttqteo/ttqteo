-- Gop 4 post type con 2: 'article' va 'guide'.
--
-- Phia doc da map cac gia tri cu ve 'article' trong normalizeType, nen bai cu
-- van hien thi binh thuong ma khong can dong vao DB. Nhung phia GHI thi gui
-- thang 'article' xuong, va CHECK constraint cu chua tung biet gia tri do —
-- nen moi luot save deu bi tu choi:
--   new row for relation "blogs" violates check constraint "blogs_type_check"
--
-- Thu tu bat buoc: bo constraint truoc, backfill, roi moi dung constraint moi.
-- Lam nguoc lai se fail, vi luc them constraint cac dong cu chua thoa.
-- Chay lai file nay bao nhieu lan cung duoc.

ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_type_check;

-- Bat ky thu gi khong phai 'guide' deu thanh article — dung y het normalizeType
-- o phia doc. Hai ben phai dong y ve cung mot phep map, khong duoc lech.
-- IS DISTINCT FROM de bat luon NULL, phong truong hop co dong cu con sot.
UPDATE blogs SET type = 'article' WHERE type IS DISTINCT FROM 'guide';

-- Default cu la 'post': mot insert khong kem type se vi pham constraint moi
-- ngay lap tuc. Doi truoc khi dung constraint.
ALTER TABLE blogs ALTER COLUMN type SET DEFAULT 'article';

ALTER TABLE blogs ADD CONSTRAINT blogs_type_check
  CHECK (type IN ('article', 'guide'));
