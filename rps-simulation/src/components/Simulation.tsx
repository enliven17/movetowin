import React, { useEffect, useRef } from 'react'
import * as Matter from 'matter-js'

const Simulation: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const engine = Matter.Engine.create()
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
    const wallOptions = { isStatic: true, render: { fillStyle: '#2e2b44' } }
    const walls = [
      Matter.Bodies.rectangle(width / 2, -25, width, 50, wallOptions),
      Matter.Bodies.rectangle(width / 2, height + 25, width, 50, wallOptions),
      Matter.Bodies.rectangle(-25, height / 2, 50, height, wallOptions),
      Matter.Bodies.rectangle(width + 25, height / 2, 50, height, wallOptions),
    ]
    Matter.World.add(engine.world, walls)

    // Entities
    const types: Array<'rock' | 'paper' | 'scissors'> = ['rock', 'paper', 'scissors']
    const colors: Record<string, string> = {
      rock: '#888888',
      paper: '#ffffff',
      scissors: '#ff0000',
    }
    const radius = 20
    const bodies: Matter.Body[] = []

    types.forEach((type) => {
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * (width - 2 * radius) + radius
        const y = Math.random() * (height - 2 * radius) + radius
        const body = Matter.Bodies.circle(x, y, radius, {
          restitution: 1,
          friction: 0,
          frictionAir: 0,
          render: { fillStyle: colors[type] },
        }) as any
        ;(body as any).entityType = type
        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5,
        })
        bodies.push(body)
      }
    })

    Matter.World.add(engine.world, bodies)

    // Collision handling
    Matter.Events.on(engine, 'collisionStart', (event: Matter.IEventCollision<Matter.Engine>) => {
      event.pairs.forEach((pair: Matter.IPair) => {
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

    Matter.Engine.run(engine)
    Matter.Render.run(render)

    return () => {
      Matter.Render.stop(render)
      Matter.World.clear(engine.world, false)
      Matter.Engine.clear(engine)
      if (render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas)
      }
      render.textures = {}
    }
  }, [])

  return <div ref={sceneRef} />
}

export default Simulation 