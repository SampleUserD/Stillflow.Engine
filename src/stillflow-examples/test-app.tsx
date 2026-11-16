import { runtime } from "../index.ts"
import { Item } from "./test-app-2.tsx"

const { $, jsxdom } = runtime

const App = $(<jsxdom.div sf: for={(context: any) => context.items} sf: each={() => <Item controller={() => alert(1)} />}></jsxdom.div>)

console.log(App)
