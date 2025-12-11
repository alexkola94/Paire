import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../../components/Toast'

// Test component that uses toast
const TestComponent = () => {
  const { success, error, info } = useToast()

  return (
    <div>
      <button onClick={() => success('Success message')}>Success</button>
      <button onClick={() => error('Error message')}>Error</button>
      <button onClick={() => info('Info message')}>Info</button>
    </div>
  )
}

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
  })
}))

describe('Toast', () => {
  it('should show success toast', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByRole('button', { name: 'Success' })
    await user.click(successButton)

    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('should show error toast', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const errorButton = screen.getByRole('button', { name: 'Error' })
    await user.click(errorButton)

    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('should dismiss toast when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const infoButton = screen.getByRole('button', { name: 'Info' })
    await user.click(infoButton)

    expect(screen.getByText('Info message')).toBeInTheDocument()

    const dismissButton = screen.getByLabelText('common.close')
    await user.click(dismissButton)

    // Wait for exit animation
    await waitFor(() => {
      expect(screen.queryByText('Info message')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should auto-dismiss after duration', async () => {
    vi.useFakeTimers()

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByRole('button', { name: 'Success' })
    fireEvent.click(successButton)

    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Fast-forward time (duration 3000ms + animation 300ms + buffer)
    await act(async () => {
      vi.advanceTimersByTime(3500)
    })

    // Check directly without waitFor to avoid fake timer conflicts
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()

    vi.useRealTimers()
  })
})
