'use strict'

const { Actor, Perspective } = require('./core')

const actor = async (name, callbacks = {}) => {
  if (context.actors[name]) return context.actors[name]
  const newActor = (context.actors[name] = Actor(
    {},
    context.perspectives.default
  ))
  if (callbacks.hasOwnProperty('afterCreate'))
    await callbacks.afterCreate(newActor)
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
}

const reset = () => {
  context.actors = {}
}

reset()

module.exports = {
  actor,
  perspective,
  reset,
}
