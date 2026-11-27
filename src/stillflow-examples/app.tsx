import { core, operators, runtime, collections } from "stillflow.engine"
import { buildData } from "./data"

const { Stillflow, State, Batcher } = core
const { $, $index, $it } = runtime

type BenchmarkItem = {
  id: number,
  index: number,
  label: string
}

type BenchmarkMapping = {
  previous_id: number | undefined,
  current_id: number | undefined,
  data: BenchmarkItem[]
}

type FullBenchmarkView = {
  selection: {
    current_id: BenchmarkMapping['current_id'],
    previous_id: BenchmarkMapping['previous_id']
  },
  data: BenchmarkMapping['data'],
  items: collections.Flushable<BenchmarkItem>
}

class BenchmarkApplicationController {
  private _stillflow = new Stillflow<BenchmarkMapping>(new State())
  private _clearing = new Batcher(site => site())
  private _factory = this._stillflow.factory()

  private _view: FullBenchmarkView

  private schedule_clear() {
    this._view.items.clear()

    this._clearing.task(() => this._view.items.shrink())
  }

  private deselect() {
    this._view.selection.current_id = undefined
    this._view.selection.previous_id = undefined
  }

  private create(count: number = 1000) {
    this.schedule_clear()
    this.deselect()
    this.add(count)
  }

  private get source() {
    const previous_id = this._stillflow.variable('previous_id')
    const current_id = this._stillflow.variable('current_id')
    const data = this._stillflow.variable('data')

    return {
      selection: operators.link({
        previous_id: previous_id.backref(),
        current_id: current_id.backref()
      }),
      data: data.backref(),
      items: operators.is('collection')
    }
  }

  public constructor() {
    const col = new collections.Flushable(new collections.Fenwick(500))

    const view = this._stillflow.compile(this.source)

    this._factory.add('collection', view => col)

    this._view = this._stillflow.instantiate(view, this._factory)
  }

  public is_selected(id: number) {
    return this._view.selection.current_id === id
  }

  public add(count: number = 1000) {
    const data = buildData(count)

    for (let i = 0; i < count; i++) {
      data[i].index = i
    }

    this._view.items.attach(data)
    this._stillflow.commit()
  }

  public run() {
    this.create(1000)
  }

  public run_lots() {
    this.create(10000)
  }

  public remove(id: number) {
    if (this.is_selected(id)) {
      this._view.selection.current_id = undefined
    }

    this._view.items.remove(id)
    this._stillflow.commit()
  }

  public select(id: number) {
    this._view.selection.previous_id = this._view.selection.current_id
    this._view.selection.current_id = id

    if (this._view.selection.previous_id !== undefined) {
      this._view.items.touch(this._view.selection.previous_id)
    }

    this._view.items.touch(id)

    this._stillflow.commit()
  }

  public clear() {
    this.schedule_clear()
    this._stillflow.commit()
  }

  public update() {
    const length = this._view.items.size
    const mutator = (view: BenchmarkItem) => view.label += ' !!!'

    for (let id = 0; id < length; id += 10) {
      this._view.items.mutate(id, mutator)
    }

    this._stillflow.commit()
  }

  public swap() {
    const size = this._view.items.size

    if (size > 998) {
      this._view.items.swap(1, 998)
      this._stillflow.commit()
    }
  }

  public get items() {
    return this._view.items
  }

  public get core() {
    return this._stillflow
  }
}

function BenchmarkApplicationHeader() {
  return (
    <div class="col-md-6">
      <h1>Stillflow</h1>
    </div>
  )
}

function BenchmarkApplicationButton(text: string, id: string, handle: () => void) {
  return (
    <div class="col-sm-6 smallpad">
      <button type="button" class="btn btn-primary btn-block" id={id} onclick={handle}>
        {text}
      </button>
    </div>
  )
}

function BenchmarkApplicationTableRow(controller: BenchmarkApplicationController) {
  return (
    <tr class={controller.is_selected($it.index) ? "danger" : String()}>
      <td class="col-md-1">
        {$it.id}
      </td>
      <td class="col-md-4">
        <a sf: click={[() => controller.select($it.index), $it] as const}>
          {$it.label}
        </a>
      </td>
      <td class="col-md-1">
        <a sf: click={[() => controller.remove($it.index), $it]}>
          <span aria-hidden="true" class="glyphicon glyphicon-remove" />
        </a>
      </td>
      <td class="col-md-6" />
    </tr>
  )
}

function BenchmarkApplicationTable(controller: BenchmarkApplicationController) {
  return (
    <table class="table table-hover table-striped test-data">
      <tbody>
        <for select={controller.items}>
          <BenchmarkApplicationTableRow controller={controller} />
        </for>
      </tbody>
    </table>
  )
}

function BenchmarkApplicationView(controller: BenchmarkApplicationController) {
  return (
    <div id="app" class="container">
      <div class="jumbotron">
        <div class="row">
          <BenchmarkApplicationHeader />
          <div class="row">
            <div class="col-md-6">
              <BenchmarkApplicationButton text={"Create 1,000 rows"} id={"run"} handle={() => controller.run()} />
              <BenchmarkApplicationButton text={"Create 10,000 rows"} id={"runlots"} handle={() => controller.run_lots()} />
              <BenchmarkApplicationButton text={"Append 1,000 rows"} id={"add"} handle={() => controller.add()} />
              <BenchmarkApplicationButton text={"Update every 10th row"} id={"update"} handle={() => controller.update()} />
              <BenchmarkApplicationButton text={"Clear"} id={"clear"} handle={() => controller.clear()} />
              <BenchmarkApplicationButton text={"Swap rows"} id={"swaprows"} handle={() => controller.swap()} />
            </div>
          </div>
        </div>
      </div>
      <BenchmarkApplicationTable controller={controller} />
      <span aria-hidden="true" class="preloadicon glyphicon glyphicon-remove" />
    </div>
  )
}

const controller = new BenchmarkApplicationController()

const Fabric = $(<BenchmarkApplicationView controller={controller} />)

const patch = Fabric(document.body, {})

controller.core.on(() => patch({}))
controller.core.commit()