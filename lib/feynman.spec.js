'use strict'

const assert = require('assert')
const sinon = require('sinon')
const feynman = require('./feynman')

/*
 * Actor - attempts an interaction using its abilities, it knows how to perfom
 *         actions in its context
 * Ability - dependencies that the interaction needs to do its work 
 *           example: browser, the domain api
 *           options: capability, tool, faculty, dependency
 * Perspective - a group of Interactions that use a particular set of Abilities
 * Action - is a general term for task or interaction
 * Task - tasks are composed of tasks or interactions
 * Interaction - directly uses abilities to do something to the app
 */

const Actor = (perspective, abilities) => {
  const actor = {
    attemptsTo: (...actions) => {
      for (const action of actions) {
        action({ actor, perspective, ...abilities })
      }
    },
  }
  return actor
}

let nextTaskId = 0
const TaskId = (fn) => {
  const taskId = nextTaskId++
  const result = fn(taskId)
  result.toString = () => taskId
  return result
}

const dependsOnPerspective = () =>
  TaskId(taskId => ({ actor, perspective }) =>
    actor.attemptsTo(perspective[taskId]))

const dependsOnPerspectiveWithArgs = () =>
  TaskId(taskId => (...args) => ({ actor, perspective }) =>
    actor.attemptsTo(perspective[taskId](...args)))

describe('feynman', () => {
  // Web interactions
  const ClickOn = {
    button: ({ name }) => ({ browser }) => browser.clickOn(name),
  }

  const FillIn = {
    field: ({ name }) => ({
      with: text => ({ browser }) => browser.fillIn(name, text),
    }),
  }

  // Tasks
  const Book = {
    aRoom: dependsOnPerspective(),
    aFlight: {
      to: dependsOnPerspectiveWithArgs(),
    },
    aHolidayTo: destination => ({ actor }) =>
      actor.attemptsTo(Book.aRoom, Book.aFlight.to(destination)),
  }

  const DomainActions = {
    [Book.aRoom]: ({ state, domain }) =>
      domain.bookRoom({ email: state.get('email') }),
    [Book.aFlight.to]: destination => ({ domain }) =>
      domain.bookFlight(destination),
  }

  const WebAppActions = {
    [Book.aRoom]: ({ actor, state }) => {
      actor.attemptsTo(
        FillIn.field({ name: 'Email' }).with(state.get('email')),
        ClickOn.button({ name: 'Book Room' })
      )
    },
  }

  it('allows actors to have different perspectives', () => {
    const domain = {
      bookRoom: sinon.spy(),
    }
    const browser = {
      clickOn: sinon.spy(),
      fillIn: sinon.spy(),
    }
    const state = new Map([['email', 'joe@example.com']])
    const domainJoe = Actor(DomainActions, { domain, state })
    const webAppJoe = Actor(WebAppActions, {
      browser,
      state,
    })
    domainJoe.attemptsTo(Book.aRoom)
    webAppJoe.attemptsTo(Book.aRoom)
    sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
    sinon.assert.calledWith(browser.fillIn, 'Email', 'joe@example.com')
    sinon.assert.calledWith(browser.clickOn, 'Book Room')
  })

  it('has higher order tasks', () => {
    const domain = {
      bookRoom: sinon.spy(),
      bookFlight: sinon.spy(),
    }
    const state = new Map([['email', 'joe@example.com']])
    const joe = Actor(DomainActions, { domain, state })
    joe.attemptsTo(Book.aHolidayTo('Barbados'))
    sinon.assert.calledWith(domain.bookFlight, 'Barbados')
    sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
  })

  it(
    "gives a decent error when you attempt to do a task that doesn't have a corresponding action"
  )

  it('lets actions modify the state')

  describe('Actor', () => {
    it('merges in new abilities')
    it('merges in new state')
  })
})
