import { Flushable } from '@/stillflow-collection/index'

declare global {
  namespace JSX {
    type AnyFunction = (...args: any[]) => any

    type BaseProperties<T extends HTMLElement> = Partial<{ [K in keyof T]: T[K] }>

    type BasePropertiesWithout<T extends HTMLElement, K extends string> = Omit<BaseProperties<T>, K>

    type AdditionalProperties = Partial<{
      class: string,
      style: string,
      children: any,
      [data_attribute: `data-${string}`]: string | number | boolean,
      [aria_attribute: `aria-${string}`]: string | number | boolean
    }>

    type ElementType =
      | keyof IntrinsicElements
      | AnyFunction

    type TypicalEventHandler<E extends Event> = (event: E) => void

    type SFEventHandler<E extends Event, T = any> = readonly [(event: E, data: T) => void, T]

    type SFEventProperties = Partial<{
      [K in keyof GlobalEventHandlersEventMap as `sf:${K}`]: SFEventHandler<GlobalEventHandlersEventMap[K]>
    }>

    type LibraryManagedAttributes<C, P> = C extends AnyFunction ? Record<string, any> : P

    type ElementProps<T extends HTMLElement> = BasePropertiesWithout<T, 'className' | 'children'> & AdditionalProperties & SFEventProperties

    type HTMLTags = { [K in keyof HTMLElementTagNameMap]: ElementProps<HTMLElementTagNameMap[K]> }

    interface IntrinsicElements extends HTMLTags {
      for: {
        select: Flushable<unknown>
      }
    }
  }
}