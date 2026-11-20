export function build_url(path: number[], tag: string) {
  return `${path.join(':')}-${tag}`
}