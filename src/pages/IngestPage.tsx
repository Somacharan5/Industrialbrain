import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Tag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ingestDocument, inferDocType } from '@/lib/ingestion'
import type { DocType } from '@/types'

interface FileJob {
  id: string
  file: File
  docType: DocType
  status: 'queued' | 'processing' | 'done' | 'error'
  stage: string
  progress: number
  error?: string
  equipmentTags?: string[]
}

const DOC_TYPES: { value: DocType; label: string; color: string }[] = [
  { value: 'procedure',   label: 'Procedure / SOP',       color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'pid',         label: 'P&ID / Drawing',        color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'maintenance', label: 'Maintenance Record',     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'inspection',  label: 'Inspection Report',      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'incident',    label: 'Incident / Near-Miss',   color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { value: 'regulatory',  label: 'Regulatory / OISD',      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { value: 'oem_manual',  label: 'OEM Manual',             color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { value: 'qa_record',   label: 'QA / Test Record',       color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { value: 'other',       label: 'Other',                  color: 'bg-carbon-500/10 text-carbon-400 border-carbon-500/20' },
]

export default function IngestPage() {
  const [jobs, setJobs] = useState<FileJob[]>([])
  const [plantArea, setPlantArea] = useState('')
  const [processing, setProcessing] = useState(false)

  const updateJob = (id: string, update: Partial<FileJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...update } : j))
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newJobs: FileJob[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      docType: inferDocType(file.name) ?? 'other',
      status: 'queued',
      stage: 'Ready',
      progress: 0,
    }))
    setJobs(prev => [...prev, ...newJobs])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    multiple: true,
  })

  const processAll = async () => {
    const queued = jobs.filter(j => j.status === 'queued')
    if (!queued.length) return

    setProcessing(true)
    for (const job of queued) {
      updateJob(job.id, { status: 'processing' })
      try {
        await ingestDocument(job.file, {
          docType: job.docType,
          plantArea: plantArea || undefined,
          onProgress: (stage, progress) => {
            updateJob(job.id, { stage, progress })
          },
        })
        updateJob(job.id, { status: 'done', stage: 'Complete', progress: 100 })
      } catch (err) {
        updateJob(job.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          stage: 'Error',
        })
      }
    }
    setProcessing(false)
  }

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const queuedCount = jobs.filter(j => j.status === 'queued').length
  const doneCount = jobs.filter(j => j.status === 'done').length
  const errorCount = jobs.filter(j => j.status === 'error').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="section-label mb-1">Knowledge Base</div>
        <h1 className="text-2xl font-semibold text-carbon-100">Ingest Documents</h1>
        <p className="text-sm text-carbon-500 mt-0.5">
          Upload plant documents to build the knowledge base. The AI will extract entities, generate embeddings, and build the knowledge graph automatically.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 mb-6
          ${isDragActive
            ? 'border-signal-green/60 bg-signal-green/5'
            : 'border-white/10 hover:border-white/20 bg-white/2 hover:bg-white/4'
          }`}
      >
        <input {...getInputProps()} />
        <Upload size={28} className={`mx-auto mb-3 ${isDragActive ? 'text-signal-green' : 'text-carbon-500'}`} />
        {isDragActive ? (
          <p className="text-signal-green font-medium">Drop files here…</p>
        ) : (
          <>
            <p className="text-carbon-300 font-medium mb-1">Drop documents here or click to browse</p>
            <p className="text-sm text-carbon-600">
              Supports PDF, DOCX, TXT, XLSX, CSV · P&IDs, SOPs, Work Orders, Inspection Reports, OISD docs
            </p>
          </>
        )}
      </div>

      {/* Config Row */}
      {jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs text-carbon-500 block mb-1">Plant Area (optional)</label>
            <input
              type="text"
              value={plantArea}
              onChange={e => setPlantArea(e.target.value)}
              placeholder="e.g. Coke Oven Battery, Blast Furnace, Area 3B"
              className="query-input text-sm py-2"
            />
          </div>
          <div className="flex items-center gap-2 sm:pt-5">
            <span className="text-xs font-mono text-carbon-500">
              {queuedCount} queued · {doneCount} done · {errorCount} errors
            </span>
            {queuedCount > 0 && (
              <button
                onClick={processAll}
                disabled={processing}
                className="btn-primary"
              >
                {processing
                  ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                  : <><Upload size={14} /> Ingest All ({queuedCount})</>
                }
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error summary */}
      {!processing && errorCount > 0 && (
        <div className="flex items-center justify-between gap-2 mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-400">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            {errorCount} document{errorCount !== 1 ? 's' : ''} failed to ingest — see details below.
          </span>
          <button
            onClick={() => setJobs(prev => prev.map(j => j.status === 'error' ? { ...j, status: 'queued', stage: 'Ready', progress: 0, error: undefined } : j))}
            className="flex-shrink-0 text-xs text-red-300 hover:text-red-200 underline"
          >
            Retry failed
          </button>
        </div>
      )}

      {/* Pipeline Info */}
      {jobs.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { step: '01', label: 'Text Extraction', desc: 'PDF, DOCX, Excel parsed into clean text' },
            { step: '02', label: 'AI Entity Extraction', desc: 'Equipment tags, regulations, chemicals identified' },
            { step: '03', label: 'Vector Embedding', desc: 'Semantic search vectors generated per chunk' },
            { step: '04', label: 'Knowledge Graph', desc: 'Entities linked: equipment ↔ procedures ↔ regulations' },
          ].map(s => (
            <div key={s.step} className="panel p-4">
              <div className="text-2xl font-bold text-carbon-700 font-mono mb-2">{s.step}</div>
              <div className="text-sm font-medium text-carbon-300 mb-1">{s.label}</div>
              <div className="text-xs text-carbon-600">{s.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* File Jobs */}
      <AnimatePresence>
        {jobs.map(job => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="panel p-4 mb-3"
          >
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {job.status === 'done' && <CheckCircle size={16} className="text-signal-green" />}
                {job.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
                {job.status === 'processing' && <Loader2 size={16} className="text-signal-amber animate-spin" />}
                {job.status === 'queued' && <FileText size={16} className="text-carbon-500" />}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-carbon-200 truncate">{job.file.name}</span>
                  <span className="text-[10px] font-mono text-carbon-600 flex-shrink-0">
                    {(job.file.size / 1024).toFixed(0)} KB
                  </span>
                </div>

                {/* Doc Type Selector */}
                {job.status === 'queued' && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DOC_TYPES.map(dt => (
                      <button
                        key={dt.value}
                        onClick={() => updateJob(job.id, { docType: dt.value })}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-all duration-150
                          ${job.docType === dt.value ? dt.color : 'bg-transparent text-carbon-600 border-white/5 hover:border-white/10'}`}
                      >
                        {dt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Progress */}
                {job.status === 'processing' && (
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-carbon-600 mb-1">
                      <span>{job.stage}</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="h-1 bg-carbon-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-signal-green rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {job.status === 'done' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-signal-green font-mono">Ingested successfully</span>
                    <span className="badge-green">
                      <Tag size={9} /> {job.docType}
                    </span>
                  </div>
                )}

                {job.status === 'error' && (
                  <span className="text-xs text-red-400 font-mono">{job.error}</span>
                )}
              </div>

              {/* Remove */}
              {job.status !== 'processing' && (
                <button
                  onClick={() => removeJob(job.id)}
                  className="flex-shrink-0 text-carbon-700 hover:text-carbon-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Supported Formats Info */}
      <div className="mt-8 panel p-4">
        <p className="text-xs font-medium text-carbon-300 mb-3">Supported Document Types</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-carbon-500">
          {[
            ['P&IDs / Drawings', 'PDF, TIFF'],
            ['Operating Procedures', 'PDF, DOCX'],
            ['Work Orders / Maintenance Records', 'PDF, DOCX, XLSX'],
            ['Inspection Reports', 'PDF, DOCX'],
            ['OISD / Regulatory Docs', 'PDF, DOCX'],
            ['Incident Reports', 'PDF, DOCX'],
            ['OEM Manuals', 'PDF'],
            ['Equipment Data Sheets', 'PDF, XLSX'],
            ['Email Archives', 'TXT, CSV'],
          ].map(([type, formats]) => (
            <div key={type} className="flex items-center justify-between gap-2">
              <span className="text-carbon-400">{type}</span>
              <span className="font-mono text-carbon-600">{formats}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
