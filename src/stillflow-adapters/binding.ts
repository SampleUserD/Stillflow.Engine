export type Binding<P> = {
  children: Binding<P>[],
  properties: P
}