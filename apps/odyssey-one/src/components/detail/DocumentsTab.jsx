import React, { useState, useCallback } from 'react'
import { Upload, Trash2, X, RefreshCw, Download, FileText, Sheet, File } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from '../ui/Button'

const TYPE_STYLES = {
  BoL:            { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  MBoL:           { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  POD:            { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' },
  SL:             { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  'Packing List': { bg: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)' },
  Other:          { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
}

const DOC_TYPES = ['BoL', 'MBoL', 'POD', 'SL', 'Packing List', 'Other']

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

function getFileExtension(fileName) {
  const parts = (fileName || '').split('.')
  return parts.length > 1 ? '.' + parts.pop().toLowerCase() : ''
}

function FileIcon({ extension, size = 48 }) {
  const ext = extension.toLowerCase()
  if (ext === '.pdf' || ext === '.docx' || ext === '.doc') return <FileText size={size} />
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') return <Sheet size={size} />
  return <File size={size} />
}

function TypeBadge({ type }) {
  const style = TYPE_STYLES[type] || { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' }
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

const DocumentsTab = React.memo(function DocumentsTab({ data }) {
  const [documents, setDocuments] = useState(() => data?.documents || [])
  const [showModal, setShowModal] = useState(false)
  const [formType, setFormType] = useState('BoL')
  const [formFile, setFormFile] = useState(null)
  const [formDesc, setFormDesc] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)

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
        <SecondaryButton onClick={() => setShowModal(true)}>
          <Upload size={16} />
          <span>Upload Attachment</span>
        </SecondaryButton>
        <SecondaryButton>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </SecondaryButton>
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
                    onClick={(e) => { e.preventDefault(); setPreviewDoc(doc) }}
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

      {/* Preview Modal */}
      {previewDoc && (() => {
        const ext = getFileExtension(previewDoc.fileName)
        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
              background: 'rgba(0,0,0,0.3)',
            }}
            onClick={() => setPreviewDoc(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                padding: 24,
                width: 520,
                fontFamily: 'var(--font-primary)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <TypeBadge type={previewDoc.type} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {previewDoc.fileName}
                </span>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                  style={{ color: 'var(--text-placeholder)', padding: 0, transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              {previewDoc.description && (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {previewDoc.description}
                </p>
              )}
              <DocMockup doc={previewDoc} ext={ext} />

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <SecondaryButton onClick={() => setPreviewDoc(null)}>
                  Close
                </SecondaryButton>
                <PrimaryButton>
                  <Download size={14} />
                  Download
                </PrimaryButton>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Upload Modal */}
      {showModal && (
        <div
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              padding: 24,
              width: 400,
              fontFamily: 'var(--font-primary)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Upload Attachment
              </span>
              <button
                onClick={handleCloseModal}
                className="flex items-center justify-center bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--text-placeholder)', padding: 0, transition: 'color 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--input-label)' }}>Type</label>
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
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--input-label)' }}>File</label>
                <input
                  type="file"
                  onChange={(e) => setFormFile(e.target.files[0] || null)}
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.msg"
                  style={{ fontFamily: 'var(--font-primary)', fontSize: 13, color: 'var(--text-secondary)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--input-label)' }}>Description</label>
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

            {/* Footer */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <SecondaryButton onClick={handleCloseModal}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleUpload} disabled={!formFile}>
                Upload
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
export default DocumentsTab

/* ---- Mock document preview ---- */

const mockLine = (width) => ({
  height: 8,
  width: `${width}%`,
  background: 'var(--bg-tertiary)',
  borderRadius: 4,
})

function DocMockup({ doc, ext }) {
  const isSpreadsheet = ext === '.xlsx' || ext === '.xls' || ext === '.csv'
  const pageStyle = {
    background: '#fff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '28px 32px',
    minHeight: 340,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    fontFamily: 'var(--font-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }

  if (isSpreadsheet) {
    const cols = 4
    const rows = 6
    const cellStyle = {
      padding: '6px 10px',
      fontSize: 10,
      color: 'var(--text-tertiary)',
      borderRight: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
    }
    const headerCell = { ...cellStyle, background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', color: 'var(--text-placeholder)' }
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sheet size={14} style={{ color: 'var(--badge-green-text)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>{doc.fileName}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border-subtle)' }}>
          <thead>
            <tr>
              {['Order #', 'Description', 'Qty', 'Weight (lbs)'].map(h => (
                <td key={h} style={headerCell}>{h}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td style={cellStyle}>ORD-{String(4200 + r).padStart(6, '0')}</td>
                <td style={cellStyle}>Chemical product {r + 1}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{(r + 1) * 12}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{((r + 1) * 1450).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // PDF / Word / generic — looks like a BoL or shipping doc
  return (
    <div style={pageStyle}>
      {/* Fake letterhead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--text-primary)', paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>ODYSSEY LOGISTICS</div>
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>1200 Industrial Pkwy, Houston TX 77001</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{doc.type === 'POD' ? 'PROOF OF DELIVERY' : doc.type === 'SL' ? 'SHIPPING LIST' : 'BILL OF LADING'}</div>
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>Date: 03/28/2026</div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 10 }}>
        {[
          ['Shipper', 'Odyssey Chemical Corp.'],
          ['Carrier', 'USXP Express Inc.'],
          ['Consignee', 'Midwest Distribution LLC'],
          ['PRO #', 'PRO-889204'],
          ['Origin', 'Houston, TX'],
          ['Destination', 'Chicago, IL'],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 70 }}>{label}:</span>
            <span style={{ color: 'var(--text-secondary)' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Fake items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border-subtle)', fontSize: 10 }}>
        <thead>
          <tr>
            {['Item', 'Description', 'Packages', 'Weight', 'Class'].map(h => (
              <td key={h} style={{ padding: '5px 8px', fontWeight: 600, fontSize: 9, color: 'var(--text-placeholder)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', textTransform: 'uppercase' }}>{h}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['1', 'Sodium Hydroxide Solution', '24 Drums', '12,400 lbs', '80'],
            ['2', 'Polyethylene Glycol', '16 Pallets', '8,200 lbs', '55'],
          ].map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} style={{ padding: '5px 8px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fake text lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <div style={mockLine(90)} />
        <div style={mockLine(75)} />
        <div style={mockLine(60)} />
      </div>

      {/* Signature line */}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 9, color: 'var(--text-placeholder)' }}>
          <div style={{ width: 140, borderBottom: '1px solid var(--text-placeholder)', marginBottom: 4, height: 20 }} />
          Shipper Signature
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-placeholder)' }}>
          <div style={{ width: 140, borderBottom: '1px solid var(--text-placeholder)', marginBottom: 4, height: 20 }} />
          Carrier Signature
        </div>
      </div>
    </div>
  )
}
