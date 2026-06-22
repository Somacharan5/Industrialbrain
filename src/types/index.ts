// ─── Document Types ────────────────────────────────────────────────────────────

export type DocType =
  | 'pid'           // P&ID / Engineering Drawing
  | 'procedure'     // Operating / Safety Procedure
  | 'maintenance'   // Work Order / Maintenance Record
  | 'inspection'    // Inspection Report
  | 'incident'      // Incident / Near-Miss Report
  | 'regulatory'    // Factory Act / OISD / PESO Compliance
  | 'oem_manual'    // OEM Equipment Manual
  | 'qa_record'     // Quality / Test Record
  | 'project_doc'   // Engineering Project Document
  | 'email_archive' // Email Archive
  | 'other'

export interface Document {
  id: string
  title: string
  doc_type: DocType
  file_path: string
  file_size: number
  mime_type: string
  plant_area?: string
  equipment_tags: string[]       // e.g. ["P-101", "V-302"]
  regulatory_refs: string[]      // e.g. ["OISD-118", "Factory Act S.36"]
  chunk_count: number
  ingested_at: string
  updated_at: string
  summary?: string
  status: 'processing' | 'ready' | 'error'
  metadata: Record<string, unknown>
}

// ─── Chunk / Embedding Types ───────────────────────────────────────────────────

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  embedding?: number[]
  equipment_tags: string[]
  entities: ExtractedEntity[]
  page_number?: number
  section_heading?: string
}

export interface ExtractedEntity {
  type: 'equipment' | 'chemical' | 'person' | 'regulation' | 'procedure' | 'location' | 'date' | 'parameter'
  value: string
  confidence: number
  context?: string
}

// ─── Knowledge Graph Types ─────────────────────────────────────────────────────

export type NodeType =
  | 'equipment'
  | 'procedure'
  | 'incident'
  | 'regulation'
  | 'chemical'
  | 'person'
  | 'location'
  | 'document'

export interface KnowledgeNode {
  id: string
  label: string
  node_type: NodeType
  properties: Record<string, unknown>
  document_ids: string[]
  risk_level?: 'critical' | 'high' | 'medium' | 'low'
  last_updated: string
}

export interface KnowledgeEdge {
  id: string
  source_id: string
  target_id: string
  relationship: string   // e.g. "MAINTAINED_BY", "REQUIRES", "CAUSED", "REFERENCES"
  weight: number
  document_ids: string[]
  properties: Record<string, unknown>
}

// ─── Query / Chat Types ────────────────────────────────────────────────────────

export type QueryMode = 'expert' | 'compliance' | 'rca' | 'maintenance' | 'field'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  mode?: QueryMode
  citations?: Citation[]
  follow_ups?: string[]
  confidence?: number
  is_streaming?: boolean
}

export interface Citation {
  document_id: string
  document_title: string
  chunk_index: number
  excerpt: string
  page_number?: number
  relevance_score: number
}

export interface QueryResult {
  answer: string
  citations: Citation[]
  follow_ups: string[]
  confidence: number
  knowledge_path?: string[]  // entities traversed to answer
  compliance_flags?: ComplianceFlag[]
}

// ─── Compliance Types ──────────────────────────────────────────────────────────

export interface ComplianceFlag {
  id: string
  severity: 'critical' | 'major' | 'minor' | 'observation'
  regulation: string          // e.g. "OISD-118 Clause 4.3"
  description: string
  equipment_tag?: string
  document_id?: string
  detected_at: string
  status: 'open' | 'acknowledged' | 'resolved'
  recommended_action: string
}

export interface ComplianceReport {
  generated_at: string
  plant_area?: string
  total_checks: number
  passed: number
  failed: number
  flags: ComplianceFlag[]
  coverage: {
    oisd: number       // % coverage
    factory_act: number
    peso: number
    env_norms: number
  }
}

// ─── Maintenance / RCA Types ───────────────────────────────────────────────────

export interface MaintenanceRecord {
  id: string
  equipment_tag: string
  work_order_no: string
  description: string
  failure_mode?: string
  corrective_action: string
  performed_by: string
  completed_at: string
  downtime_hours: number
  document_id?: string
}

export interface RCAResult {
  equipment_tag: string
  problem_statement: string
  timeline: RCAEvent[]
  root_causes: RootCause[]
  contributing_factors: string[]
  recommendations: Recommendation[]
  similar_incidents: SimilarIncident[]
  generated_at: string
}

export interface RCAEvent {
  timestamp: string
  event: string
  source_doc?: string
}

export interface RootCause {
  category: 'human' | 'equipment' | 'process' | 'environmental' | 'organizational'
  description: string
  confidence: number
  evidence: string[]
}

export interface Recommendation {
  priority: 'immediate' | 'short_term' | 'long_term'
  action: string
  owner?: string
  regulation_reference?: string
}

export interface SimilarIncident {
  date: string
  description: string
  equipment?: string
  lesson_learned: string
  document_id?: string
}

// ─── Knowledge Decay / Staleness Types ────────────────────────────────────────

export interface KnowledgeHealthItem {
  document_id: string
  title: string
  doc_type: DocType
  last_accessed: string
  last_modified: string
  days_since_update: number
  staleness_score: number   // 0-100
  risk: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  equipment_tags: string[]
}

// ─── Dashboard / Stats Types ───────────────────────────────────────────────────

export interface DashboardStats {
  total_documents: number
  total_chunks: number
  total_entities: number
  knowledge_graph_edges: number
  queries_today: number
  avg_response_time_ms: number
  compliance_score: number
  stale_documents: number
  active_flags: number
}

// ─── Ingestion Pipeline Types ──────────────────────────────────────────────────

export interface IngestionJob {
  id: string
  file_name: string
  file_path: string
  doc_type: DocType
  status: 'queued' | 'extracting' | 'chunking' | 'embedding' | 'graphing' | 'done' | 'error'
  progress: number   // 0-100
  error?: string
  started_at: string
  completed_at?: string
  chunk_count?: number
  entity_count?: number
}

// ─── Plant / Asset Types ───────────────────────────────────────────────────────

export interface PlantArea {
  id: string
  name: string
  code: string
  description: string
  equipment_count: number
  document_count: number
  risk_level: 'critical' | 'high' | 'medium' | 'low'
}

export interface Equipment {
  id: string
  tag: string
  name: string
  type: string
  plant_area_id: string
  specifications: Record<string, unknown>
  last_maintenance: string
  next_maintenance_due: string
  status: 'operational' | 'maintenance' | 'shutdown' | 'unknown'
  document_ids: string[]
}

// ─── Search / Filter Types ─────────────────────────────────────────────────────

export interface SearchFilters {
  doc_types?: DocType[]
  plant_areas?: string[]
  equipment_tags?: string[]
  date_from?: string
  date_to?: string
  regulatory_refs?: string[]
}

export interface SearchResult {
  document: Document
  chunks: DocumentChunk[]
  score: number
  highlight: string
}
