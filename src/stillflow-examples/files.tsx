import { Stillflow, State, operators, adapters, FlushableCollection, FenwickCollection } from "../index.js"

const { jsxdom, dom } = adapters

type File = {
  name: string,
  files: FlushableCollection<File>
}

type System = {
  root: File
}

const core = new Stillflow<System>(new State())
const factory = core.factory()

factory.add('collection', () => new FlushableCollection(new FenwickCollection(100)))

function FileView({ depth }: { depth: number }) {
  return (
    <jsxdom.div styles={{ 'padding': `${depth * 4}px` }}>
      <jsxdom.span>{(context: File) => context.name}</jsxdom.span>
      <jsxdom.div sf: for={(context: File) => context.files} sf: each={() => <FileView depth={depth + 1} />} />
    </jsxdom.div>
  )
}

const root: File = {
  name: 'test',
  files: factory.get('collection', {})
}

root.files.add({
  name: 'test-0',
  files: factory.get('collection', {})
})

root.files.at(0).files.add({
  name: 'test-0-1',
  files: factory.get('collection', {})
})

root.files.add({
  name: 'test-1',
  files: factory.get('collection', {})
})

const { element, update } = dom.$(<FileView depth={0} />)

update(root)

document.body.append(element)