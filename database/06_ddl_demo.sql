-- Isolated temporary-object DDL demonstration. Does not drop application data.
BEGIN;
CREATE TEMPORARY TABLE crisislink_ddl_example (
    example_id INTEGER PRIMARY KEY,
    label VARCHAR(80) NOT NULL
);
ALTER TABLE crisislink_ddl_example
    ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0);
INSERT INTO crisislink_ddl_example(example_id,label) VALUES(1,'DDL practice');
SELECT * FROM crisislink_ddl_example;
DROP TABLE crisislink_ddl_example;
COMMIT;
