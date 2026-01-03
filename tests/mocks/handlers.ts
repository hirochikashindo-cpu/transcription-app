import { http, HttpResponse } from 'msw'

export const handlers = [
  // Whisper API Mock
  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'これはモックの文字起こし結果です。',
      segments: [
        { id: 0, start: 0.0, end: 2.5, text: 'これはモックの文字起こし結果です。' },
      ],
    })
  }),

  // Claude API Mock
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      content: [
        {
          type: 'text',
          text: '## 会議概要\n- テスト会議\n\n## 決定事項\n- テスト決定',
        },
      ],
    })
  }),

  // エラーシミュレーション
  http.post('https://api.openai.com/v1/audio/transcriptions', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('simulate-error') === 'true') {
      return new HttpResponse(null, { status: 500 })
    }
  }),
]
