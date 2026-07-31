-- Guide series: type 'guide' + section/order de xep chuong trong series.
-- Chi tiet: docs/plans/2026-07-30-guide-series-design.md
--
-- Tu chua: DB that chua tung chay add_blogs_type_column.sql nen cot type
-- chua ton tai — them cot truoc, roi moi tao CHECK constraint.

ALTER TABLE blogs ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'post';

ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_type_check;
ALTER TABLE blogs ADD CONSTRAINT blogs_type_check
  CHECK (type IN ('post', 'note', 'reading', 'paper', 'guide'));

CREATE INDEX IF NOT EXISTS blogs_type_idx
  ON blogs(type)
  WHERE deleted_at IS NULL;

-- Chi co nghia khi type = 'guide'. numeric de chen giua (2.5) khong phai danh so lai.
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS guide_section text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS guide_order numeric;
