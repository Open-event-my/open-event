import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolExecutionCard } from './ToolExecutionCard'

describe('ToolExecutionCard', () => {
  const mockResult = {
    toolCallId: 'test-id',
    name: 'createEvent',
    success: true,
    summary: 'Created event "Test Event"',
  }

  describe('rendering', () => {
    it('should render with tool name label', () => {
      render(<ToolExecutionCard toolName="createEvent" status="pending" />)
      expect(screen.getByText('Creating Event')).toBeInTheDocument()
    })

    it('should render unknown tool names as-is', () => {
      render(<ToolExecutionCard toolName="unknownTool" status="pending" />)
      expect(screen.getByText('unknownTool')).toBeInTheDocument()
    })

    it('should render result summary when provided', () => {
      render(<ToolExecutionCard toolName="createEvent" status="success" result={mockResult} />)
      expect(screen.getByText('Created event "Test Event"')).toBeInTheDocument()
    })
  })

  describe('status states', () => {
    it('should apply pending styles', () => {
      const { container } = render(<ToolExecutionCard toolName="createEvent" status="pending" />)
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('border-border')
      expect(card.className).toContain('bg-muted/50')
    })

    it('should apply executing styles and show spinner', () => {
      const { container } = render(<ToolExecutionCard toolName="createEvent" status="executing" />)
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('border-primary/30')
      expect(card.className).toContain('bg-primary/5')
      // Check for spinning icon (CircleNotch with animate-spin)
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should apply success styles and show check icon', () => {
      const { container } = render(
        <ToolExecutionCard toolName="createEvent" status="success" result={mockResult} />
      )
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('border-emerald-500/30')
      expect(card.className).toContain('bg-emerald-500/5')
    })

    it('should apply error styles and show x icon', () => {
      const errorResult = {
        ...mockResult,
        success: false,
        error: 'Something went wrong',
        summary: 'Failed to create event',
      }
      const { container } = render(
        <ToolExecutionCard toolName="createEvent" status="error" result={errorResult} />
      )
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('border-red-500/30')
      expect(card.className).toContain('bg-red-500/5')
    })
  })

  describe('different tool types', () => {
    it('should render vendor tool correctly', () => {
      render(<ToolExecutionCard toolName="searchVendors" status="success" />)
      expect(screen.getByText('Searching Vendors')).toBeInTheDocument()
    })

    it('should render sponsor tool correctly', () => {
      render(<ToolExecutionCard toolName="searchSponsors" status="success" />)
      expect(screen.getByText('Searching Sponsors')).toBeInTheDocument()
    })

    it('should render profile tool correctly', () => {
      render(<ToolExecutionCard toolName="getUserProfile" status="success" />)
      expect(screen.getByText('Getting Profile')).toBeInTheDocument()
    })
  })

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ToolExecutionCard toolName="createEvent" status="pending" className="custom-class" />
      )
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('custom-class')
    })
  })
})
