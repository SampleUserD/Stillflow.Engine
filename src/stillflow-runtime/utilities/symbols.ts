const EMPTY = () => String()

export const SF_LISTENED = '__stillflow_listened__'
export const SF_CONTEXT = '__stillflow_context__'
export const SF_CACHE_TEXT = '__stillflow_cache_text__'
export const SF_CACHE = '__stillflow_cache__'
export const SF_HANDLERS = `__stillflow_handlers__`

export const SF_ANY: any = new Proxy({}, {
  get: (_, property) => {
    if (property === Symbol.toPrimitive || property === 'valueOf') {
      return EMPTY
    }

    if (property === Symbol.iterator) {
      return [][Symbol.iterator]
    }

    return SF_ANY
  },
  apply: () => SF_ANY
})
