import { collections, runtime } from "stillflow.engine"

const { dom, $, $it, $index, $parent } = runtime

const { div, em, strong } = dom

type CategoryData = {
  title: string
  groups: collections.Flushable<GroupData>
}

type GroupData = {
  label: string
  subcategories: collections.Flushable<CategoryData>
}

// Компонент A: рендерит списки групп (Компонент B)
function Category(props: { it: CategoryData }) {
  return (
    <div className="category">
      <strong>{props.it.title}</strong>
      <div>
        <for select={props.it.groups || createFlushable()}>
          <SubGroup it={$it} />
        </for>
      </div>
    </div>
  )
}

// Компонент B: замыкает цикл, снова рендеря Компонент A
function SubGroup(props: { it: GroupData }) {
  return (
    <div className="group" style="margin-left: 16px">
      <em>{props.it.label}</em>
      <div>
        <for select={props.it.subcategories || createFlushable()}>
          <Category it={$it} />
        </for>
      </div>
    </div>
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
const Fabric = $(<Category it={root_category} />)
const { app, root } = Fabric(root_category)

document.body.appendChild(root)
app(root_category)
