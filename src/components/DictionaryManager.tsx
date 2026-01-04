import { useState, useEffect, useCallback } from 'react'
import type { DictionaryEntry, CreateDictionaryEntryData } from '@shared/types/electron'
import './DictionaryManager.css'

export function DictionaryManager() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newEntry, setNewEntry] = useState<CreateDictionaryEntryData>({
    word: '',
    reading: '',
    category: '',
  })

  const loadCategories = useCallback(async () => {
    try {
      const allEntries = await window.electronAPI.dictionary.findAll()
      const uniqueCategories = Array.from(
        new Set(allEntries.map((e) => e.category).filter((c): c is string => !!c))
      )
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }, [])

  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const filter = {
        search: searchTerm || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      }
      const data = await window.electronAPI.dictionary.findAll(filter)
      setEntries(data)
    } catch (error) {
      console.error('Failed to load dictionary entries:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, categoryFilter])

  useEffect(() => {
    loadEntries()
    loadCategories()
  }, [loadEntries, loadCategories])

  const handleCreate = async () => {
    if (!newEntry.word.trim()) {
      alert('単語を入力してください')
      return
    }

    try {
      await window.electronAPI.dictionary.create({
        word: newEntry.word.trim(),
        reading: newEntry.reading?.trim() || undefined,
        category: newEntry.category?.trim() || undefined,
      })
      setNewEntry({ word: '', reading: '', category: '' })
      setIsAddingNew(false)
      loadEntries()
      loadCategories()
    } catch (error) {
      alert(`エラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<CreateDictionaryEntryData>) => {
    try {
      await window.electronAPI.dictionary.update(id, updates)
      setEditingId(null)
      loadEntries()
      loadCategories()
    } catch (error) {
      alert(`エラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleDelete = async (id: string, word: string) => {
    if (!confirm(`「${word}」を削除しますか？`)) {
      return
    }

    try {
      await window.electronAPI.dictionary.delete(id)
      loadEntries()
      loadCategories()
    } catch (error) {
      alert(`エラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.electronAPI.dictionary.importFromCsv()
      if (result.errors.length > 0) {
        alert(
          `インポート完了: ${result.imported}件\nエラー: ${result.errors.length}件\n\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? '\n...' : ''}`
        )
      } else {
        alert(`インポート完了: ${result.imported}件`)
      }
      loadEntries()
      loadCategories()
    } catch (error) {
      alert(`エラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleExport = async () => {
    try {
      await window.electronAPI.dictionary.exportToCsv()
      alert('エクスポート完了')
    } catch (error) {
      alert(`エラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="dictionary-manager">
      <div className="dictionary-header">
        <h2>カスタム辞書管理</h2>
        <div className="dictionary-actions">
          <button onClick={handleImport} className="btn-secondary">
            CSVインポート
          </button>
          <button onClick={handleExport} className="btn-secondary">
            CSVエクスポート
          </button>
          <button onClick={() => setIsAddingNew(true)} className="btn-primary">
            + 新規追加
          </button>
        </div>
      </div>

      <div className="dictionary-filters">
        <input
          type="text"
          className="search-input"
          placeholder="単語・読みで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">すべてのカテゴリ</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {isAddingNew && (
        <div className="dictionary-form">
          <input
            type="text"
            placeholder="単語"
            value={newEntry.word}
            onChange={(e) => setNewEntry({ ...newEntry, word: e.target.value })}
          />
          <input
            type="text"
            placeholder="読み仮名（オプション）"
            value={newEntry.reading}
            onChange={(e) => setNewEntry({ ...newEntry, reading: e.target.value })}
          />
          <input
            type="text"
            placeholder="カテゴリ（オプション）"
            value={newEntry.category}
            onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
          />
          <div className="form-actions">
            <button onClick={handleCreate} className="btn-primary">
              追加
            </button>
            <button onClick={() => setIsAddingNew(false)} className="btn-secondary">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {isLoading && <div className="loading">読み込み中...</div>}

      {!isLoading && entries.length === 0 && (
        <div className="empty-state">
          <p>辞書エントリがありません</p>
          <p className="empty-hint">専門用語や固有名詞を登録してください</p>
        </div>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="dictionary-list">
          <table>
            <thead>
              <tr>
                <th>単語</th>
                <th>読み仮名</th>
                <th>カテゴリ</th>
                <th>使用回数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) =>
                editingId === entry.id ? (
                  <tr key={entry.id} className="editing">
                    <td>
                      <input
                        type="text"
                        defaultValue={entry.word}
                        onBlur={(e) =>
                          e.target.value !== entry.word &&
                          handleUpdate(entry.id, { word: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={entry.reading || ''}
                        onBlur={(e) =>
                          e.target.value !== (entry.reading || '') &&
                          handleUpdate(entry.id, { reading: e.target.value || undefined })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={entry.category || ''}
                        onBlur={(e) =>
                          e.target.value !== (entry.category || '') &&
                          handleUpdate(entry.id, { category: e.target.value || undefined })
                        }
                      />
                    </td>
                    <td>{entry.usage_count}</td>
                    <td>
                      <button onClick={() => setEditingId(null)} className="btn-small">
                        完了
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id}>
                    <td>{entry.word}</td>
                    <td>{entry.reading || '-'}</td>
                    <td>{entry.category || '-'}</td>
                    <td>{entry.usage_count}</td>
                    <td>
                      <button onClick={() => setEditingId(entry.id)} className="btn-small">
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id, entry.word)}
                        className="btn-small btn-danger"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
