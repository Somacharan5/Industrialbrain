-- Industrial Brain — Complete Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Documents ─────────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
    'pid', 'procedure', 'maintenance', 'inspection', 'incident',
    'regulatory', 'oem_manual', 'qa_record', 'project_doc', 'email_archive', 'other'
  )),
  file_path       TEXT NOT NULL,
  file_size       BIGINT DEFAULT 0,
  mime_type       TEXT DEFAULT '',
  plant_area      TEXT,
  equipment_tags  TEXT[] DEFAULT '{}',
  regulatory_refs TEXT[] DEFAULT '{}',
  chunk_count     INTEGER DEFAULT 0,
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  summary         TEXT,
  status          TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_plant_area ON documents(plant_area);
CREATE INDEX idx_documents_equipment_tags ON documents USING GIN(equipment_tags);
CREATE INDEX idx_documents_status ON documents(status);

-- ─── Document Chunks (with vector embeddings) ──────────────────────────────────
CREATE TABLE document_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  embedding       VECTOR(384),   -- all-MiniLM-L6-v2 dimensions
  equipment_tags  TEXT[] DEFAULT '{}',
  entities        JSONB DEFAULT '[]',
  page_number     INTEGER,
  section_heading TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_equipment_tags ON document_chunks USING GIN(equipment_tags);
-- Vector similarity index (HNSW for fast ANN search)
CREATE INDEX idx_chunks_embedding ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ─── Vector Search Function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding     VECTOR(384),
  match_threshold     FLOAT DEFAULT 0.72,
  match_count         INTEGER DEFAULT 8,
  filter_doc_types    TEXT[] DEFAULT NULL,
  filter_equipment_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  document_id     UUID,
  chunk_index     INTEGER,
  content         TEXT,
  equipment_tags  TEXT[],
  entities        JSONB,
  page_number     INTEGER,
  section_heading TEXT,
  similarity      FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    dc.equipment_tags,
    dc.entities,
    dc.page_number,
    dc.section_heading,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE
    d.status = 'ready'
    AND (filter_doc_types IS NULL OR d.doc_type = ANY(filter_doc_types))
    AND (filter_equipment_tags IS NULL OR dc.equipment_tags && filter_equipment_tags)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── Knowledge Graph — Nodes ───────────────────────────────────────────────────
CREATE TABLE knowledge_nodes (
  id           TEXT PRIMARY KEY,   -- e.g. "equipment:p-101"
  label        TEXT NOT NULL,
  node_type    TEXT NOT NULL CHECK (node_type IN (
    'equipment', 'procedure', 'incident', 'regulation',
    'chemical', 'person', 'location', 'document'
  )),
  properties   JSONB DEFAULT '{}',
  document_ids UUID[] DEFAULT '{}',
  risk_level   TEXT CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nodes_node_type ON knowledge_nodes(node_type);
CREATE INDEX idx_nodes_risk_level ON knowledge_nodes(risk_level);

-- ─── Knowledge Graph — Edges ───────────────────────────────────────────────────
CREATE TABLE knowledge_edges (
  id           TEXT PRIMARY KEY,   -- e.g. "equipment:p101|REQUIRES|procedure:sop047"
  source_id    TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  target_id    TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,      -- REQUIRES, GOVERNED_BY, CAUSED, DOCUMENTED_IN, etc.
  weight       FLOAT DEFAULT 1,
  document_ids UUID[] DEFAULT '{}',
  properties   JSONB DEFAULT '{}'
);

CREATE INDEX idx_edges_source ON knowledge_edges(source_id);
CREATE INDEX idx_edges_target ON knowledge_edges(target_id);
CREATE INDEX idx_edges_relationship ON knowledge_edges(relationship);

-- ─── Graph Neighborhood Function ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_graph_neighborhood(
  start_node_id TEXT,
  max_depth     INTEGER DEFAULT 2
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  visited_ids  TEXT[] := ARRAY[start_node_id];
  current_ids  TEXT[] := ARRAY[start_node_id];
  next_ids     TEXT[];
  depth        INTEGER := 0;
  result_nodes JSON;
  result_edges JSON;
BEGIN
  WHILE depth < max_depth AND array_length(current_ids, 1) > 0 LOOP
    SELECT ARRAY_AGG(DISTINCT neighbor_id)
    INTO next_ids
    FROM (
      SELECT target_id AS neighbor_id FROM knowledge_edges WHERE source_id = ANY(current_ids)
      UNION
      SELECT source_id AS neighbor_id FROM knowledge_edges WHERE target_id = ANY(current_ids)
    ) sub
    WHERE neighbor_id <> ALL(visited_ids);

    IF next_ids IS NOT NULL THEN
      visited_ids := visited_ids || next_ids;
      current_ids := next_ids;
    ELSE
      EXIT;
    END IF;
    depth := depth + 1;
  END LOOP;

  SELECT json_agg(n) INTO result_nodes FROM knowledge_nodes n WHERE id = ANY(visited_ids);
  SELECT json_agg(e) INTO result_edges FROM knowledge_edges e
  WHERE source_id = ANY(visited_ids) AND target_id = ANY(visited_ids);

  RETURN json_build_object('nodes', result_nodes, 'edges', result_edges);
END;
$$;

-- ─── Compliance Flags ──────────────────────────────────────────────────────────
CREATE TABLE compliance_flags (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  severity            TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'observation')),
  regulation          TEXT NOT NULL,
  description         TEXT NOT NULL,
  equipment_tag       TEXT,
  document_id         UUID REFERENCES documents(id),
  detected_at         TIMESTAMPTZ DEFAULT NOW(),
  status              TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  recommended_action  TEXT NOT NULL,
  resolved_at         TIMESTAMPTZ,
  notes               TEXT
);

