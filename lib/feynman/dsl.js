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

const interactions = getDefinition => {
  const handle = handler => {
    handler.isHandler = true
    return handler
  }

  const describeNode = (value, description) => {
    if (value.isHandler) {
      value.description = description.toString()
      return value
    }
    if (typeof value === 'function') {
      return (...args) =>
        describeNode(value(...args), description.withParams(args))
    }
    return describeHandlersIn(value, description)
  }

  const definition = getDefinition(handle)
  const describeHandlersIn = (definition, parentDescription) =>
    Object.entries(definition)
      .map(([key, value]) => {
        const description = parentDescription
          ? parentDescription.withMethod(key)
          : Description.fromId(key)
        const child = describeNode(value, description)
        return [key, child]
      })
      .reduce(
        (children, [key, child]) => ({
          ...children,
          [key]: child,
        }),
        {}
      )

  return describeHandlersIn(definition)
}

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  interactions,
}
