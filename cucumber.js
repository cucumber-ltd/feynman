"use strict"

const { Actor, Perspective } = require("./lib/feynman")

let context

const actor = (name, callbacks = {}) => {
  if (context.actors[name]) return context.actors[name]
  const result = context.actors[name] = Actor({}, context.perspectives.default)
  if (callbacks.hasOwnProperty('afterCreate'))
    callbacks.afterCreate(result)
  return result
}

const perspective = (name, definition) => {
  if (context.perspectives[name]) return context.perspectives[name]
  return (context.perspectives[name] = Perspective(name, definition))
}
perspective.default = name =>
  context.perspectives.default = perspective(name)

const reset = () => {
  context = {
    actors: {},
    perspectives: {},
    defaultPerspective: Perspective("unknown")
  }
}

reset()

module.exports = {
  actor,
  perspective,
  reset
}
