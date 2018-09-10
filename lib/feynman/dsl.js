'use strict'

const { Actor, Perspective, Description, Id } = require('./core')

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
  handler.withParams = () => handler
  return handler
}

const Definition = (
  definition,
  params = {},
  description = Description(),
  id = Id()
) =>
  Object.entries(definition).reduce(
    (children, [methodName, value]) =>
      Object.assign(children, {
        [methodName]: Node(
          value,
          params,
          description.withKey(methodName),
          id.withKey(methodName)
        ),
      }),
    {}
  )

const Node = (value, params, description, id) => {
  if (value.isAction)
    return value
      .withDescription(description)
      .withId(id)
      .withParams(params)
  if (typeof value === 'function')
    return FactoryMethod(value, params, description, id)
  return Definition(value, params, description, id)
}

const FactoryMethod = (fn, params, description, id) => {
  const factoryMethod = (...args) =>
    Node(fn(...args), params, description.withParams(args), id)
  factoryMethod.id = id.toString()
  if (typeof fn() === 'object') Object.assign(factoryMethod, factoryMethod())
  return factoryMethod
}

const Task = (
  params = {},
  definition,
  description = Description(),
  id = Id()
) => {
  const task = ({ actor, perspective }) =>
    actor.attemptsTo(perspective.handlerFor(task))
  return Object.assign(
    task,
    {
      description,
      id,
      params,
      isAction: true,
      withDescription: newDescription =>
        Task(params, definition, newDescription, id),
      withId: newId => Task(params, definition, description, newId),
      withParams: newParams =>
        Task({ ...params, ...newParams }, definition, description, id),
    },
    Definition(definition, params, description, id)
  )
}

const MakeTask = (
  paramName,
  definition = {},
  params = {},
  description = Description(),
  id = Id()
) =>
  Object.assign(
    paramValue =>
      Task(
        { [paramName]: paramValue, ...params },
        definition,
        description.withParams([paramValue]),
        id
      ),
    {
      id,
      description,
      isAction: true,
      withDescription: newDescription =>
        MakeTask(paramName, definition, params, newDescription, id),
      withId: newId =>
        MakeTask(paramName, definition, params, description, newId),
      withParams: newParams =>
        MakeTask(
          paramName,
          definition,
          { ...params, ...newParams },
          description,
          id
        ),
    },
    Definition(definition, params, description, id)
  )

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  tasks: raw => Definition(raw),
  interactions: raw => Definition(raw),
  task: (paramName, subTasks) => MakeTask(paramName, subTasks),
  action: Handler,
}
