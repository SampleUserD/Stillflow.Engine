import { runtime } from "../index.ts"
import { Item } from "./test-app-2.tsx"

const { $ } = runtime

const App = $(<Item />)

console.log(App)