CREATE INDEX idx_flags_severity ON compliance_flags(severity);
CREATE INDEX idx_flags_status ON compliance_flags(status);

-- ─── Maintenance Records ───────────────────────────────────────────────────────
CREATE TABLE maintenance_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_tag     TEXT NOT NULL,
  work_order_no     TEXT,
  description       TEXT NOT NULL,
  failure_mode      TEXT,
  corrective_action TEXT,
  performed_by      TEXT,
  completed_at      TIMESTAMPTZ,
  downtime_hours    FLOAT DEFAULT 0,
  document_id       UUID REFERENCES documents(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maint_equipment ON maintenance_records(equipment_tag);
CREATE INDEX idx_maint_completed ON maintenance_records(completed_at DESC);

-- ─── Query History ─────────────────────────────────────────────────────────────
CREATE TABLE query_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question          TEXT NOT NULL,
  mode              TEXT DEFAULT 'expert',
  response_time_ms  INTEGER,
  citations_count   INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Dashboard Stats Function ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_documents',      (SELECT COUNT(*) FROM documents WHERE status = 'ready'),
    'total_chunks',         (SELECT COUNT(*) FROM document_chunks),
    'total_entities',       (SELECT COUNT(*) FROM knowledge_nodes),
    'knowledge_graph_edges',(SELECT COUNT(*) FROM knowledge_edges),
    'queries_today',        (SELECT COUNT(*) FROM query_history WHERE created_at > NOW() - INTERVAL '24 hours'),
    'avg_response_time_ms', (SELECT COALESCE(AVG(response_time_ms), 0) FROM query_history WHERE created_at > NOW() - INTERVAL '7 days'),
    'compliance_score',     (
      SELECT CASE 
        WHEN COUNT(*) = 0 THEN 100
        ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'resolved') / COUNT(*))
      END
      FROM compliance_flags
    ),
    'stale_documents',      (
      SELECT COUNT(*) FROM documents 
      WHERE status = 'ready' AND updated_at < NOW() - INTERVAL '180 days'
    ),
    'active_flags',         (SELECT COUNT(*) FROM compliance_flags WHERE status = 'open')
  ) INTO stats;
  RETURN stats;
END;
$$;

-- ─── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_nodes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_flags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history      ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo (tighten in production with auth policies)
CREATE POLICY "public_all" ON documents          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON document_chunks    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON knowledge_nodes    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON knowledge_edges    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON compliance_flags   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON query_history      FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed compliance flags (for demo) ─────────────────────────────────────────
INSERT INTO compliance_flags (severity, regulation, description, equipment_tag, detected_at, status, recommended_action) VALUES
('critical', 'OISD-118 Clause 6.2.1', 'Gas detection calibration records for coke oven battery area overdue by 47 days. Last calibration: 12 Feb 2026.', 'GD-301', '2026-06-18T09:22:00Z', 'open', 'Immediate calibration of gas detectors GD-301 through GD-308. Halt hot work permits in area until resolved.'),
('critical', 'Factory Act 1948 S.36 — Pressure Vessels', 'IBR certificate for steam drum V-102 expired 3 months ago. No renewal record found in document corpus.', 'V-102', '2026-06-17T14:10:00Z', 'open', 'Contact Chief Inspector of Factories. Obtain provisional IBR certificate. Do not operate above 50% pressure until renewed.'),
('major', 'OISD-137 Clause 4.1.3 — Rotating Equipment', 'Vibration monitoring records for 6 of 12 critical pumps in Area 2 not updated in over 90 days.', NULL, '2026-06-15T11:30:00Z', 'open', 'Conduct immediate vibration survey. Update PdM database. Review PM schedule for quarterly monitoring compliance.'),
('major', 'PESO Explosives Act — Storage License', 'Quantity of bulk explosives in magazine M-01 exceeds licensed storage limit by 12% per June inventory record.', NULL, '2026-06-14T08:45:00Z', 'acknowledged', 'Reduce magazine stock below licensed limit. Inform PESO regional office. Review procurement scheduling.'),
('minor', 'OISD-155 Clause 3.4 — Emergency Eyewash', '3 eyewash stations in electrical substation area missing from weekly test log for 2 consecutive weeks.', NULL, '2026-06-12T16:20:00Z', 'open', 'Update test log retroactively if stations are functional. Add to daily operator rounds.');
