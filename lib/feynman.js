'use strict'

/*
 * Actor - attempts actions using its abilities, it knows how to perfom
 *         actions in its context
 * Ability - dependencies that the interaction needs to do its work
 *           example: browser, the domain api
 *           options: capability, tool, faculty, dependency
 * Perspective - a group of Interactions that use a particular set of Abilities
 * Action - is a general term for task or interaction
 * Task - tasks are composed of tasks or interactions
 * Interaction - directly uses abilities to do something to the app
 */

/*
 * Annoyances
 *
 * - there's two if statements
 */

const Actor = (perspective, abilities) => {
  const actor = {
    attemptsTo: async (...actions) => {
      for (const action of actions) {
        const handler = perspective.handlerFor(action)
        await handler({ actor, ...abilities })
      }
      return actor
    },
    asks: async question => {
      const handler = perspective.handlerFor(question)
      return handler({ actor, ...abilities })
    },
  }
  return actor
}

const Task = (id, description, args, fn) => {
  const nestedTasks = []
  const task = (..._params) => {
    const params = _params.reduce(
      (params, param, index) => ({ [args[index]]: param, ...params }),
      {}
    )
    const action = {
      id,
      params,
    }
    nestedTasks.forEach(NestedTask => {
      const nestedTaskName = NestedTask.id.split('.').pop()
      action[nestedTaskName] = (...args) => {
        const nestedAction = NestedTask(...args)
        nestedAction.params = { ...action.params, ...nestedAction.params }
        return nestedAction
      }
      action[nestedTaskName].id = NestedTask.id
      action[nestedTaskName].description = NestedTask.description
    })
    return action
  }
  task.id = id
  task.description = description

  if (fn)
    fn((id, description, _args, fn) => {
      const NestedTask = Task(
        `${task.id}.${id}`,
        `${task.description} ${description}`,
        { ...args, ..._args },
        fn
      )
      task[id] = NestedTask
      nestedTasks.push(NestedTask)
    })

  return task
}

const Perspective = (perspectiveName, definition) => {
  const perspective = {
    handlerFor: action => {
      if (!action.hasOwnProperty('id')) return action
      const { id, params = {} } = action
      if (!(id in perspective))
        throw new Error(
          `No handler found for task "${
            action.id
          }" in "${perspectiveName}" perspective`
        )
      return perspective[id](params)
    },
  }
  const handle = (action, fn) => {
    perspective[action.id] = fn
  }
  if (definition) definition(handle)
  return perspective
}

const Remember = Task('Remember', 'Remember', ['item'], Task =>
  Task('is', 'is', ['value'])
)
const About = Task('Memory.about', 'Memory about', ['item'])

const Memory = {
  abilities() {
    const state = new Map()
    return {
      remember: (item, value) => state.set(item, value),
      recall: item => {
        if (!state.has(item))
          throw new Error(`I do not remember anything about '${item}', sorry`)
        return state.get(item)
      }
    }
  },
  about: About,
  addToPerspective(handle) {
    handle(Remember.is, ({ item, value }) => ({ remember }) =>
      remember(item, value)
    )
    handle(Memory.about, ({ item }) => ({ recall }) => recall(item))
  },
}

module.exports = {
  Actor,
  Memory,
  Perspective,
  Remember,
  Task,
}
