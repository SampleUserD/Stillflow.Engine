import { FlushableCollection } from "@/stillflow-collection/flushable"

// @stillflow/runtime/list.ts
export interface ListItemController<T> {
  element: Element;
  patch: (item: T) => void;
}

export function reconcile_list<T>(root: Element & { sf_elements?: ListItemController<T>[] }, items: FlushableCollection<T>, createItem: (item: T, index: number) => ListItemController<T>) {
  const { swaps, addes, updates, removes, replaces, clears } = items.flush();

  let controllers = root.sf_elements;

  if (!controllers) {
    controllers = root.sf_elements = [];
  }

  // 1. Полная замена (replaces)
  if (replaces) {
    const fragment = document.createDocumentFragment();
    const size = items.size;
    controllers.length = size;
    for (let i = 0; i < size; i++) {
      const ctrl = createItem(items.at(i), i);
      controllers[i] = ctrl;
      fragment.appendChild(ctrl.element);
    }
    root.replaceChildren(fragment);
    return;
  }

  // 2. Очистка (clears)
  if (clears) {
    root.textContent = String();
    controllers.length = 0;
    return;
  }

  // 3. Добавление в конец (addes)
  if (addes > 0) {
    const fragment = document.createDocumentFragment();
    const oldSize = controllers.length;
    for (let i = 0; i < addes; i++) {
      const ctrl = createItem(items.at(oldSize + i), i);
      controllers.push(ctrl);
      fragment.appendChild(ctrl.element);
    }
    root.appendChild(fragment);
  }

  // 4. Обмен элементов (swaps)
  for (const [i, j] of swaps.entries()) {
    const ctrlI = controllers[i];
    const ctrlJ = controllers[j];
    const nextI = ctrlI.element.nextSibling;
    const nextJ = ctrlJ.element.nextSibling;
    root.insertBefore(ctrlI.element, nextJ);
    root.insertBefore(ctrlJ.element, nextI);
    controllers[i] = ctrlJ;
    controllers[j] = ctrlI;
  }

  // 5. Точечные обновления (updates) — проваливаются на любую глубину вложенных For!
  for (const [id, item] of updates.entries()) {
    controllers[id].patch(item);
  }

  // 6. Удаление и компактификация за O(n) (removes)
  if (removes.size > 0) {
    for (const id of removes) {
      controllers[id].element.remove();
      (controllers as any)[id] = null;
    }
    let write = 0;
    for (let read = 0; read < controllers.length; read++) {
      const ctrl = controllers[read];
      if (ctrl !== null) {
        controllers[write++] = ctrl;
      }
    }
    controllers.length = write;
  }
}
