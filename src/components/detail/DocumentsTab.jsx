import { useState, useCallback } from 'react'
import { Upload, Trash2, X, FileText, RefreshCw } from 'lucide-react'

const TYPE_STYLES = {
  BoL:          { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  Invoice:      { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  Instructions: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  POD:          { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  Other:        { bg: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' },
}

const DOC_TYPES = ['BoL', 'Instructions', 'Invoice', 'POD', 'Other']

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-placeholder)',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
}

const tdStyle = {
  padding: '8px 12px',
  whiteSpace: 'nowrap',
  fontSize: 13,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.Other
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5"
      style={{ borderRadius: 'var(--radius-sm)', background: style.bg, color: style.color }}
    >
      {type}
    </span>
  )
}

export default function DocumentsTab({ data }) {
  const [documents, setDocuments] = useState(() => data?.documents || [])
  const [showModal, setShowModal] = useState(false)
  const [formType, setFormType] = useState('BoL')
  const [formFile, setFormFile] = useState(null)
  const [formDesc, setFormDesc] = useState('')

  const handleDelete = useCallback((idx) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleUpload = useCallback(() => {
    if (!formFile) return
    const newDoc = {
      type: formType,
      description: formDesc || formFile.name,
      fileName: formFile.name,
    }
    setDocuments((prev) => [...prev, newDoc])
    setShowModal(false)
    setFormType('BoL')
    setFormFile(null)
    setFormDesc('')
  }, [formType, formFile, formDesc])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setFormType('BoL')
    setFormFile(null)
    setFormDesc('')
  }, [])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-xs font-medium border-none cursor-pointer"
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
          }}
        >
          <Upload size={14} />
          Upload Document
        </button>
        <button
          className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--btn-secondary-bg)',
            border: '1px solid var(--btn-secondary-border)',
            color: 'var(--btn-secondary-text)',
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <table className="w-full border-collapse" style={{ fontFamily: 'var(--font-primary)' }}>
        <thead>
          <tr>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>File Name</th>
            <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 && (
            <tr>
              <td colSpan={4} className="text-sm text-center" style={{ ...tdStyle, color: 'var(--text-placeholder)', padding: 24 }}>
                No documents uploaded.
              </td>
            </tr>
          )}
          {documents.map((doc, idx) => (
            <tr key={idx}>
              <td style={tdStyle}><TypeBadge type={doc.type} /></td>
              <td style={tdStyle}>{doc.description}</td>
              <td style={tdStyle}>
                <span className="flex items-center gap-1" style={{ color: 'var(--text-link)' }}>
                  <FileText size={14} />
                  {doc.fileName}
                </span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <button
                  onClick={() => handleDelete(idx)}
                  className="flex items-center justify-center mx-auto bg-transparent border-none cursor-pointer"
                  style={{ color: 'var(--text-placeholder)', padding: 4 }}
                  title="Delete document"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Upload Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col"
            style={{
              width: 440,
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between"
              style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Upload Document
              </span>
              <button
                onClick={handleCloseModal}
                className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--text-placeholder)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col gap-4" style={{ padding: '20px' }}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--input-label)' }}>Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="text-sm"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--input-text)',
                    fontFamily: 'var(--font-primary)',
                  }}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--input-label)' }}>File</label>
                <input
                  type="file"
                  onChange={(e) => setFormFile(e.target.files[0] || null)}
                  className="text-sm"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--input-text)',
                    fontFamily: 'var(--font-primary)',
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--input-label)' }}>Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional description"
                  className="text-sm"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--input-text)',
                    fontFamily: 'var(--font-primary)',
                  }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div
              className="flex items-center justify-end gap-2"
              style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}
            >
              <button
                onClick={handleCloseModal}
                className="text-xs font-medium border-none cursor-pointer"
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="text-xs font-medium border-none cursor-pointer"
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  opacity: formFile ? 1 : 0.5,
                }}
                disabled={!formFile}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
