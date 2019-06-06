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

let currentActor

const Actor = (abilities = {}, perspective) => {
  if (!perspective) throw new Error('The actor needs a perspective')
  const actor = {
    attemptsTo: async (...actions) => {
      for (const action of actions) {
        await action({ actor, perspective, ...abilities })
      }
      currentActor = actor
      return actor
    },
    // TODO: make private?
    asks: questionHandler => questionHandler({ actor, ...abilities }),
    asksFor: question => ({
      andVerify: async fn => {
        await fn(await question({ actor, perspective, ...abilities }))
        // TODO: TDD this line:
        // currentActor = actor
        return actor
      },
    }),
    through: newPerspective => Actor(abilities, newPerspective),
    gainsAbilities: extraAbilities => {
      Object.assign(abilities, extraAbilities)
      return actor
    },
    perspective,
    abilities,
  }
  actor.assertsThat = actor.attemptsTo
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

const Id = value => ({
  value,
  toString: () => (value ? value.toString() : ''),
  withKey: key => Id(value ? `${value}.${key}` : key),
})

const Perspective = (name, definition) => {
  const handlers = {}
  const perspective = {
    name,
    handlerFor: ({ id, params = {} }) => {
      if (!handlers.hasOwnProperty(id))
        throw new Error(
          `No handler found for task/assertion '${id}' in '${name}' perspective.\n\n${
            Object.keys(handlers).length > 0
              ? `Alternatives:\n${Object.keys(handlers)
                  .map(value => `* ${value}`)
                  .join('\n')}`
              : 'No handlers registered.'
          }`
        )
      return handlers[id](params)
    },
  }
  const registerHandler = (task, fn) => {
    const callerLine = new Error().stack.split('\n')[2].trim()
    if (!task)
      throw new Error(
        `Attempt to register null or undefined task: ${callerLine}`
      )
    const { id } = task
    if (!id) {
      throw new Error(`Can't register a task without an ID: ${callerLine}`)
    }
    handlers[id] = fn
  }
  if (definition) definition(registerHandler)
  return perspective
}

const NoLog = () => {}

const Task = (id, params = {}, description = Description()) =>
  Object.assign(
    ({ actor, perspective, log = NoLog }) => {
      log(description.toString())
      return actor.attemptsTo(perspective.handlerFor({ id, params }))
    },
    { id }
  )

const Question = (id, params = {}, description = Description()) =>
  Object.assign(
    ({ actor, perspective, log = NoLog }) => {
      log(description.toString())
      return actor.asks(perspective.handlerFor({ id, params }))
    },
    { id }
  )

const Interaction = (fn, description) => ({
  actor,
  log = NoLog,
  ...abilities
}) => {
  log(description.toString())
  return fn({ actor, log, ...abilities })
}

module.exports = {
  Actor,
  Assertion: Task,
  currentActor: () => currentActor,
  Description,
  Id,
  Interaction,
  Question,
  Perspective,
  Task,
}
