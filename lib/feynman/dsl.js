'use strict'

const sentenceCase = require('sentence-case')
const { Actor, Perspective, Task } = require('./core')

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

const tasks = (definitions, namespace = '', createTask = Task) =>
  new Proxy(definitions, {
    get: (definitions, taskName) => {
      if (!definitions.hasOwnProperty(taskName))
        throw new Error(
          `The task ${taskName} is not defined in: ${Object.keys(
            definitions
          ).join(', ')}`
        )
      if (!Array.isArray(definitions[taskName]))
        return tasks(definitions[taskName], `${taskName}.`)
      const taskId = `${namespace}${taskName}`
      const description = sentenceCase(taskId)
      if (definitions[taskName].every(entry => typeof entry === 'string'))
        return createTask(taskId, description, definitions[taskName])
      const nestedTaskDefinition = definitions[taskName].pop()
      return createTask(
        taskId,
        description,
        definitions[taskName],
        createNestedTask =>
          tasks(nestedTaskDefinition, taskId, createNestedTask)
      )
    },
  })

module.exports = {
  actor,
  perspective,
  reset,
  tasks,
}
