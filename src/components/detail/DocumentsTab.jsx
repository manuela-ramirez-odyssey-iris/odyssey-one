import { useState, useCallback } from 'react'
import { Upload, Trash2, X, RefreshCw } from 'lucide-react'

const TYPE_STYLES = {
  BoL:          { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  MBoL:         { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  Invoice:      { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  Instructions: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  POD:          { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  Other:        { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
}

const DOC_TYPES = ['BoL', 'MBoL', 'Invoice', 'Instructions', 'Other']

/* ---- Shared inline styles matching the prototype CSS exactly ---- */

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-placeholder)',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
}

const tdStyle = {
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontSize: 13,
  fontWeight: 400,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

const actionBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--btn-secondary-bg)',
  border: '1px solid var(--btn-secondary-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '6px 12px',
  cursor: 'pointer',
  fontFamily: 'var(--font-primary)',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--btn-secondary-text)',
  transition: 'background 0.15s ease',
}

const deleteBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  background: 'none',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  color: 'var(--text-placeholder)',
  transition: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
  margin: '0 auto',
}

function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.Other
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-primary)',
        fontSize: 12,
        fontWeight: 600,
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        background: style.bg,
        color: style.color,
      }}
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        margin: 'calc(-1 * var(--spacing-4)) calc(-1 * var(--spacing-5))',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setShowModal(true)}
          style={actionBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
        >
          <Upload size={16} />
          <span>Upload Attachment</span>
        </button>
        <button
          style={actionBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto', height: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-primary)',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>File</th>
              <th style={{ ...thStyle, width: 48, textAlign: 'center' }} />
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    ...tdStyle,
                    color: 'var(--text-placeholder)',
                    padding: 'var(--spacing-6)',
                    textAlign: 'center',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  No documents uploaded.
                </td>
              </tr>
            )}
            {documents.map((doc, idx) => (
              <tr
                key={idx}
                style={{ transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              >
                <td style={tdStyle}>
                  <TypeBadge type={doc.type} />
                </td>
                <td style={tdStyle}>{doc.description}</td>
                <td style={tdStyle}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    style={{
                      fontFamily: 'var(--font-primary)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-link)',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                  >
                    {doc.fileName}
                  </a>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', width: 48 }}>
                  <button
                    onClick={() => handleDelete(idx)}
                    style={deleteBtnStyle}
                    title="Delete document"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-error)'
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.background = 'var(--bg-error)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-placeholder)'
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              width: 400,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Upload Attachment
              </span>
              <button
                onClick={handleCloseModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-placeholder)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--input-label)',
                  }}
                >
                  Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    color: 'var(--input-text)',
                  }}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--input-label)',
                  }}
                >
                  File
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormFile(e.target.files[0] || null)}
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.msg"
                  style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--input-label)',
                  }}
                >
                  Description
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Enter description..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    color: 'var(--input-text)',
                  }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '16px 20px',
                borderTop: '1px solid var(--border-subtle)',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!formFile}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--btn-primary-bg)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--btn-primary-text)',
                  opacity: formFile ? 1 : 0.5,
                }}
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
