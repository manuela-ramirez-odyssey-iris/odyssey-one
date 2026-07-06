import React, { useState, useCallback, useRef } from 'react'
import { Download, Trash2, FileText, Sheet, File, EllipsisVertical, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, FormField, ModalMedium, Checkbox, ActionMenu } from '@odyssey/ui'

const DOC_TYPES = ['BoL', 'MBoL', 'POD', 'SL', 'Packing List', 'Other']

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

const DocumentsTab = React.memo(function DocumentsTab({ data }) {
  const [documents, setDocuments] = useState(() => data?.documents || [])
  const [showModal, setShowModal] = useState(false)
  const [formType, setFormType] = useState('BoL')
  const [formFile, setFormFile] = useState(null)
  const [formDesc, setFormDesc] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)

  // Local selection state — UI only, no bulk actions yet
  const [selected, setSelected] = useState(new Set())
  const fileInputRef = useRef(null)

  const allSelected = documents.length > 0 && selected.size === documents.length
  const someSelected = selected.size > 0 && !allSelected

  const handleSelectAll = useCallback((e) => {
    setSelected(e.target.checked ? new Set(documents.map((_, i) => i)) : new Set())
  }, [documents])

  const handleSelectRow = useCallback((idx, checked) => {
    setSelected((prev) => {
      const next = new Set(prev)
      checked ? next.add(idx) : next.delete(idx)
      return next
    })
  }, [])

  const handleDelete = useCallback((idx) => {
    setDocuments((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      // Rebuild selection indices after removal
      setSelected((prevSel) => {
        const nextSel = new Set()
        prevSel.forEach((sel) => { if (sel < idx) nextSel.add(sel); else if (sel > idx) nextSel.add(sel - 1) })
        return nextSel
      })
      return next
    })
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
    <div className="pane-canvas">
      <div className="pane-col pane-col--wide">
        <div className="pane-card">
          {/* Card header */}
          <div className="pane-card__header">
            <h2 className="pane-card__title">All Documents</h2>
            <Button
              variant="primary"
              icon={<Plus {...ICON_MD} />}
              onClick={() => setShowModal(true)}
            >
              Add Document
            </Button>
          </div>

          {/* Table */}
          <div className="docs-table-wrap">
            <table className="docs-table" aria-label="Documents">
              <thead>
                <tr>
                  <th className="docs-th docs-th--cb">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all documents"
                    />
                  </th>
                  <th className="docs-th docs-th--file">File</th>
                  <th className="docs-th">Creation Time</th>
                  <th className="docs-th docs-th--size">File Size (KB)</th>
                  <th className="docs-th docs-th--action">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="docs-td docs-empty">
                      No documents uploaded.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc, idx) => (
                    <tr key={idx} className="docs-row" data-selected={selected.has(idx) || undefined}>
                      <td className="docs-td docs-td--cb">
                        <Checkbox
                          checked={selected.has(idx)}
                          onChange={(e) => handleSelectRow(idx, e.target.checked)}
                          aria-label={`Select ${doc.fileName}`}
                        />
                      </td>
                      <td className="docs-td docs-td--file">
                        <a
                          href="#"
                          className="docs-file-link"
                          onClick={(e) => { e.preventDefault(); setPreviewDoc(doc) }}
                        >
                          {doc.fileName}
                        </a>
                        {doc.description && doc.description !== doc.fileName && (
                          <span className="docs-file-desc">{doc.description}</span>
                        )}
                      </td>
                      <td className="docs-td docs-td--muted">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
                          : <span className="docs-dash">—</span>
                        }
                      </td>
                      <td className="docs-td docs-td--muted">
                        {doc.fileSize != null
                          ? `${doc.fileSize} KB`
                          : <span className="docs-dash">—</span>
                        }
                      </td>
                      <td className="docs-td docs-td--action">
                        <ActionMenu
                          icon={<EllipsisVertical {...ICON_MD} />}
                          ariaLabel="Document actions"
                          align="right"
                          options={[
                            {
                              label: 'Download',
                              // No-op stub — real download requires signed URL from backend
                              onSelect: () => { /* TODO: wire to presigned download URL */ },
                            },
                            {
                              label: 'Delete',
                              danger: true,
                              onSelect: () => handleDelete(idx),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Preview Modal — mechanics unchanged */}
      {previewDoc && (() => {
        const ext = getFileExtension(previewDoc.fileName)
        return (
          <ModalMedium
            title={previewDoc.fileName}
            onClose={() => setPreviewDoc(null)}
            footer={
              <>
                <Button variant="secondary" size="lg" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
                <Button variant="primary" size="lg" icon={<Download size={20} />}>
                  Download
                </Button>
              </>
            }
          >
            {previewDoc.description && (
              <p className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)', margin: 0 }}>
                {previewDoc.description}
              </p>
            )}
            <DocMockup doc={previewDoc} ext={ext} />
          </ModalMedium>
        )
      })()}

      {/* Upload Modal — trigger renamed, mechanics unchanged */}
      {showModal && (
        <ModalMedium
          title="Upload Attachment"
          onClose={handleCloseModal}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" onClick={handleUpload} disabled={!formFile}>
                Upload
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="text-label-sm-medium" style={{ color: 'var(--input-label)' }}>Type</label>
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
              <label className="text-label-sm-medium" style={{ color: 'var(--input-label)' }}>File</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFormFile(e.target.files[0] || null)}
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.msg"
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <Button variant="link" onClick={() => fileInputRef.current?.click()}>
                  {formFile ? 'Replace file' : 'Choose file'}
                </Button>
                {formFile && (
                  <span className="text-label-sm-regular" style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formFile.name}
                  </span>
                )}
              </div>
            </div>
            <FormField
              label="Description"
              placeholder="Enter description..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>
        </ModalMedium>
      )}
    </div>
  )
})
export default DocumentsTab

/* ---- Mock document preview (unchanged) ---- */

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
            {Array.from({ length: 6 }, (_, r) => (
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

  return (
    <div style={pageStyle}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <div style={mockLine(90)} />
        <div style={mockLine(75)} />
        <div style={mockLine(60)} />
      </div>
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
