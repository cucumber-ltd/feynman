'use strict'

const { Actor, Perspective, Description, Id } = require('./core')

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

const Interaction = (fn, description = Description()) => {
  if (typeof fn !== 'function') throw new Error('An action must be a function')
  const handler = (...args) => fn(...args)
  return Object.assign(handler, {
    description,
    withContext: ({ description }) => Interaction(fn, description),
  })
}

const Task = (definition, context) => {
  const task = ({ actor, perspective }) =>
    actor.attemptsTo(perspective.handlerFor(task))
  return Object.assign(
    task,
    {
      withContext: context => Task(definition, context),
    },
    context,
    Definition(definition, context)
  )
}

const Context = () => ({
  params: {},
  description: Description(),
  id: Id(),
})

const Definition = (definition, { description, id, params } = Context()) =>
  Object.entries(definition).reduce(
    (result, [property, value]) => ({
      ...result,
      [property]: Node(value, {
        params,
        description: description.withKey(property),
        id: id.withKey(property),
      }),
    }),
    {}
  )

const Node = (value, context) => {
  if (value.withContext) return value.withContext(context)
  if (typeof value === 'function') return FactoryMethod(value, context)
  return Definition(value, context)
}

const FactoryMethod = (fn, { params, description, id }) => (...args) =>
  Node(fn(...args), {
    params,
    description: description.withParams(args),
    id,
  })

const MakeTask = (paramName, definition = {}, context = Context()) => {
  const { params, description, id } = context
  const makeTask = paramValue =>
    Task(definition, {
      params: { [paramName]: paramValue, ...params },
      description: description.withParams([paramValue]),
      id,
    })
  return Object.assign(
    makeTask,
    {
      withContext: context => MakeTask(paramName, definition, context),
    },
    context,
    Definition(definition, context)
  )
}

module.exports = {
  abilities,
  actor,
  perspective,
  reset,
  tasks: raw => Definition(raw),
  interactions: raw => Definition(raw),
  task: (paramName, subTasks) => MakeTask(paramName, subTasks),
  action: Interaction,
}
