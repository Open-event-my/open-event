/**
 * Property-Based Tests for Image Optimization
 *
 * Tests Property 23: Image Optimization
 * Validates: Requirements 6.3 (Optimize images - WebP format, lazy loading)
 *
 * These tests verify that the OptimizedImage component correctly handles:
 * - WebP format support with automatic fallback
 * - Lazy loading behavior
 * - Priority loading for above-the-fold images
 * - Accessibility compliance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { render, screen, cleanup } from '@testing-library/react'
import {
  OptimizedImage,
  isLocalImage,
  getWebPPath,
  IMAGE_OPTIMIZATION_CONFIG,
} from './optimized-image'

// Store original createElement
const originalCreateElement = document.createElement.bind(document)

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()

class MockIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback) {
    void _callback // Intentionally unused - mock implementation
  }
  observe = mockObserve
  disconnect = mockDisconnect
  unobserve = vi.fn()
  root = null
  rootMargin = ''
  thresholds = []
  takeRecords = () => []
}

beforeEach(() => {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

  // Mock canvas for WebP support detection - use Object.defineProperty to avoid recursion
  const mockCanvas = {
    toDataURL: vi.fn().mockReturnValue('data:image/webp;base64,'),
    getContext: vi.fn(),
  }

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as unknown as HTMLCanvasElement
    }
    return originalCreateElement(tagName)
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  mockObserve.mockClear()
  mockDisconnect.mockClear()
})

describe('Image Optimization - Property Tests', () => {
  /**
   * Feature: production-readiness, Property 23: Image Optimization
   * Validates: Requirements 6.3
   *
   * For any image, the system should:
   * 1. Support WebP format with automatic fallback
   * 2. Implement lazy loading for below-the-fold images
   * 3. Allow priority loading for above-the-fold images
   * 4. Maintain accessibility compliance
   */
  describe('Property 23: Image Optimization', () => {
    describe('WebP Format Support', () => {
      it('should generate WebP path for supported image formats', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...IMAGE_OPTIMIZATION_CONFIG.supportedFormats),
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            (format, filename) => {
              const src = `/${filename}.${format}`
              const webpPath = getWebPPath(src)

              expect(webpPath).toBeDefined()
              expect(webpPath).toBe(`/${filename}.webp`)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should not generate WebP path for non-local images', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              'https://example.com/image.jpg',
              'http://cdn.example.com/photo.png',
              '//cdn.example.com/image.jpeg',
              'data:image/png;base64,abc123'
            ),
            (src) => {
              const webpPath = getWebPPath(src)
              expect(webpPath).toBeUndefined()
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should correctly identify local images', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.constantFrom('jpg', 'jpeg', 'png', 'webp', 'gif'),
            (filename, ext) => {
              const localSrc = `/${filename}.${ext}`
              const remoteSrc = `https://example.com/${filename}.${ext}`
              const protocolRelative = `//${filename}.${ext}`

              expect(isLocalImage(localSrc)).toBe(true)
              expect(isLocalImage(remoteSrc)).toBe(false)
              expect(isLocalImage(protocolRelative)).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should render picture element with WebP source for local images', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.constantFrom('jpg', 'jpeg', 'png'),
            (filename, ext) => {
              const src = `/${filename}.${ext}`
              const { container } = render(
                <OptimizedImage src={src} alt={`Test image ${filename}`} priority />
              )

              const picture = container.querySelector('picture')
              expect(picture).toBeInTheDocument()

              const source = container.querySelector('source[type="image/webp"]')
              expect(source).toBeInTheDocument()

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('Lazy Loading Behavior', () => {
      it('should apply lazy loading by default', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.constantFrom('jpg', 'png', 'webp'),
            (filename, ext) => {
              const src = `/${filename}.${ext}`
              render(<OptimizedImage src={src} alt={`Lazy image ${filename}`} />)

              const img = screen.getByRole('img')
              expect(img).toHaveAttribute('loading', 'lazy')

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should use IntersectionObserver for lazy loading', () => {
        fc.assert(
          fc.property(fc.stringMatching(/^[a-z][a-z0-9-]*$/), (filename) => {
            mockObserve.mockClear()
            const src = `/${filename}.jpg`
            render(<OptimizedImage src={src} alt={`Observer test ${filename}`} lazy />)

            // IntersectionObserver.observe should be called for lazy images
            expect(mockObserve).toHaveBeenCalled()

            cleanup()
          }),
          { numRuns: 100 }
        )
      })

      it('should not use IntersectionObserver when lazy is false', () => {
        fc.assert(
          fc.property(fc.stringMatching(/^[a-z][a-z0-9-]*$/), (filename) => {
            const src = `/${filename}.jpg`
            render(<OptimizedImage src={src} alt={`No lazy ${filename}`} lazy={false} />)

            const img = screen.getByRole('img')
            expect(img).toHaveAttribute('loading', 'eager')

            cleanup()
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Priority Loading', () => {
      it('should disable lazy loading when priority is true', () => {
        fc.assert(
          fc.property(fc.stringMatching(/^[a-z][a-z0-9-]*$/), (filename) => {
            const src = `/${filename}.jpg`
            render(<OptimizedImage src={src} alt={`Priority image ${filename}`} priority />)

            const img = screen.getByRole('img')
            expect(img).toHaveAttribute('loading', 'eager')
            expect(img).toHaveAttribute('fetchPriority', 'high')

            cleanup()
          }),
          { numRuns: 100 }
        )
      })

      it('should use sync decoding for priority images', () => {
        fc.assert(
          fc.property(fc.stringMatching(/^[a-z][a-z0-9-]*$/), (filename) => {
            const src = `/${filename}.png`
            render(<OptimizedImage src={src} alt={`Sync decode ${filename}`} priority />)

            const img = screen.getByRole('img')
            expect(img).toHaveAttribute('decoding', 'sync')

            cleanup()
          }),
          { numRuns: 100 }
        )
      })

      it('should use async decoding for non-priority images', () => {
        fc.assert(
          fc.property(fc.stringMatching(/^[a-z][a-z0-9-]*$/), (filename) => {
            const src = `/${filename}.png`
            render(<OptimizedImage src={src} alt={`Async decode ${filename}`} priority={false} />)

            const img = screen.getByRole('img')
            expect(img).toHaveAttribute('decoding', 'async')

            cleanup()
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Accessibility Compliance', () => {
      it('should always have alt attribute', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]*$/),
            (filename, altText) => {
              const src = `/${filename}.jpg`
              render(<OptimizedImage src={src} alt={altText} priority />)

              const img = screen.getByRole('img')
              expect(img).toHaveAttribute('alt', altText)

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should support empty alt for decorative images', () => {
        fc.assert(
          fc.property(fc.stringMatching(/^[a-z][a-z0-9-]*$/), (filename) => {
            const src = `/${filename}.jpg`
            const { container } = render(<OptimizedImage src={src} alt="" priority />)

            // Images with empty alt are decorative and have role="presentation"
            const img = container.querySelector('img')
            expect(img).toBeInTheDocument()
            expect(img).toHaveAttribute('alt', '')

            cleanup()
          }),
          { numRuns: 100 }
        )
      })

      it('should render img element with proper attributes', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]*$/),
            (filename, altText) => {
              const src = `/${filename}.jpg`
              const { container } = render(<OptimizedImage src={src} alt={altText} priority />)

              const img = container.querySelector('img')
              expect(img).toBeInTheDocument()
              expect(img).toHaveAttribute('alt', altText)

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('Placeholder Support', () => {
      it('should support different placeholder types', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.constantFrom('blur', 'skeleton', 'empty'),
            (filename, placeholder) => {
              const src = `/${filename}.jpg`
              const { container } = render(
                <OptimizedImage
                  src={src}
                  alt={`Placeholder test ${filename}`}
                  placeholder={placeholder}
                  priority
                />
              )

              const img = container.querySelector('img')
              expect(img).toBeInTheDocument()

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should support aspect ratio for skeleton placeholder', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.constantFrom('16/9', '4/3', '1/1', '3/2'),
            (filename, aspectRatio) => {
              const src = `/${filename}.jpg`
              const { container } = render(
                <OptimizedImage
                  src={src}
                  alt={`Aspect ratio test ${filename}`}
                  placeholder="skeleton"
                  aspectRatio={aspectRatio}
                  priority
                />
              )

              const img = container.querySelector('img')
              expect(img).toBeInTheDocument()
              expect(img?.style.aspectRatio).toBe(aspectRatio)

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('Configuration Constants', () => {
      it('should have valid supported formats', () => {
        fc.assert(
          fc.property(fc.constantFrom(...IMAGE_OPTIMIZATION_CONFIG.supportedFormats), (format) => {
            expect(['jpg', 'jpeg', 'png']).toContain(format)
          }),
          { numRuns: 100 }
        )
      })

      it('should have valid lazy load threshold', () => {
        expect(IMAGE_OPTIMIZATION_CONFIG.lazyLoadThreshold).toBe('50px')
      })

      it('should have valid default placeholder', () => {
        expect(IMAGE_OPTIMIZATION_CONFIG.defaultPlaceholder).toBe('empty')
      })
    })

    describe('Custom WebP Source', () => {
      it('should use provided webpSrc over auto-generated', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            (filename, customWebp) => {
              const src = `/${filename}.jpg`
              const webpSrc = `/custom/${customWebp}.webp`

              const { container } = render(
                <OptimizedImage
                  src={src}
                  webpSrc={webpSrc}
                  alt={`Custom webp ${filename}`}
                  priority
                />
              )

              const source = container.querySelector('source[type="image/webp"]')
              expect(source).toBeInTheDocument()
              expect(source).toHaveAttribute('srcSet', webpSrc)

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('Fallback Source', () => {
      it('should support fallback source for error handling', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            fc.stringMatching(/^[a-z][a-z0-9-]*$/),
            (filename, fallbackName) => {
              const src = `/${filename}.jpg`
              const fallbackSrc = `/fallback/${fallbackName}.jpg`

              const { container } = render(
                <OptimizedImage
                  src={src}
                  fallbackSrc={fallbackSrc}
                  alt={`Fallback test ${filename}`}
                  priority
                />
              )

              const img = container.querySelector('img')
              expect(img).toBeInTheDocument()

              cleanup()
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })
})
