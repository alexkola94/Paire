import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

    const dismissButton = screen.getByLabelText('Dismiss')
    await user.click(dismissButton)

    await waitFor(() => {
      expect(screen.queryByText('Info message')).not.toBeInTheDocument()
    })
  })

  it('should auto-dismiss after duration', async () => {
    vi.useFakeTimers()
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByRole('button', { name: 'Success' })
    await userEvent.click(successButton)

    expect(screen.getByText('Success message')).toBeInTheDocument()

    // Fast-forward time
    vi.advanceTimersByTime(3000)

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })

    vi.useRealTimers()
  })
})

