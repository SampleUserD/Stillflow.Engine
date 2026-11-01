import { describe, it, expect, vi } from "vitest"
import { State, Stillflow, operators } from "../index.js"

describe('Stillflow: Basic behaviour', () => {
  describe('Stillflow:Commit()', () => {
    it('Commit inside commit', () => {
      const state = new State()
      const stillflow = new Stillflow(state)

      expect(stillflow.on(() => stillflow.commit())).toThrow()
    })

    it('Commit works as intented', () => {
      const state = new State()
      const stillflow = new Stillflow<{ x: number }>(state)
      const x = stillflow.variable('x')

      x.write(10)

      expect(x.read()).toBeUndefined()

      stillflow.commit()

      expect(x.read()).toBe(10)
    })
  })

  describe('Stillflow:Operators()', () => {
    it('Reference [ref()] works as intented', () => {
      const state = new State()
      const stillflow = new Stillflow<{ x: number }>(state)

      const x = stillflow.variable('x')

      const view = stillflow.compile({ x: x.ref() })

      x.write(10)

      stillflow.commit()

      expect(view.x).toBe(10)
    })

    it('Backreference [backref()] works as intented', () => {
      const state = new State()
      const stillflow = new Stillflow<{ x: number }>(state)

      const x = stillflow.variable('x')

      const view = stillflow.compile({ x: x.ref(), y: x.backref() })

      view.y = 10

      stillflow.commit()

      expect(view.x).toBe(10)
    })

    it('Local [local()] works as intented', () => {
      const state = new State()
      const stillflow = new Stillflow<{ x: number }>(state)

      const source = stillflow.compile({
        x: operators.local(10)
      })

      expect(source.x).toBe(10)
    })

    describe('Is [is()] works as intented', () => {
      it('Stillflow:Meta', () => {
        const state = new State()
        const stillflow = new Stillflow(state)
        const factory = stillflow.factory()

        const view = stillflow.compile({ x: operators.is('test') })

        expect(view.meta.behaviors).toHaveProperty('x', 'test')
      })

      it('Stillflow:Meta:Instantiated', () => {
        const state = new State()
        const stillflow = new Stillflow(state)
        const factory = stillflow.factory()

        factory.add('test', () => {
          return { value: 10 }
        })

        const view = stillflow.compile({ x: operators.is('test') })
        const instance = stillflow.instantiate(view, factory)

        expect(view.meta.instantiated).toBeTruthy()
      })

      it('Stillflow:Instantiate()', () => {
        const state = new State()
        const stillflow = new Stillflow(state)
        const factory = stillflow.factory()

        factory.add('test', () => {
          return { value: 10 }
        })

        const view = stillflow.compile({ x: operators.is('test') })
        const instance = stillflow.instantiate(view, factory)

        expect(instance.x).toHaveProperty('value', 10)
      })
    })

    describe('Link [link()] works as intented', () => {
      it('Stillflow:Link', () => {
        const state = new State()
        const stillflow = new Stillflow<{ x: number, y: number }>(state)

        const x = stillflow.variable('x')
        const y = stillflow.variable('y')

        const source = { y: y.ref() }

        const view = stillflow.compile({
          x: x.ref(),
          link: operators.link(source)
        })

        y.write(10)

        stillflow.commit()

        expect(view.link.y).toBe(10)
      })

      it('Stillflow:Link with Stillflow:Instantiate()', () => {
        const state = new State()
        const stillflow = new Stillflow<{ x: number }>(state)
        const factory = stillflow.factory()

        factory.add('test', () => {
          return { value: 10 }
        })

        const x = stillflow.variable('x')

        const source = { y: operators.is('test') }

        const view = stillflow.compile({
          x: x.ref(),
          link: operators.link(source)
        })

        const instance = stillflow.instantiate(view, factory)

        expect(instance.link.y).toHaveProperty('value', 10)
      })
    })
  })
})