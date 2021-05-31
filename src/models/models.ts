/* eslint-disable @typescript-eslint/no-use-before-define */
export interface Session {
  started: Date | null
  stopped: Date | null

  reminders: Reminder[]
}

export const startSession = (s: Session): Session => ({
  ...s,
  started: new Date(),
  stopped: null,
  reminders: s.reminders?.map((r) => startReminder(r)),
})

export const stopSession = (s: Session): Session => ({
  ...s,
  stopped: new Date(),
})

export const addReminder = (s: Session, r: Reminder): Session => ({
  ...s,
  reminders: [...s.reminders, r],
})

export const updateReminderConfig = (
  s: Session,
  i: number,
  name: string,
  interval: number,
  todos: string[],
  child?: {
    name: string
    interval: number
    todos: string[]
  },
): Session => ({
  ...s,
  reminders: [...s.reminders].map((r, j) => {
    if (i !== j) {
      return r
    }

    let c: Reminder | null
    if (!r.child && child) {
      // there was no child, now there is
      c = {
        ...child,
        completed: 0,
        child: null,
        nextDue: null,
        todos: child.todos.map((t) => ({ name: t, complete: false })),
      }
    } else if (r.child && child) {
      // there was a child, it has been updated
      c = {
        ...r.child,
        ...child,
        todos: child.todos.map((t) => ({ name: t, complete: false })),
      }
    } else {
      // there was a child, now there isn't
      c = null
    }

    return {
      ...r,
      name,
      interval,
      todos: todos.map((t) => ({ name: t, complete: false })),
      child: c,
    }
  }),
})

export const removeReminder = (s: Session, r: Reminder): Session => ({
  ...s,
  reminders: [...s.reminders].filter((r2) => r !== r2),
})

export interface Reminder {
  name: string
  interval: number
  child: Reminder | null
  todos: Todo[]

  completed: number
  nextDue: Date | null
}

export const startReminder = (r: Reminder): Reminder => ({
  ...r,
  completed: 0,
  todos: r.todos?.map((t) => ({
    ...t,
    complete: false,
  })),
  nextDue: new Date(new Date().getTime() + r.interval * 60000),
  child: r.child ? startReminder(r.child) : null,
})

export const completeIteration = (r: Reminder): Reminder => ({
  ...r,
  completed: r.completed + 1,
  todos: r.todos?.map((t) => ({
    ...t,
    complete: false,
  })),
  nextDue: new Date(new Date().getTime() + r.interval * 60000),
  child: r.child ? renewReminder(r.child) : null,
})

export const renewReminder = (r: Reminder): Reminder => ({
  ...r,
  todos: r.todos?.map((t) => ({
    ...t,
    complete: false,
  })),
  nextDue: new Date(new Date().getTime() + r.interval * 60000),
})

export const isReminderStartable = (r: Reminder): boolean =>
  r.name &&
  r.interval &&
  r.todos?.length &&
  !r.todos.find((t) => !t.name) &&
  (!r.child || isReminderStartable(r.child))

export const isReminderComplete = (s: Session, ri: number): boolean =>
  !s.reminders[ri].todos.some((t) => !t.complete)

export const isChildReminderComplete = (s: Session, ri: number): boolean =>
  !s.reminders[ri].child?.todos.some((t) => !t.complete)

export const completeTodo = (s: Session, ri: number, tn: string): Session => {
  const ns = updateTodoComplete(s, ri, tn, true)
  if (isReminderComplete(ns, ri)) {
    return {
      ...s,
      reminders: [...s.reminders].map((r, i) => {
        if (ri !== i) {
          return r
        }
        return completeIteration(r)
      }),
    }
  }
  return ns
}

export const uncompleteTodo = (s: Session, ri: number, tn: string): Session =>
  updateTodoComplete(s, ri, tn, false)

const updateTodoComplete = (
  s: Session,
  ri: number,
  tn: string,
  complete: boolean,
): Session => ({
  ...s,
  reminders: [...s.reminders].map((r, i) => {
    if (i !== ri) {
      return r
    }
    return {
      ...r,
      todos: r.todos.map((t) => {
        if (t.name !== tn) {
          return t
        }
        return {
          ...t,
          complete,
        }
      }),
    }
  }),
})

export const completeChildTodo = (
  s: Session,
  ri: number,
  ctn: string,
): Session => {
  const ns = updateChildTodoComplete(s, ri, ctn, true)
  if (isChildReminderComplete(ns, ri)) {
    return {
      ...s,
      reminders: [...s.reminders].map((r, i) => {
        if (ri !== i) {
          return r
        }
        return {
          ...r,
          child: !r.child ? null : completeIteration(r.child),
        }
      }),
    }
  }
  return ns
}

export const uncompleteChildTodo = (
  s: Session,
  ri: number,
  ctn: string,
): Session => updateChildTodoComplete(s, ri, ctn, false)

const updateChildTodoComplete = (
  s: Session,
  ri: number,
  ctn: string,
  complete: boolean,
): Session => ({
  ...s,
  reminders: [...s.reminders].map((r, i) => {
    if (i !== ri) {
      return r
    }
    return {
      ...r,
      child: !r.child
        ? null
        : {
            ...r.child,
            todos: r.child.todos.map((t) => {
              if (t.name !== ctn) {
                return t
              }
              return {
                ...t,
                complete,
              }
            }),
          },
    }
  }),
})

export interface Todo {
  name: string
  complete: boolean
}
