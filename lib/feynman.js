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
    },
  }
  return actor
}

let n = 0
const Task = () => {
  const id = n++
  const task = (...args) => ({ id, args })
  task.id = id
  task.args = []
  return task
}

const Perspective = definition => {
  const perspective = {
    handlerFor: action => {
      if (!action.hasOwnProperty('id'))
        return action
      const { id, args } = action
      const handler = args ? perspective[id](...args) : perspective[id]
      if (!handler) throw new Error(`No handler for: ${id} (${action})`)
      return handler
    }
  }
  const handle = (action, fn) => {
    perspective[action.id] = fn
  }
  if (definition) definition(handle)
  return perspective
}

module.exports = {
  Perspective, Task, Actor
}
