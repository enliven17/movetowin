import React, { useEffect, useRef, useState } from 'react'
import * as Matter from 'matter-js'

interface Entity {
  id: number
  type: 'rock' | 'paper' | 'scissors'
}

interface SimulationProps {
  running: boolean
  onWinner: (winner: 'rock' | 'paper' | 'scissors') => void
  winnerHistory: Array<'rock' | 'paper' | 'scissors'>
}

const LABELS = { rock: 'R', paper: 'P', scissors: 'S' }
const colors: Record<string, string> = {
  rock: '#3b82f6',
  paper: '#60a5fa',
  scissors: '#1e40af',
}

const Simulation: React.FC<SimulationProps> = ({ running, onWinner, winnerHistory }) => {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [positions, setPositions] = useState<{ [id: number]: { x: number; y: number } }>({})
  const [winner, setWinner] = useState<string | null>(null)

  useEffect(() => {
    if (!running) {
      setWinner(null)
      return
    }
    const engine = Matter.Engine.create()
    engine.gravity.y = 0 // No gravity
    engine.gravity.x = 0
    const width = 800
    const height = 600
    const render = Matter.Render.create({
      element: sceneRef.current!,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: '#fafafa',
      },
    })

    // Walls
    const wallOptions = { isStatic: true, restitution: 1.2, render: { fillStyle: '#2e2b44' } }
    const walls = [
      Matter.Bodies.rectangle(width / 2, -25, width, 50, wallOptions),
      Matter.Bodies.rectangle(width / 2, height + 25, width, 50, wallOptions),
      Matter.Bodies.rectangle(-25, height / 2, 50, height, wallOptions),
      Matter.Bodies.rectangle(width + 25, height / 2, 50, height, wallOptions),
    ]
    Matter.World.add(engine.world, walls)

    // Entities
    const types: Array<'rock' | 'paper' | 'scissors'> = ['rock', 'paper', 'scissors']
    const radius = 20
    const bodies: Matter.Body[] = []
    let id = 0
    const entityList: Entity[] = []
    const idMap = new Map<Matter.Body, number>()

    types.forEach((type) => {
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * (width - 2 * radius) + radius
        const y = Math.random() * (height - 2 * radius) + radius
        const body = Matter.Bodies.circle(x, y, radius, {
          restitution: 1.2,
          friction: 0,
          frictionAir: 0,
          render: { fillStyle: colors[type] },
        }) as any
        ;(body as any).entityType = type
        ;(body as any).entityId = id
        idMap.set(body, id)
        entityList.push({ id, type })
        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5,
        })
        bodies.push(body)
        id++
      }
    })
    setEntities(entityList)

    Matter.World.add(engine.world, bodies)

    // Collision handling
    Matter.Events.on(engine, 'collisionStart', (event: Matter.IEventCollision<Matter.Engine>) => {
      event.pairs.forEach((pair: Matter.Pair) => {
        const a = pair.bodyA as any
        const b = pair.bodyB as any
        if (!a.entityType || !b.entityType) return
        const typeA = a.entityType
        const typeB = b.entityType
        if (typeA === typeB) return
        const win = getWinner(typeA, typeB)
        if (win === typeA) {
          convert(b, typeA)
        } else if (win === typeB) {
          convert(a, typeB)
        }
      })
    })

    function getWinner(a: string, b: string): string {
      if (a === 'rock' && b === 'scissors') return 'rock'
      if (a === 'scissors' && b === 'paper') return 'scissors'
      if (a === 'paper' && b === 'rock') return 'paper'
      if (b === 'rock' && a === 'scissors') return 'rock'
      if (b === 'scissors' && a === 'paper') return 'scissors'
      if (b === 'paper' && a === 'rock') return 'paper'
      return a
    }

    function convert(body: any, newType: string) {
      body.entityType = newType
      body.render.fillStyle = colors[newType]
      Matter.Body.scale(body, 1.2, 1.2)
      setTimeout(() => {
        Matter.Body.scale(body, 1 / 1.2, 1 / 1.2)
      }, 200)
    }

    // Track positions for overlay labels
    const updatePositions = () => {
      const pos: { [id: number]: { x: number; y: number } } = {}
      for (const body of bodies) {
        const eid = (body as any).entityId
        pos[eid] = { x: body.position.x, y: body.position.y }
      }
      setPositions(pos)
      // --- KÖŞEDE KALANI İTME ---
      for (const body of bodies) {
        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2)
        if (speed < 0.2) {
          // Küçük bir rastgele hız ekle
          Matter.Body.setVelocity(body, {
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4,
          })
        }
      }
    }
    const runner = Matter.Runner.create()
    Matter.Events.on(runner, 'afterTick', updatePositions)

    Matter.Engine.run(engine)
    Matter.Render.run(render)
    Matter.Runner.run(runner, engine)

    // Check for winner
    const checkWinner = setInterval(() => {
      const typeCounts: Record<string, number> = { rock: 0, paper: 0, scissors: 0 }
      for (const body of bodies) {
        typeCounts[(body as any).entityType]++
      }
      const alive = Object.entries(typeCounts).filter(([_, v]) => v > 0)
      if (alive.length === 1) {
        setWinner(alive[0][0])
        onWinner(alive[0][0] as 'rock' | 'paper' | 'scissors')
        clearInterval(checkWinner)
      }
    }, 500)

    return () => {
      Matter.Render.stop(render)
      Matter.World.clear(engine.world, false)
      Matter.Engine.clear(engine)
      if (render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas)
      }
      render.textures = {}
      Matter.Runner.stop(runner)
      clearInterval(checkWinner)
    }
  }, [running, onWinner])

  // Overlay for labels and winner history
  return (
    <div style={{ position: 'relative', width: 800, height: 600 }}>
      {/* Winner history row */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 800, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 20 }}>
        {winnerHistory.map((w, i) => (
          <span key={i} style={{ fontWeight: 'bold', fontSize: 24, color: colors[w], background: '#222', borderRadius: 6, padding: '2px 10px', margin: 2 }}>{LABELS[w]}</span>
        ))}
      </div>
      <div ref={sceneRef} style={{ position: 'absolute', left: 0, top: 0 }} />
      {/* Overlay labels */}
      {entities.map((e) =>
        positions[e.id] ? (
          <div
            key={e.id}
            style={{
              position: 'absolute',
              left: positions[e.id].x - 10,
              top: positions[e.id].y - 10,
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: e.type === 'paper' ? '#222' : '#fff',
              fontWeight: 'bold',
              pointerEvents: 'none',
              userSelect: 'none',
              fontSize: 16,
              zIndex: 2,
            }}
          >
            {LABELS[e.type]}
          </div>
        ) : null
      )}
      {/* Winner overlay */}
      {winner && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          fontSize: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          Winner: {LABELS[winner as 'rock' | 'paper' | 'scissors']}
        </div>
      )}
    </div>
  )
}

export default Simulation 