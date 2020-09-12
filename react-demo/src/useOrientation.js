import { useEffect, useState } from 'react'

export function getOrientation() {
  if (window.orientation === 0 || window.orientation === 180) {
    return 'portrait'
  }

  return 'landscape'
}

export default function useOrientation() {
  const [orientation, setOrientation] = useState(
    getOrientation
  )

  useEffect(() => {
    const onOrientationChange = () => {
      console.log('useOrientation changed to', getOrientation())
      setOrientation(getOrientation())
    }

    window.addEventListener('orientationchange', onOrientationChange)
    return () => {
      window.removeEventListener('orientationchange', onOrientationChange)
    }
  })

  return orientation
}
