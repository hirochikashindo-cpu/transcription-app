import { useState } from 'react'
import type { Segment, Speaker } from '@shared/types/electron'
import './SegmentList.css'

interface SegmentListProps {
  segments: Segment[]
  speakers?: Speaker[]
  selectedSpeakerId?: string | null
  onUpdate: (segmentId: string, newText: string) => Promise<void>
}

export function SegmentList({ segments, speakers = [], selectedSpeakerId, onUpdate }: SegmentListProps) {
  const getSpeakerForSegment = (segment: Segment): Speaker | undefined => {
    return speakers.find((s) => s.id === segment.speaker_id)
  }
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleEdit = (segment: Segment) => {
    setEditingId(segment.id)
    setEditText(segment.text)
  }

  const handleSave = async (segmentId: string) => {
    if (editText.trim()) {
      await onUpdate(segmentId, editText.trim())
    }
    setEditingId(null)
    setEditText('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditText('')
  }

  if (segments.length === 0) {
    return (
      <div className="segment-list-empty">
        <p>セグメントがありません</p>
      </div>
    )
  }

  // フィルタリング処理
  const filteredSegments = selectedSpeakerId
    ? segments.filter((seg) => seg.speaker_id === selectedSpeakerId)
    : segments

  return (
    <div className="segment-list">
      {filteredSegments.map((segment) => {
        const speaker = getSpeakerForSegment(segment)

        return (
        <div
          key={segment.id}
          className="segment-item"
          style={speaker ? { borderLeftColor: speaker.color, borderLeftWidth: '4px' } : undefined}
        >
          <div className="segment-header">
            <div className="segment-timestamp">
              {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
            </div>
            {speaker && (
              <div className="segment-speaker" style={{ color: speaker.color }}>
                <span className="speaker-dot" style={{ backgroundColor: speaker.color }} />
                {speaker.custom_name || speaker.name}
              </div>
            )}
          </div>

          {editingId === segment.id ? (
            <div className="segment-edit">
              <textarea
                className="segment-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="segment-actions">
                <button className="btn-primary btn-sm" onClick={() => handleSave(segment.id)}>
                  保存
                </button>
                <button className="btn-secondary btn-sm" onClick={handleCancel}>
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="segment-content">
              <p className="segment-text">{segment.text}</p>
              {segment.confidence !== undefined && segment.confidence !== null && (
                <span className="segment-confidence">
                  信頼度: {Math.round(segment.confidence * 100)}%
                </span>
              )}
              <button className="btn-edit" onClick={() => handleEdit(segment)} title="編集">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )})}
    </div>
  )
}
