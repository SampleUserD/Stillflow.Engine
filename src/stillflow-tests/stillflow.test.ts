import { describe, it, expect, vi } from "vitest"
import { Collection, State, Stillflow, operators } from "../index.js"

describe('Stillflow: Basic behaviour', () => {
  describe('Stillflow:Commit()', () => {
    it('Commit inside commit', () => {
      const state = new State()
      const stillflow = new Stillflow(state)

      stillflow.on(() => stillflow.commit())

      expect(stillflow.commit).toThrow()
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

        expect(instance.meta.instantiated).toBeTruthy()
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

      it('Stillflow:Link with Stillflow:Instantiate() without mutation', () => {
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

        expect(view.link).not.toHaveProperty('y')
      })

      it('Stillflow:Link with Stillflow:Ref()', () => {
        const state = new State()
        const stillflow = new Stillflow<{ x: number, y: number }>(state)

        const x = stillflow.variable('x')
        const y = stillflow.variable('y')

        const source = { y: y.ref() }

        const view = stillflow.compile({
          x: x.ref(),
          link: operators.link(source)
        })

        x.write(10)
        y.write(10)

        stillflow.commit()

        expect(view.link.y).toBe(10)
      })
    })
  })

  describe('Stillflow:Collection', () => {
    describe('Append', () => {
      it('Use-case:basic', () => {
        const collection = new Collection([1, 2, 3], 4)

        collection.add(4)

        expect(collection.at(3)).toBe(4)
      })

      it('Use-case:overflow', () => {
        const collection = new Collection([1, 2, 3], 3)

        collection.add(4)

        expect(collection.at(3)).toBe(4)
        expect(collection.capacity).toBe(6)
      })
    })

    describe('Remove', () => {
      it('Use-case:basic', () => {
        const collection = new Collection([1, 2, 3], 3)

        collection.remove(1)

        expect(collection.index(2)).toBe(1)
      })

      it('Use-case:identical', () => {
        const collection = new Collection([1, 2, 3], 3)

        collection.remove(1)
        collection.remove(1)

        expect(collection.index(2)).toBe(1)
      })
    })

    describe('Update', () => {
      it('Use-case:basic', () => {
        const collection = new Collection([1, 2, 3], 3)

        collection.set(1, 4)

        expect(collection.at(1)).toBe(4)
      })
    })

    describe('Swap', () => {
      it('Use-case:basic', () => {
        const collection = new Collection([1, 2, 3], 3)

        collection.swap(0, 2)

        expect(collection.at(0)).toBe(3)
        expect(collection.at(2)).toBe(1)
      })

      it('Use-case:identiacal', () => {
        const collection = new Collection([1, 2, 3], 3)

        collection.swap(0, 2)
        collection.swap(0, 2)

        expect(collection.at(0)).toBe(1)
        expect(collection.at(2)).toBe(3)
      })
    })

    describe('Clear', () => {
      it('Use-case:basic', () => {
        const collection = new Collection([1, 2, 3], 4)

        collection.clear()

        collection.add(4)

        expect(collection.at(0)).toBe(4)
      })

      it('Use-case:capacity', () => {
        const collection = new Collection([1, 2, 3], 3)

        collection.clear()

        collection.add(4)

        expect(collection.capacity).toBe(3)
      })

      it('Use-case:clear', () => {
        const collection = new Collection([1, 2, 3], 4)

        collection.clear()

        expect(collection.at(0)).toBeUndefined()
      })

      it('Use-case:remove', () => {
        const collection = new Collection([1, 2, 3], 4)

        collection.clear()

        collection.add(4)
        collection.add(8)
        collection.remove(0)

        expect(collection.at(1)).toBe(8)
        expect(collection.at(collection.index(1))).toBe(4)
      })

      it('Use-case:update', () => {
        const collection = new Collection([1, 2, 3], 4)

        collection.clear()

        collection.set(0, 4)

        expect(collection.at(0)).toBe(4)
      })
    })
  })
})