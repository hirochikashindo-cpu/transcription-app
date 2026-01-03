import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../../../src/App'

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Transcription App/i })).toBeInTheDocument()
  })

  it('should display welcome message', () => {
    render(<App />)
    expect(screen.getByText(/Welcome to the Audio Transcription Application/i)).toBeInTheDocument()
  })
})
