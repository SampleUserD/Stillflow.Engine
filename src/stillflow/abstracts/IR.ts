export type IR = {
  refs: Record<string, string>,
  links: Record<string, any>,
  locals: Record<string, any>,
  backrefs: Record<string, string>,
  behaviors: Record<string, string>
}