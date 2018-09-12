'use strict'

const { Actor, Perspective } = require('./core')

const state = {
  actors: {},
  perspectives: {},
  abilities: {},
}

const abilities = newAbilities => {
  state.abilities = { ...state.abilities, ...newAbilities }
  Object.assign(abilities, state.abilities)
  return state.abilities
}

const actor = async (name, callbacks = {}) => {
  if (state.actors[name]) return state.actors[name]
  const newActor = (state.actors[name] = Actor(
    { ...abilities },
    state.perspectives.default
  ))
  if ('afterCreate' in callbacks) await callbacks.afterCreate(newActor)
  return newActor
}

const perspective = (name, definition) => {
  if (state.perspectives[name]) return state.perspectives[name]
  return (state.perspectives[name] = Perspective(name, definition))
}
perspective.default = name => (state.perspectives.default = perspective(name))
perspective('default')

const reset = ({ full } = {}) => {
  state.actors = {}
  state.abilities = {}
  for (const key of Object.keys(abilities)) {
    delete abilities[key]
  }
  if (full) {
    state.perspectives = {}
    perspective('default')
  }
}

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
}
