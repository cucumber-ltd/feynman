'use strict'

const { Actor, Perspective, Description } = require('./core')

const context = {
  actors: {},
  perspectives: {},
  abilities: {},
}

const abilities = newAbilities => {
  context.abilities = { ...context.abilities, ...newAbilities }
  Object.assign(abilities, context.abilities)
  return context.abilities
}

const actor = async (name, callbacks = {}) => {
  if (context.actors[name]) return context.actors[name]
  const newActor = (context.actors[name] = Actor(
    { ...abilities },
    context.perspectives.default
  ))
  if ('afterCreate' in callbacks) await callbacks.afterCreate(newActor)
  return newActor
}

const perspective = (name, definition) => {
  if (context.perspectives[name]) return context.perspectives[name]
  return (context.perspectives[name] = Perspective(name, definition))
}
perspective.default = name => (context.perspectives.default = perspective(name))
perspective('default')

const reset = () => {
  context.actors = {}
  context.abilities = {}
  for (const key of Object.keys(abilities)) {
    delete abilities[key]
  }
}

const Handler = (fn, description = Description()) => {
  if (typeof fn !== 'function') throw new Error('A handler must be a function')
  const handler = (...args) => fn(...args)
  handler.isHandler = true
  handler.description = description
  handler.withDescription = newDescription => Handler(fn, newDescription)
  return handler
}

const ParameterMethod = (fn, description) => (...args) =>
  describeNode(fn(...args), description.withParams(args))

const describeNode = (value, description) => {
  if (value.isHandler) return value.withDescription(description)
  if (typeof value === 'function') return ParameterMethod(value, description)
  return describeHandlersInObject(value, description)
}

const describeHandlersInObject = (
  definition,
  parentDescription = Description()
) =>
  Object.entries(definition).reduce((children, [key, value]) => {
    const description = parentDescription.withKey(key)
    return {
      ...children,
      [key]: describeNode(value, description),
    }
  }, {})

const interactions = define => {
  return describeHandlersInObject(define(Handler))
}

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  interactions,
}
