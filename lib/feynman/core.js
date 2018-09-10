'use strict'

const sentenceCase = require('sentence-case')

/*
 * Actor - attempts actions using its abilities, it knows how to perform
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

const Actor = (abilities = {}, perspective) => {
  if (!perspective) throw new Error('The actor needs a perspective')
  const actor = {
    attemptsTo: async (...actions) => {
      for (const action of actions) {
        if (isTask(action)) {
          await perspective.handlerFor(action)({ actor, ...abilities })
        } else if (isInteraction(action)) {
          throw new Error('TODO')
          // handler({ actor, ...abilities })
        } else {
          // old-style direct handler without declarative objects
          // TODO: remove this when interactions are in place
          await action({ actor, perspective, ...abilities })
        }
      }
      return actor
    },
    asks: async question => {
      const handler = perspective.handlerFor(question)
      return handler({ actor, ...abilities })
    },
    through: newPerspective => Actor(abilities, newPerspective),
    gainsAbilities: extraAbilities => {
      Object.assign(abilities, extraAbilities)
      return actor
    },
    perspective,
    abilities,
  }
  return actor
}

const Description = value => {
  const description = {
    value,
    toString: () => (value ? value.toString() : ''),
    withWords: words =>
      Description(
        (value ? [description.value].concat(words) : words).join(' ')
      ),
    withParams: params =>
      Description(
        description.withWords(Object.values(params).map(value => `'${value}'`))
      ),
    withMethod: name =>
      Description(description.withWords([sentenceCase(name).toLowerCase()])),
    withKey: key =>
      /[A-Z]/.test(key[0])
        ? description.withWords([sentenceCase(key)])
        : description.withMethod(key),
  }
  return description
}
Description.fromId = id => Description(sentenceCase(id))

const Action = type => (id, args, fn) => {
  const description = Description.fromId(id)
  const nested = []
  const action = (..._params) => {
    const params = _params.reduce(
      (params, param, index) => ({ [args[index]]: param, ...params }),
      {}
    )
    const actionDescription = description.withParams(params)

    const action = {
      id,
      type,
      params,
      description: actionDescription.toString(),
    }
    nested.forEach(Nested => {
      const nestedName = Nested.id.split('.').pop()
      action[nestedName] = (...args) => {
        const nested = Nested(...args)
        nested.description = actionDescription
          .withMethod(nestedName)
          .withParams(nested.params)
          .toString()
        nested.params = { ...action.params, ...nested.params }
        return nested
      }
      action[nestedName].id = Nested.id
      action[nestedName].type = Nested.type
      action[nestedName].description = Nested.description
    })
    return action
  }
  action.id = id
  action.type = type
  action.description = description

  if (fn)
    fn((id, _args, fn) => {
      const Nested = Action(type)(
        `${action.id}.${id}`,
        { ...args, ..._args },
        fn
      )
      action[id] = Nested
      nested.push(Nested)
    })

  return action
}

const Perspective = (name, definition) => {
  const handlers = {}
  const perspective = {
    handlerFor: action => {
      // TODO: remove this when tasks can't define direct handlers anymore
      if (!action.hasOwnProperty('id')) return action
      const { id, params = {} } = action
      if (!handlers.hasOwnProperty(id))
        throw new Error(
          `No handler found for task "${
            action.id
          }" in "${name}" perspective.\n\nAlternatives:\n${Object.keys(
            handlers
          ).join('\n')}`
        )
      return handlers[id](params)
    },
    name: name,
  }
  const registerHandler = (task, fn) => {
    handlers[task.id] = fn
  }
  if (definition) definition(registerHandler)
  return perspective
}

const Remember = {
  that: item => ({
    is: value => ({ remember }) => remember(item, value),
    equals: otherItem => ({ recall, remember }) =>
      remember(item, recall(otherItem)),
  }),
}
const Recall = {
  about: item => ({ recall }) => recall(item),
}

const Memory = () => {
  const state = new Map()
  return {
    remember(item, value) {
      state.set(item, value)
    },
    recall(item) {
      if (!state.has(item))
        throw new Error(
          `I do not remember anything about '${item}', sorry.\n\nHere's what I *do* know about:\n${Array.from(
            state.keys()
          )
            .map(name => `- ${name}`)
            .join('\n')}\n\nWhy not ask me about those things instead?`
        )
      return state.get(item)
    },
  }
}

const Interaction = Action('Interaction')
const isInteraction = action => action && action.type === 'Interaction'
const Task = Action('Task')
const isTask = action => action && action.type === 'Task'

module.exports = {
  Actor,
  Interaction,
  Memory,
  Perspective,
  Remember,
  Recall,
  Task,
  Description,
}
