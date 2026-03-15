'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function DotGrid({
  dotSize = 6,
  gap = 15,
  baseColor = '#271E37',
  activeColor = '#5227FF',
  proximity = 120,
  shockRadius = 250,
  shockStrength = 5,
  resistance = 750,
  returnDuration = 1.5,
}) {
  const containerRef = useRef(null)
  const dotsRef = useRef([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const buildGrid = () => {
      container.innerHTML = ''
      dotsRef.current = []

      const W = container.offsetWidth
      const H = container.offsetHeight
      const cols = Math.floor(W / (dotSize + gap))
      const rows = Math.floor(H / (dotSize + gap))
      const padX = (W - cols * (dotSize + gap)) / 2
      const padY = (H - rows * (dotSize + gap)) / 2

      const fragment = document.createDocumentFragment()

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dot = document.createElement('div')
          dot.style.cssText = `
            position: absolute;
            width: ${dotSize}px;
            height: ${dotSize}px;
            border-radius: 50%;
            background: ${baseColor};
            left: ${padX + c * (dotSize + gap)}px;
            top: ${padY + r * (dotSize + gap)}px;
            will-change: transform, background-color;
          `
          fragment.appendChild(dot)
          dotsRef.current.push(dot)
        }
      }

      container.appendChild(fragment)
    }

    buildGrid()

    const eventTarget = container.parentElement || container

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onClick = (e) => {
      const rect = container.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      dotsRef.current.forEach((dot) => {
        const dx = parseFloat(dot.style.left) + dotSize / 2 - cx
        const dy = parseFloat(dot.style.top) + dotSize / 2 - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < shockRadius) {
          const force = ((shockRadius - dist) / shockRadius) * shockStrength
          const angle = Math.atan2(dy, dx)
          gsap.to(dot, {
            x: Math.cos(angle) * force * (resistance / 100),
            y: Math.sin(angle) * force * (resistance / 100),
            duration: 0.3,
            ease: 'power2.out',
            onComplete: () => {
              gsap.to(dot, { x: 0, y: 0, duration: returnDuration, ease: 'elastic.out(1, 0.3)' })
            }
          })
        }
      })
    }

    const animate = () => {
      const { x: mx, y: my } = mouseRef.current

      dotsRef.current.forEach((dot) => {
        const cx = parseFloat(dot.style.left) + dotSize / 2
        const cy = parseFloat(dot.style.top) + dotSize / 2
        const dx = mx - cx
        const dy = my - cy
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < proximity) {
          const t = 1 - dist / proximity
          gsap.to(dot, {
            backgroundColor: activeColor,
            scale: 1 + t * 0.6,
            duration: 0.2,
            overwrite: 'auto',
          })
        } else {
          gsap.to(dot, {
            backgroundColor: baseColor,
            scale: 1,
            duration: 0.4,
            overwrite: 'auto',
          })
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    eventTarget.addEventListener('mousemove', onMouseMove)
    eventTarget.addEventListener('click', onClick)
    rafRef.current = requestAnimationFrame(animate)

    const ro = new ResizeObserver(buildGrid)
    ro.observe(container)

    return () => {
      cancelAnimationFrame(rafRef.current)
      eventTarget.removeEventListener('mousemove', onMouseMove)
      eventTarget.removeEventListener('click', onClick)
      ro.disconnect()
    }
  }, [dotSize, gap, baseColor, activeColor, proximity, shockRadius, shockStrength, resistance, returnDuration])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none' }} />
}
