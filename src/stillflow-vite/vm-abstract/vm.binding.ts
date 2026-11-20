export interface VMBinding<Properties> {
  children: VMBinding<Properties>[],
  properties: Properties
}