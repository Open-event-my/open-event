import { useState, useRef, useEffect } from 'react'
import type { ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Source URL for the image */
  src: string
  /** Alternative text for accessibility */
  alt: string
  /** WebP source URL (optional - will be auto-generated for local images) */
  webpSrc?: string
  /** Fallback source URL for browsers that don't support WebP */
  fallbackSrc?: string
  /** Whether to use lazy loading (default: true) */
  lazy?: boolean
  /** Placeholder to show while loading */
  placeholder?: 'blur' | 'empty' | 'skeleton'
  /** Low-quality placeholder image URL for blur effect */
  blurDataUrl?: string
  /** Aspect ratio for skeleton placeholder (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string
  /** Priority loading - disables lazy loading for above-the-fold images */
  priority?: boolean
}

/**
 * OptimizedImage component with WebP support and lazy loading
 * 
 * Features:
 * - Automatic WebP format detection and fallback
 * - Native lazy loading with IntersectionObserver fallback
 * - Placeholder support (blur, skeleton, empty)
 * - Responsive image loading
 * - Accessibility compliant
 * 
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/auth-bg.jpg"
 *   webpSrc="/auth-bg.webp"
 *   alt="Background"
 *   lazy
 *   placeholder="skeleton"
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  webpSrc,
  fallbackSrc,
  lazy = true,
  placeholder = 'empty',
  blurDataUrl,
  aspectRatio,
  priority = false,
  className,
  style,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const imgRef = useRef<HTMLImageElement>(null)

  // Determine if we should use lazy loading
  const shouldLazyLoad = lazy && !priority

  // Generate WebP source if not provided (for local images)
  const computedWebpSrc = webpSrc || (src.match(/\.(jpg|jpeg|png)$/i) 
    ? src.replace(/\.(jpg|jpeg|png)$/i, '.webp') 
    : undefined)

  // Use IntersectionObserver for lazy loading
  useEffect(() => {
    if (!shouldLazyLoad || isInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [shouldLazyLoad, isInView])

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true)
    onLoad?.(e)
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true)
    onError?.(e)
  }

  // Placeholder styles
  const placeholderStyles = cn(
    'transition-opacity duration-300',
    !isLoaded && placeholder === 'skeleton' && 'animate-pulse bg-muted',
    !isLoaded && placeholder === 'blur' && blurDataUrl && 'blur-sm scale-105',
    isLoaded && 'opacity-100',
    !isLoaded && placeholder !== 'empty' && 'opacity-0'
  )

  // Container styles for aspect ratio
  const containerStyles = aspectRatio
    ? { aspectRatio, ...style }
    : style

  // If image failed to load, show fallback or nothing
  if (hasError && !fallbackSrc) {
    return (
      <div
        ref={imgRef}
        className={cn('bg-muted flex items-center justify-center', className)}
        style={containerStyles}
        role="img"
        aria-label={alt}
      >
        <span className="text-muted-foreground text-xs">Image unavailable</span>
      </div>
    )
  }

  // Check if browser supports WebP
  const supportsWebP = typeof window !== 'undefined' && 
    document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0

  // Determine final source
  const finalSrc = hasError && fallbackSrc 
    ? fallbackSrc 
    : (supportsWebP && computedWebpSrc ? computedWebpSrc : src)

  return (
    <picture>
      {/* WebP source for modern browsers */}
      {computedWebpSrc && !hasError && (
        <source srcSet={isInView ? computedWebpSrc : undefined} type="image/webp" />
      )}
      
      {/* Fallback source */}
      <img
        ref={imgRef}
        src={isInView ? finalSrc : (blurDataUrl || undefined)}
        alt={alt}
        loading={shouldLazyLoad ? 'lazy' : 'eager'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(placeholderStyles, className)}
        style={containerStyles}
        {...props}
      />
    </picture>
  )
}

/**
 * Utility to check if a URL points to a local image that could have a WebP version
 */
export function isLocalImage(src: string): boolean {
  return src.startsWith('/') && !src.startsWith('//')
}

/**
 * Utility to generate WebP path from original image path
 */
export function getWebPPath(src: string): string | undefined {
  if (!isLocalImage(src)) return undefined
  return src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
}

/**
 * Image optimization configuration
 */
export const IMAGE_OPTIMIZATION_CONFIG = {
  /** Supported formats for WebP conversion */
  supportedFormats: ['jpg', 'jpeg', 'png'],
  /** Default lazy loading threshold */
  lazyLoadThreshold: '50px',
  /** Default placeholder type */
  defaultPlaceholder: 'empty' as const,
}

export default OptimizedImage
