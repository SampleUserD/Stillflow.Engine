type Mapping = Record<string, any>

export interface AbstractState<T extends Mapping = Mapping> {
  write<K extends keyof T>(path: K, value: T[K]): void

  read<K extends keyof T>(path: K): T[K]

  remove<K extends keyof T>(path: K): void
}