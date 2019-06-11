'use strict'

const { Description, Id, Task, Question, Interaction } = require('./core')

const DefineInteraction = (fn, description = Description()) => {
  if (typeof fn !== 'function') throw new Error('An action must be a function')
  return Object.assign(Interaction(fn, description), {
    description,
    withContext: ({ description }) => DefineInteraction(fn, description),
  })
}

const DefineTask = (definition, context) =>
  Object.assign(
    Task(context.id, context.params, context.description),
    {
      withContext: context => DefineTask(definition, context),
    },
    context,
    Definition(definition, context)
  )

const DefineQuestion = (definition, context) =>
  Object.assign(
    Question(context.id, context.params, context.description),
    {
      withContext: context => DefineQuestion(definition, context),
    },
    context,
    Definition(definition, context)
  )

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
    DefineTask(definition, {
      params: { [paramName]: paramValue, ...params },
      description:
        typeof paramName === 'undefined'
          ? description
          : description.withParams([paramValue]),
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

const MakeQuestion = (paramName, definition = {}, context = Context()) => {
  const { params, description, id } = context
  const makeTask = paramValue =>
    DefineQuestion(definition, {
      params: { [paramName]: paramValue, ...params },
      description:
        typeof paramName === 'undefined'
          ? description
          : description.withParams([paramValue]),
      id,
    })
  return Object.assign(
    makeTask,
    {
      withContext: context => MakeQuestion(paramName, definition, context),
    },
    context,
    Definition(definition, context)
  )
}

const MakeAssertion = MakeTask

module.exports = {
  tasks: raw => Definition(raw),
  interactions: raw => Definition(raw),
  task: (paramName, subTasks) => MakeTask(paramName, subTasks),
  assertions: raw => Definition(raw),
  assertion: (paramName, subAssertions) =>
    MakeAssertion(paramName, subAssertions),
  action: DefineInteraction,
  question: (paramName, subQuestions) => MakeQuestion(paramName, subQuestions),
  questions: raw => Definition(raw),
}
