import React, { useState, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from '../ui/Button'

let noteIdCounter = 100

function formatNoteDate() {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} ${hh}:${min} CST`
}

function NoteItem({ note, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(note.body)

  const handleSave = () => {
    const trimmed = editText.trim()
    if (trimmed) onEdit(note.id, trimmed)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditText(note.body)
    setEditing(false)
  }

  return (
    <div
      style={{
        padding: 'var(--spacing-3) var(--spacing-4)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-lg)',
            background: note.avatarClass === 'jd' ? 'var(--caribbean-green-100)' :
                         note.avatarClass === 'ls' ? 'var(--bay-of-many-100)' :
                         'var(--deep-sea-neutral-200)',
            color: note.avatarClass === 'jd' ? 'var(--caribbean-green-600)' :
                   note.avatarClass === 'ls' ? 'var(--bay-of-many-950)' :
                   'var(--text-tertiary)',
          }}
        >
          {note.authorInitials}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {note.author}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>
            {note.date}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer"
            style={{ width: 28, height: 28, color: 'var(--text-placeholder)' }}
            title="Edit note"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer"
            style={{ width: 28, height: 28, color: 'var(--text-placeholder)' }}
            title="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <div className="flex flex-col gap-2" style={{ marginTop: 8 }}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="text-sm"
            style={{
              width: '100%',
              minHeight: 80,
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              background: 'var(--input-bg)',
              color: 'var(--input-text)',
              fontFamily: 'var(--font-primary)',
              resize: 'vertical',
            }}
          />
          <div className="flex items-center gap-2 justify-end">
            <SecondaryButton onClick={handleCancel}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSave}>
              Save
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {note.body}
        </div>
      )}
    </div>
  )
}

const NotesTab = React.memo(function NotesTab({ data }) {
  const [notes, setNotes] = useState(() => {
    if (!data?.notes) return []
    return data.notes.map((n, i) => ({ ...n, id: `existing-${i}` }))
  })
  const [newText, setNewText] = useState('')

  const handleAdd = useCallback(() => {
    const trimmed = newText.trim()
    if (!trimmed) return
    const note = {
      id: `note-${noteIdCounter++}`,
      author: 'Amy Cook',
      authorInitials: 'AC',
      avatarClass: 'ac',
      date: formatNoteDate(),
      body: trimmed,
    }
    setNotes((prev) => [note, ...prev])
    setNewText('')
  }, [newText])

  const handleEdit = useCallback((id, newBody) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body: newBody } : n)))
  }, [])

  const handleDelete = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <div>
      {/* Add note area */}
      <div
        className="flex items-start gap-3"
        style={{
          padding: 'var(--spacing-3) var(--spacing-4)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        <div
          className="flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--deep-sea-neutral-200)',
            color: 'var(--text-tertiary)',
          }}
        >
          AC
        </div>
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 text-sm"
          style={{
            minHeight: 60,
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--input-border)',
            background: 'var(--input-bg)',
            color: 'var(--input-text)',
            fontFamily: 'var(--font-primary)',
            resize: 'vertical',
          }}
        />
        <PrimaryButton onClick={handleAdd} disabled={!newText.trim()}>
          Add Note
        </PrimaryButton>
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-2">
        {notes.length === 0 && (
          <div className="text-sm text-center" style={{ color: 'var(--text-placeholder)', padding: 'var(--spacing-6)' }}>
            No notes yet.
          </div>
        )}
        {notes.map((note) => (
          <NoteItem key={note.id} note={note} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
})
export default NotesTab
