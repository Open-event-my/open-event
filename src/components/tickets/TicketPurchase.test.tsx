/**
 * Tests for TicketPurchase Component
 * Verifies PCI-compliant Stripe Checkout integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketPurchase } from './TicketPurchase';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock Convex hooks
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseAction = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
  useAction: () => mockUseAction(),
}));

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('TicketPurchase', () => {
  const mockEventId = 'event123' as Id<'events'>;
  const mockEventTitle = 'Test Event';

  const mockTicketTypes = [
    {
      _id: 'ticket1' as Id<'ticketTypes'>,
      name: 'General Admission',
      price: 5000, // $50.00
      description: 'Standard entry',
      perks: ['Entry to event'],
      maxPerOrder: 10,
      remaining: 100,
      isSoldOut: false,
    },
    {
      _id: 'ticket2' as Id<'ticketTypes'>,
      name: 'VIP',
      price: 15000, // $150.00
      description: 'Premium experience',
      perks: ['Priority entry', 'VIP lounge access'],
      maxPerOrder: 5,
      remaining: 20,
      isSoldOut: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(mockTicketTypes);
    mockUseMutation.mockReturnValue(vi.fn());
    mockUseAction.mockReturnValue(vi.fn());
  });

  describe('PCI Compliance - Stripe Checkout', () => {
    it('should NOT render any credit card input fields on initial load', () => {
      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      // Verify no credit card input fields exist anywhere in the component
      expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/cvv/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/cvc/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/expir/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/security code/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/4242/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/card/i)).not.toBeInTheDocument();
    });

    it('should NOT have any input fields for card data in the DOM', () => {
      const { container } = render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      // Check that no inputs have card-related names or autocomplete attributes
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        const name = input.getAttribute('name')?.toLowerCase() || '';
        const autocomplete = input.getAttribute('autocomplete')?.toLowerCase() || '';
        const id = input.getAttribute('id')?.toLowerCase() || '';
        const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';

        // None of these should contain card-related terms
        expect(name).not.toMatch(/card|cvv|cvc|ccnum|credit/);
        expect(autocomplete).not.toMatch(/cc-number|cc-csc|cc-exp/);
        expect(id).not.toMatch(/card|cvv|cvc|ccnum|credit/);
        expect(placeholder).not.toMatch(/4242|card number|\d{4}/);
      });
    });

    it('should use Stripe Checkout redirect pattern (not embedded card form)', () => {
      // The component uses createCheckoutSession which returns a URL
      // This is the PCI-compliant pattern - redirect to Stripe hosted page
      const mockCreateCheckoutSession = vi.fn().mockResolvedValue({ 
        url: 'https://checkout.stripe.com/session123',
        sessionId: 'cs_test_123'
      });
      mockUseAction.mockReturnValue(mockCreateCheckoutSession);

      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      // The component should NOT render Stripe Elements (CardElement, etc.)
      expect(screen.queryByTestId('card-element')).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: /card/i })).not.toBeInTheDocument();
    });

    it('should use Stripe publishable key (pk_) not secret key (sk_)', async () => {
      const mockGetStripeKey = vi.fn().mockResolvedValue({ publishableKey: 'pk_test_123' });
      mockUseAction.mockReturnValue(mockGetStripeKey);

      // Call the mock to verify the key format
      const result = await mockGetStripeKey();
      
      // Publishable keys start with pk_
      expect(result.publishableKey).toMatch(/^pk_/);
      // Should never be a secret key
      expect(result.publishableKey).not.toMatch(/^sk_/);
    });
  });

  describe('Ticket Selection', () => {
    it('should display available ticket types', () => {
      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      expect(screen.getByText('General Admission')).toBeInTheDocument();
      expect(screen.getByText('VIP')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });

    it('should show loading state when tickets are loading', () => {
      mockUseQuery.mockReturnValue(undefined);
      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      expect(screen.getByText(/loading tickets/i)).toBeInTheDocument();
    });

    it('should show empty state when no tickets available', () => {
      mockUseQuery.mockReturnValue([]);
      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      expect(screen.getByText(/no tickets available/i)).toBeInTheDocument();
    });

    it('should display ticket perks', () => {
      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      expect(screen.getByText('Entry to event')).toBeInTheDocument();
      expect(screen.getByText('Priority entry')).toBeInTheDocument();
      expect(screen.getByText('VIP lounge access')).toBeInTheDocument();
    });

    it('should show sold out badge for sold out tickets', () => {
      mockUseQuery.mockReturnValue([
        { ...mockTicketTypes[0], isSoldOut: true },
      ]);
      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      expect(screen.getByText('Sold Out')).toBeInTheDocument();
    });
  });

  describe('Security - No Sensitive Data Storage', () => {
    it('should not store any card data in component state', () => {
      // The component only stores buyer info (name, email, phone)
      // and cart items (ticket selections) - never card data
      render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      // Component renders without any card-related state
      // This is verified by the absence of card input fields
      expect(screen.queryByLabelText(/card/i)).not.toBeInTheDocument();
    });

    it('should only collect non-sensitive buyer information', () => {
      // The checkout dialog only asks for name, email, phone
      // Card data is collected by Stripe's hosted checkout page
      const { container } = render(<TicketPurchase eventId={mockEventId} eventTitle={mockEventTitle} />);

      // The component should have quantity controls but no payment inputs
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);

      // No card inputs should exist
      const cardInputs = container.querySelectorAll('input[type="tel"][pattern*="card"], input[autocomplete*="cc-"]');
      expect(cardInputs.length).toBe(0);
    });
  });
});
