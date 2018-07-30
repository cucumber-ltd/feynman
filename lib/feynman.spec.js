'use strict'

const sinon = require('sinon')
const feynman = require('./feynman')

/*
 * Actor - attempts actions using its abilities, it knows how to perfom
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

    withPerspective: newPerspective => Actor(newPerspective, abilities),
  }
  return actor
}

let nextTaskId = 0
const TaskId = fn => {
  const taskId = nextTaskId++
  const result = fn(taskId)
  result.toString = () => taskId
  return result
}

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
    aRoom: TaskId(taskId => ({ actor, perspective }) =>
      actor.attemptsTo(perspective[taskId])
    ),
    aFlight: {
      to: TaskId(taskId => (...args) => ({ actor, perspective }) =>
        actor.attemptsTo(perspective[taskId](...args))
      ),
    },
    aHolidayTo: destination => ({ actor }) =>
      actor.attemptsTo(Book.aRoom, Book.aFlight.to(destination)),
  }

  const DomainPerspective = {
    [Book.aRoom]: ({ state, domain }) =>
      domain.bookRoom({ email: state.get('email') }),
    [Book.aFlight.to]: destination => ({ domain }) =>
      domain.bookFlight(destination),
  }

  const WebAppPerspective = {
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
    const domainJoe = Actor(DomainPerspective, { domain, state })
    const webAppJoe = Actor(WebAppPerspective, {
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
    const joe = Actor(DomainPerspective, { domain, state })
    joe.attemptsTo(Book.aHolidayTo('Barbados'))
    sinon.assert.calledWith(domain.bookFlight, 'Barbados')
    sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
  })

  it(
    "gives a decent error when you attempt to do a task that doesn't have a corresponding action"
  )

  it('lets actions modify the state')

  it('waits for async actions to complete')

  describe('Actor', () => {
    it('changes perspective', () => {
      const domain = {
        bookRoom: sinon.spy(),
      }
      const browser = {
        clickOn: sinon.spy(),
        fillIn: sinon.spy(),
      }
      const state = new Map([['email', 'joe@example.com']])
      let joe = Actor(DomainPerspective, { domain, browser, state })
      joe.attemptsTo(Book.aRoom)
      sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
      joe = joe.withPerspective(WebAppPerspective)
      joe.attemptsTo(Book.aRoom)
      sinon.assert.calledWith(browser.fillIn, 'Email', 'joe@example.com')
      sinon.assert.calledWith(browser.clickOn, 'Book Room')
    })

    it('merges in new abilities')
    it('merges in new state')
  })
})
