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
) => {
  return ProvideHintsToUser(
    parentDescription,
    Object.entries(definition).reduce((children, [key, value]) => {
      const description = parentDescription.withKey(key)
      return {
        ...children,
        [key]: describeNode(value, description),
      }
    }, {})
  )
}

const interactions = define => {
  return describeHandlersInObject(define(Handler))
}

const ProvideHintsToUser = (parentDescription, interactions) =>
  new Proxy(interactions, {
    get: (target, prop) => {
      if (target.hasOwnProperty(prop)) return target[prop]
      if (Object.keys(target).length === 0) {
        throw new Error(`You haven't defined any interactions yet.

To define an interaction, do it something like this:

const { ${prop} } = interactions(handle => ({
  ${prop}: handle(({ // TODO: abilities }) => { // TODO: interact with your app })
}))`)
      }
      if (parentDescription.value) {
        throw new Error(
          `The factory method '${prop}' is not defined in '${parentDescription}'.

Here's the ones that are already defined:\n
${Object.keys(target)
            .map(value => `* ${value}`)
            .join('\n')}`
        )
      }
      throw new Error(
        `The interaction '${prop}' is not defined.

Here's the ones that are already defined:\n
${Object.keys(target)
          .map(value => `* ${value}`)
          .join('\n')}`
      )
    },
  })

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  interactions,
}
