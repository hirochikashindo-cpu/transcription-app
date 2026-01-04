import { useState } from 'react'
import type { Speaker } from '@shared/types/electron'
import './SpeakerList.css'

interface SpeakerListProps {
  speakers: Speaker[]
  selectedSpeakerId?: string | null
  onSpeakerSelect?: (speakerId: string | null) => void
  onSpeakerUpdate?: (speakerId: string, customName: string, color: string) => Promise<void>
}

export function SpeakerList({
  speakers,
  selectedSpeakerId,
  onSpeakerSelect,
  onSpeakerUpdate,
}: SpeakerListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleEdit = (speaker: Speaker) => {
    setEditingId(speaker.id)
    setEditName(speaker.custom_name || speaker.name)
    setEditColor(speaker.color)
  }

  const handleSave = async (speakerId: string) => {
    if (onSpeakerUpdate) {
      await onSpeakerUpdate(speakerId, editName.trim(), editColor)
    }
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  const handleSpeakerClick = (speakerId: string) => {
    if (onSpeakerSelect) {
      onSpeakerSelect(selectedSpeakerId === speakerId ? null : speakerId)
    }
  }

  if (speakers.length === 0) {
    return (
      <div className="speaker-list-empty">
        <p>話者が検出されませんでした</p>
      </div>
    )
  }

  return (
    <div className="speaker-list">
      <div className="speaker-list-header">
        <h3>話者一覧</h3>
        {onSpeakerSelect && selectedSpeakerId && (
          <button className="btn-clear-filter" onClick={() => onSpeakerSelect(null)}>
            フィルター解除
          </button>
        )}
      </div>

      <div className="speaker-items">
        {speakers.map((speaker) => (
          <div
            key={speaker.id}
            className={`speaker-item ${selectedSpeakerId === speaker.id ? 'selected' : ''}`}
            onClick={() => handleSpeakerClick(speaker.id)}
          >
            {editingId === speaker.id ? (
              <div className="speaker-edit" onClick={(e) => e.stopPropagation()}>
                <div className="edit-form">
                  <div className="form-group">
                    <label>名前</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="話者名"
                    />
                  </div>
                  <div className="form-group">
                    <label>色</label>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="edit-actions">
                  <button className="btn-primary btn-sm" onClick={() => handleSave(speaker.id)}>
                    保存
                  </button>
                  <button className="btn-secondary btn-sm" onClick={handleCancel}>
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="speaker-indicator"
                  style={{ backgroundColor: speaker.color }}
                  title={speaker.color}
                />
                <div className="speaker-info">
                  <span className="speaker-name">{speaker.custom_name || speaker.name}</span>
                  {speaker.custom_name && (
                    <span className="speaker-original-name">({speaker.name})</span>
                  )}
                </div>
                <button
                  className="btn-edit-speaker"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(speaker)
                  }}
                  title="編集"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
