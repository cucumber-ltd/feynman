'use strict'

const { Actor, Perspective, Interaction } = require('./core')

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

const context = {
  actors: {},
  perspectives: {},
  abilities: {},
}

const reset = () => {
  context.actors = {}
  context.abilities = {}
  for (const key of Object.keys(abilities)) {
    delete abilities[key]
  }
}

class Handler {
  constructor(fn) {
    this.fn = fn
  }
}

const interactions = getDefinition => {
  const handle = fn => new Handler(fn)

  const definition = getDefinition(handle)
  const define = (definition, _Interaction = Interaction) => {
    return Object.entries(definition).map(([key, innerDefinitionOrFn]) => {
      const innerDefinitionOrHandler =
        typeof innerDefinitionOrFn === 'function'
          ? innerDefinitionOrFn()
          : innerDefinitionOrFn
      const innerDefinition =
        innerDefinitionOrHandler instanceof Handler
          ? () => {}
          : innerDefinitionOrHandler
      return _Interaction(key, [], SubTask => {
        if (innerDefinition) define(innerDefinition, SubTask)
      })
    })
  }

  const interactions = define(definition).reduce(
    (interactions, interaction) => ({
      ...interactions,
      [interaction.id]: interaction,
    }),
    {}
  )
  return interactions
}

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  interactions,
}
