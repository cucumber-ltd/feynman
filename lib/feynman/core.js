'use strict'

const sentenceCase = require('sentence-case')

/*
 * Actor - attempts actions using its abilities, it knows how to perform
 *         actions in its context
 * Ability - dependencies that the interaction needs to do its work
 *           example: browser, the domain api
 *           options: capability, tool, faculty, dependency
 * Perspective - a group of Interactions that use a particular set of Abilities
 * Action - is a general term for task or interaction
 * Task - tasks are composed of tasks or interactions
 * Interaction - directly uses abilities to do something to the app
 */

/*
 * Annoyances
 *
 * - there's two if statements
 */

let currentActor

const Actor = (abilities = {}, perspective) => {
  if (!perspective) throw new Error('The actor needs a perspective')
  const actor = {
    attemptsTo: async (...actions) => {
      for (const action of actions) {
        await action({ actor, perspective, ...abilities })
      }
      currentActor = actor
      return actor
    },
    // TODO: make private?
    asks: questionHandler => questionHandler({ actor, ...abilities }),
    asksFor: (...questions) => ({
      andVerify: async fn => {
        const answers = await Promise.all(
          questions.map(question =>
            question({ actor, perspective, ...abilities })
          )
        )

        const unsubscribeAll = async () =>
          Promise.all(
            answers.map(async answer => {
              if (
                answer instanceof Inquisitor &&
                typeof answer.unsubscribe === 'function'
              ) {
                await answer.unsubscribe()
              }
            })
          )

        await new Promise(async (resolve, reject) => {
          let lastErr
          const timeout = setTimeout(async () => {
            await unsubscribeAll()
            reject(lastErr || new Error('Timeout error'))
          }, 500)
          const checkAnswers = async answers => {
            if (answers.some(answer => answer instanceof Inquisitor)) return

            await fn(...answers)
            clearTimeout(timeout)
            await unsubscribeAll()
            resolve()
          }
          const updatedAnswers = []
          for (const i in answers) {
            const answer = answers[i]
            if (!(answer instanceof Inquisitor)) {
              updatedAnswers[i] = answer
              continue
            }
            await answer.subscribe(async answer => {
              try {
                updatedAnswers[i] = answer
                await checkAnswers(updatedAnswers)
              } catch (err) {
                lastErr = err
              }
            })
            updatedAnswers[i] = answer
          }
          await checkAnswers(updatedAnswers)
        })

        // TODO: TDD this line:
        // currentActor = actor
        return actor
      },
    }),
    through: newPerspective => Actor(abilities, newPerspective),
    gainsAbilities: extraAbilities => {
      Object.assign(abilities, extraAbilities)
      return actor
    },
    perspective,
    abilities,
  }
  actor.assertsThat = actor.attemptsTo
  return actor
}

const Description = value => {
  const description = {
    value,
    toString: () => (value ? value.toString() : ''),
    withWords: words =>
      Description(
        (value ? [description.value].concat(words) : words).join(' ')
      ),
    withParams: params =>
      Description(
        description.withWords(Object.values(params).map(value => `'${value}'`))
      ),
    withMethod: name =>
      Description(description.withWords([sentenceCase(name).toLowerCase()])),
    withKey: key =>
      /[A-Z]/.test(key[0])
        ? description.withWords([sentenceCase(key)])
        : description.withMethod(key),
  }
  return description
}
Description.fromId = id => Description(sentenceCase(id))

const Id = value => ({
  value,
  toString: () => (value ? value.toString() : ''),
  withKey: key => Id(value ? `${value}.${key}` : key),
})

const Perspective = (name, definition) => {
  const handlers = {}
  const perspective = {
    name,
    handlerFor: ({ id, params = {} }) => {
      if (!handlers.hasOwnProperty(id))
        throw new Error(
          `No handler found for task/assertion '${id}' in '${name}' perspective.\n\n${
            Object.keys(handlers).length > 0
              ? `Alternatives:\n${Object.keys(handlers)
                  .map(value => `* ${value}`)
                  .join('\n')}`
              : 'No handlers registered.'
          }`
        )
      return handlers[id](params)
    },
  }
  const registerHandler = (task, fn) => {
    const callerLine = new Error().stack.split('\n')[2].trim()
    if (!task)
      throw new Error(
        `Attempt to register null or undefined task: ${callerLine}`
      )
    const { id } = task
    if (!id) {
      throw new Error(`Can't register a task without an ID: ${callerLine}`)
    }
    handlers[id] = fn
  }
  if (definition) definition(registerHandler)
  return perspective
}

const NoLog = () => {}

const Task = (id, params = {}, description = Description()) =>
  Object.assign(
    ({ actor, perspective, log = NoLog }) => {
      log(description.toString())
      return actor.attemptsTo(perspective.handlerFor({ id, params }))
    },
    { id }
  )

const Question = (id, params = {}, description = Description()) =>
  Object.assign(
    ({ actor, perspective, log = NoLog }) => {
      log(description.toString())
      return actor.asks(perspective.handlerFor({ id, params }))
    },
    { id }
  )

const Interaction = (fn, description) => ({
  actor,
  log = NoLog,
  ...abilities
}) => {
  log(description.toString())
  return fn({ actor, log, ...abilities })
}

class Inquisitor {
  constructor(fn) {
    this.fn = fn
  }

  async subscribe(notify) {
    this._unsubscribe = await this.fn(notify)
  }

  async unsubscribe() {
    await this._unsubscribe()
  }
}

module.exports = {
  Actor,
  Assertion: Task,
  currentActor: () => currentActor,
  Description,
  Id,
  Interaction,
  Inquisitor,
  Question,
  Perspective,
  Task,
}
