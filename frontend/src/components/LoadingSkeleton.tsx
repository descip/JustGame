import './LoadingSkeleton.css'

interface LoadingSkeletonProps {
  width?: string
  height?: string
  className?: string
  count?: number
}

export default function LoadingSkeleton({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  count = 1 
}: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${className}`}
          style={{ width, height }}
        />
      ))}
    </>
  )
}

