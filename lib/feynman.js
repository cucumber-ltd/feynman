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
        if (action.hasOwnProperty('id')) {
          const { id } = action
          let handler = perspective[id]
          if (!handler) throw new Error(`No handler for: ${id} (${action})`)
          if (action.args) handler = handler(...action.args)
          await handler({ actor, ...abilities })
        } else {
          await action({ actor, ...abilities })
        }
      }
    },
  }
  return actor
}

let n = 0
const makeAction = () => {
  const id = n++
  const action = (...args) => ({ id, args })
  action.id = id
  action.args = []
  return action
}

const Perspective = definition => {
  const result = {}
  const handle = (action, fn) => {
    result[action.id] = fn
  }
  definition(handle)
  return result
}

module.exports = {
  Perspective, makeAction, Actor
}
