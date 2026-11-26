-- Additive, idempotent migration: preserves the 17-table operational model.
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(160);
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_emergency_embedding_hnsw
ON emergencies USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- A description edit must never leave a searchable vector for the old text.
CREATE OR REPLACE FUNCTION invalidate_incident_embedding() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    NEW.embedding := NULL;
    NEW.embedding_model := NULL;
    NEW.embedded_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION invalidate_incident_embedding() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_invalidate_incident_embedding ON emergencies;
CREATE TRIGGER trg_invalidate_incident_embedding
BEFORE UPDATE OF description ON emergencies
FOR EACH ROW EXECUTE FUNCTION invalidate_incident_embedding();
