ALTER TABLE locations ADD COLUMN IF NOT EXISTS search_embedding vector(384);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS search_model VARCHAR(160);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS search_text TEXT;
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS reported_location_text TEXT;
CREATE INDEX IF NOT EXISTS idx_location_embedding_hnsw
ON locations USING hnsw (search_embedding vector_cosine_ops)
WHERE search_embedding IS NOT NULL;
GRANT INSERT ON locations TO crisis_coordinator;
