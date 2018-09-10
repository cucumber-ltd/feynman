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

const reset = ({ full } = {}) => {
  context.actors = {}
  context.abilities = {}
  for (const key of Object.keys(abilities)) {
    delete abilities[key]
  }
  if (full) {
    context.perspectives = {}
    perspective('default')
  }
}

const Handler = (fn, description = Description()) => {
  if (typeof fn !== 'function') throw new Error('A handler must be a function')
  const handler = (...args) => fn(...args)
  handler.isAction = true
  handler.description = description
  handler.withDescription = newDescription => Handler(fn, newDescription)
  return handler
}

const interactions = define =>
  InteractionsDefinition(define(Handler), Description())

const InteractionsDefinition = (definition, description) =>
  Object.entries(definition).reduce((children, [methodName, value]) => {
    return {
      ...children,
      [methodName]: Node(value, description.withKey(methodName)),
    }
  }, {})

const Node = (value, description) => {
  if (value.isAction) return value.withDescription(description)
  if (typeof value === 'function') return FactoryMethod(value, description)
  return InteractionsDefinition(value, description)
}

const FactoryMethod = (fn, description) => (...args) =>
  Node(fn(...args), description.withParams(args))

const TasksDefinition = (definition, description) =>
  Object.entries(definition).reduce((children, [methodName, value]) => {
    return {
      ...children,
      [methodName]: Node(value, description.withKey(methodName)),
    }
  }, {})

const Task = (description = Description()) => {
  const id = description.toString()
  const task = ({ actor, perspective }) =>
    perspective.handlerFor({ id })({ actor })
  task.isAction = true
  task.description = description
  task.id = id
  task.withDescription = newDescription => Task(newDescription)
  return task
}

const tasks = define => TasksDefinition(define(Task), Description())

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  interactions,
  tasks,
}
