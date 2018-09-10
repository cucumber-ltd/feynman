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
  handler.withId = () => handler
  return handler
}

const Definition = (definition, description = Description(), id = Id()) =>
  Object.entries(definition).reduce((children, [methodName, value]) => {
    return {
      ...children,
      [methodName]: Node(
        value,
        description.withKey(methodName),
        id.withKey(methodName)
      ),
    }
  }, {})

const Node = (value, description, id) => {
  if (value.isAction) return value.withDescription(description).withId(id)
  if (typeof value === 'function') return FactoryMethod(value, description, id)
  return Definition(value, description, id)
}

const FactoryMethod = (fn, description, id) => {
  const factoryMethod = (...args) =>
    Node(fn(...args), description.withParams(args), id)
  factoryMethod.id = id.toString()
  return factoryMethod
}

const Task = (params = {}, description = Description(), id = Id()) => {
  const task = ({ actor, perspective }) =>
    perspective.handlerFor(task)({ actor })
  task.isAction = true
  task.description = description
  task.id = id.toString()
  task.params = params
  task.withDescription = newDescription => Task(params, newDescription, id)
  task.withId = newId => Task(params, description, newId)
  return task
}

const Id = value => {
  const id = {
    value,
    toString: () => (value ? value.toString() : ''),
    withKey: key => Id(value ? `${value}.${key}` : key),
  }
  return id
}

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  tasks: Definition,
  interactions: Definition,
  task: Task,
  action: Handler,
}
