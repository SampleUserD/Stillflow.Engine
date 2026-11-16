export type VMBinding<P> = {
  children: VMBinding<P>[],
  properties: P
}