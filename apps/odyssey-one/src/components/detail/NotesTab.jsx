import React, { useState, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, TextArea } from '@odyssey/ui'

/* ─── Constants ─────────────────────────────────────────── */
const NOTE_LIMIT = 10
const CURRENT_USER = 'Amy Cook'
const CURRENT_USER_INITIALS = 'AC'
// Mirrors Amy Cook's avatarUrl in tools/generate.mjs NOTE_AUTHORS — keep in sync.
const CURRENT_USER_AVATAR = 'https://randomuser.me/api/portraits/women/44.jpg'

let noteIdCounter = 100

/* ─── Helpers ────────────────────────────────────────────── */
function formatNoteDate() {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} ${hh}:${min} CST`
}

/* ─── App-local Avatar chip (normalization candidate) ────── */
/**
 * NoteAvatar — app-local atom (S79b, restyled per Figma 4292:17056 S80).
 * Renders the author photo when `avatarUrl` is present; falls back to the
 * initials chip (the Figma "User Avatar" initials style) otherwise.
 * Normalization candidate: move to @odyssey/ui once shape stabilises.
 */
function NoteAvatar({ initials, avatarUrl, name, size = 32 }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = avatarUrl && !imgFailed
  return (
    <div
      className={`notes-avatar${showPhoto ? ' notes-avatar--photo' : ''}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        <img src={avatarUrl} alt="" onError={() => setImgFailed(true)} />
      ) : (
        initials
      )}
    </div>
  )
}

/* ─── NoteItem ───────────────────────────────────────────── */
function NoteItem({ note, isOwnNote, onEdit, onDelete, isAnyEditing, onEditingChange }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(note.body)

  const startEdit = () => {
    setEditing(true)
    setEditText(note.body)
    onEditingChange(true)
  }

  const handleSave = () => {
    const trimmed = editText.trim()
    if (trimmed) onEdit(note.id, trimmed)
    setEditing(false)
    onEditingChange(false)
  }

  const handleCancel = () => {
    setEditText(note.body)
    setEditing(false)
    onEditingChange(false)
  }

  return (
    <div
      className={`notes-item${isOwnNote ? ' notes-item--own' : ''}${editing ? ' notes-item--editing' : ''}`}
      data-testid="note-item"
    >
      <NoteAvatar initials={note.authorInitials} avatarUrl={note.avatarUrl} name={note.author} />

      {editing ? (
        /* ── Inline edit state (Figma 4292:17082) ── */
        <div className="notes-item__content">
          <TextArea
            showLabel={false}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={200}
            showCount
            rows={3}
            autoFocus
            aria-label={`Edit note by ${note.author}`}
          />
          <div className="notes-item__edit-actions">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!editText.trim()}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* ── View state (Figma 4292:17054) ── */
        <>
          <div className="notes-item__content">
            <div className="notes-item__meta">
              <span className="notes-item__author">{note.author}</span>
              <span className="notes-item__date">{note.date}</span>
            </div>
            <p className="notes-item__body">{note.body}</p>
          </div>
          {isOwnNote && (
            <div className="notes-item__actions" role="toolbar" aria-label="Note actions">
              <Button
                variant="icon"
                size="sm"
                icon={<Pencil size={14} />}
                aria-label="Edit note"
                onClick={startEdit}
                disabled={isAnyEditing}
              />
              <Button
                variant="icon"
                size="sm"
                icon={<Trash2 size={14} />}
                aria-label="Delete note"
                onClick={() => onDelete(note.id)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── NotesTab ───────────────────────────────────────────── */
const NotesTab = React.memo(function NotesTab({ data }) {
  const [notes, setNotes] = useState(() => {
    if (!data?.notes) return []
    return data.notes.map((n, i) => ({ ...n, id: `existing-${i}` }))
  })
  const [newText, setNewText] = useState('')
  const [anyEditing, setAnyEditing] = useState(false)

  const userNoteCount = notes.filter((n) => n.author === CURRENT_USER).length
  const remaining = NOTE_LIMIT - userNoteCount
  const atLimit = remaining <= 0

  const handleAdd = useCallback(() => {
    const trimmed = newText.trim()
    if (!trimmed || atLimit) return
    const note = {
      id: `note-${noteIdCounter++}`,
      author: CURRENT_USER,
      authorInitials: CURRENT_USER_INITIALS,
      avatarClass: 'ac',
      avatarUrl: CURRENT_USER_AVATAR,
      date: formatNoteDate(),
      body: trimmed,
    }
    setNotes((prev) => [note, ...prev])
    setNewText('')
  }, [newText, atLimit])

  const handleEdit = useCallback((id, newBody) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body: newBody } : n)))
  }, [])

  const handleDelete = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const handleEditingChange = useCallback((isEditing) => {
    setAnyEditing(isEditing)
  }, [])

  return (
    <div className="pane-canvas" data-testid="notes-tab">
      <div className="pane-col pane-col--narrow">
        <div className="pane-card">
          {/* Card header */}
          <div className="pane-card__header">
            <h2 className="pane-card__title">All Notes</h2>
          </div>

          {/* Note list */}
          <div className="notes-list" role="list" aria-label="Notes">
            {notes.length === 0 && (
              <p className="notes-empty">No notes yet.</p>
            )}
            {notes.map((note, idx) => (
              <React.Fragment key={note.id}>
                {idx > 0 && <div className="notes-divider" role="separator" />}
                <div role="listitem">
                  <NoteItem
                    note={note}
                    isOwnNote={note.author === CURRENT_USER}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isAnyEditing={anyEditing}
                    onEditingChange={handleEditingChange}
                  />
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Composer (Figma 4292:17116) — hidden while any note is in inline-edit mode */}
          {!anyEditing && (
            <div className="notes-composer" data-testid="notes-composer">
              <NoteAvatar initials={CURRENT_USER_INITIALS} avatarUrl={CURRENT_USER_AVATAR} name={CURRENT_USER} />
              <div className="notes-composer__body">
                <TextArea
                  showLabel={false}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Type Your Note"
                  maxLength={200}
                  showCount
                  rows={3}
                  aria-label="New note text"
                />
                <div className="notes-composer__footer">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAdd}
                    disabled={!newText.trim() || atLimit}
                    data-testid="add-note-btn"
                  >
                    Add Note
                  </Button>
                  <span className="notes-composer__limit" data-testid="notes-limit-text">
                    {atLimit
                      ? `You've reached the limit (10 per user).`
                      : `You can add ${remaining} more note${remaining === 1 ? '' : 's'} (limit: ${NOTE_LIMIT} per user).`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default NotesTab
