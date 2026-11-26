import { collections, runtime } from "stillflow.engine"

const { dom, $ } = runtime

type CategoryData = {
  title: string
  groups: collections.Flushable<GroupData>
}

type GroupData = {
  label: string
  subcategories: collections.Flushable<CategoryData>
}

// Компонент A: рендерит списки групп (Компонент B)
function Category() {
  return (
    <dom.div className="category">
      <dom.strong>{(context: CategoryData) => context.title}</dom.strong>
      <dom.div
        sf: for={(context: CategoryData) => context.groups}
        sf: each={() => <SubGroup />}
      />
    </dom.div>
  )
}

// Компонент B: замыкает цикл, снова рендеря Компонент A
function SubGroup() {
  return (
    <dom.div className="group" style: marginLeft="16px">
      <dom.em>{(context: GroupData) => context.label}</dom.em>
      <dom.div
        sf: for={(context: GroupData) => context.subcategories}
        sf: each={() => <Category />}
      />
    </dom.div>
  )
}

// Сборка тестового графа данных (2 полных цикла: Category -> Group -> Category)
const createFlushable = <T,>() => new collections.Flushable<T>(new collections.Fenwick(16))

const root_category: CategoryData = {
  title: "Root Category (A1)",
  groups: createFlushable()
}

const group_b1: GroupData = {
  label: "Group (B1)",
  subcategories: createFlushable()
}

const nested_category_a2: CategoryData = {
  title: "Nested Category (A2)",
  groups: createFlushable()
}

const group_b2: GroupData = {
  label: "Group (B2)",
  subcategories: createFlushable()
}

const nested_category_a3: CategoryData = {
  title: "Nested Category (A3)",
  groups: createFlushable()
}

const group_b3: GroupData = {
  label: "Group (B3)",
  subcategories: createFlushable()
}

nested_category_a3.groups.add(group_b3)
group_b2.subcategories.add(nested_category_a3)
nested_category_a2.groups.add(group_b2)
group_b1.subcategories.add(nested_category_a2)
root_category.groups.add(group_b1)

// Компиляция и запуск
const Fabric = $(<Category />)
const { app, root } = Fabric

document.body.appendChild(root)
app(root_category)
