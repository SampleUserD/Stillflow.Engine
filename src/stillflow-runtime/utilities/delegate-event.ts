const registered_events = new Set<string>()

export function delegate_event(event_name: string): void {
  if (registered_events.has(event_name)) {
    return
  }

  registered_events.add(event_name)

  const handler_key = `$$${event_name}`
  const data_key = `$$${event_name}_data`

  document.addEventListener(event_name, event => {
    let target = event.target as (Node & Record<string, any>)

    while (target && target !== document) {
      const handler = target[handler_key]

      if (handler !== undefined) {
        const data = target[data_key]

        if (data !== undefined) {
          handler(event, data)
        } else {
          handler(event)
        }

        if (event.cancelBubble) {
          return
        }
      }

      target = target.parentNode
    }
  })
}