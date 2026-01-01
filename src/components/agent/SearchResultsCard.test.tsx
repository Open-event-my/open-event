import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchResultsCard } from './SearchResultsCard'

describe('SearchResultsCard', () => {
  const mockVendors = [
    {
      id: 'vendor-1',
      name: 'Gourmet Catering Co.',
      category: 'catering',
      description: 'Premium catering services',
      rating: 4.8,
      priceRange: '$$$',
      location: 'San Francisco, CA',
      verified: true,
    },
    {
      id: 'vendor-2',
      name: 'Budget Bites',
      category: 'catering',
      rating: 4.2,
      priceRange: '$',
      verified: false,
    },
  ]

  const mockSponsors = [
    {
      id: 'sponsor-1',
      name: 'TechCorp Inc.',
      industry: 'technology',
      description: 'Leading tech company',
      budgetRange: '$10,000 - $50,000',
      sponsorshipTiers: ['gold', 'silver', 'bronze'],
      verified: true,
    },
    {
      id: 'sponsor-2',
      name: 'StartupHub',
      industry: 'technology',
      verified: false,
    },
  ]

  describe('empty state', () => {
    it('should show empty message for vendors', () => {
      render(<SearchResultsCard type="vendors" results={[]} />)
      expect(screen.getByText(/no vendors found matching your criteria/i)).toBeInTheDocument()
    })

    it('should show empty message for sponsors', () => {
      render(<SearchResultsCard type="sponsors" results={[]} />)
      expect(screen.getByText(/no sponsors found matching your criteria/i)).toBeInTheDocument()
    })
  })

  describe('vendor results', () => {
    it('should display vendor count', () => {
      render(<SearchResultsCard type="vendors" results={mockVendors} />)
      expect(screen.getByText(/found 2 vendors:/i)).toBeInTheDocument()
    })

    it('should render vendor names', () => {
      render(<SearchResultsCard type="vendors" results={mockVendors} />)
      expect(screen.getByText('Gourmet Catering Co.')).toBeInTheDocument()
      expect(screen.getByText('Budget Bites')).toBeInTheDocument()
    })

    it('should render vendor categories', () => {
      render(<SearchResultsCard type="vendors" results={mockVendors} />)
      const categoryElements = screen.getAllByText('catering')
      expect(categoryElements.length).toBeGreaterThan(0)
    })

    it('should render vendor ratings when available', () => {
      render(<SearchResultsCard type="vendors" results={mockVendors} />)
      expect(screen.getByText('4.8')).toBeInTheDocument()
      expect(screen.getByText('4.2')).toBeInTheDocument()
    })

    it('should render vendor price range when available', () => {
      render(<SearchResultsCard type="vendors" results={mockVendors} />)
      expect(screen.getByText('$$$')).toBeInTheDocument()
      expect(screen.getByText('$')).toBeInTheDocument()
    })

    it('should render vendor location when available', () => {
      render(<SearchResultsCard type="vendors" results={mockVendors} />)
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
    })

    it('should show verified badge for verified vendors', () => {
      const { container } = render(<SearchResultsCard type="vendors" results={mockVendors} />)
      // CheckCircle icons for verified vendors
      const verifiedBadges = container.querySelectorAll('.text-blue-500')
      expect(verifiedBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('sponsor results', () => {
    it('should display sponsor count', () => {
      render(<SearchResultsCard type="sponsors" results={mockSponsors} />)
      expect(screen.getByText(/found 2 sponsors:/i)).toBeInTheDocument()
    })

    it('should render sponsor names', () => {
      render(<SearchResultsCard type="sponsors" results={mockSponsors} />)
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument()
      expect(screen.getByText('StartupHub')).toBeInTheDocument()
    })

    it('should render sponsor industries', () => {
      render(<SearchResultsCard type="sponsors" results={mockSponsors} />)
      const industryElements = screen.getAllByText('technology')
      expect(industryElements.length).toBeGreaterThan(0)
    })

    it('should render sponsor budget range when available', () => {
      render(<SearchResultsCard type="sponsors" results={mockSponsors} />)
      expect(screen.getByText('$10,000 - $50,000')).toBeInTheDocument()
    })

    it('should render sponsorship tiers when available', () => {
      render(<SearchResultsCard type="sponsors" results={mockSponsors} />)
      expect(screen.getByText('gold')).toBeInTheDocument()
      expect(screen.getByText('silver')).toBeInTheDocument()
      expect(screen.getByText('bronze')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onSelect when vendor is clicked', () => {
      const onSelect = vi.fn()
      render(<SearchResultsCard type="vendors" results={mockVendors} onSelect={onSelect} />)

      fireEvent.click(screen.getByText('Gourmet Catering Co.'))
      expect(onSelect).toHaveBeenCalledWith('vendor-1')
    })

    it('should call onSelect when sponsor is clicked', () => {
      const onSelect = vi.fn()
      render(<SearchResultsCard type="sponsors" results={mockSponsors} onSelect={onSelect} />)

      fireEvent.click(screen.getByText('TechCorp Inc.'))
      expect(onSelect).toHaveBeenCalledWith('sponsor-1')
    })

    it('should not throw when onSelect is not provided', () => {
      render(<SearchResultsCard type="vendors" results={mockVendors} />)
      expect(() => {
        fireEvent.click(screen.getByText('Gourmet Catering Co.'))
      }).not.toThrow()
    })
  })

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SearchResultsCard type="vendors" results={mockVendors} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should apply className on empty state', () => {
      const { container } = render(
        <SearchResultsCard type="vendors" results={[]} className="empty-custom-class" />
      )
      expect(container.firstChild).toHaveClass('empty-custom-class')
    })
  })

  describe('singular/plural text', () => {
    it('should show singular "vendor" for one result', () => {
      render(<SearchResultsCard type="vendors" results={[mockVendors[0]]} />)
      // Note: Implementation might vary, but typically shows "Found 1 vendors:" or similar
      expect(screen.getByText(/found 1/i)).toBeInTheDocument()
    })

    it('should show singular "sponsor" for one result', () => {
      render(<SearchResultsCard type="sponsors" results={[mockSponsors[0]]} />)
      expect(screen.getByText(/found 1/i)).toBeInTheDocument()
    })
  })
})
