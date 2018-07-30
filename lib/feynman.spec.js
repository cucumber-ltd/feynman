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

/*
 * Annoyances
 *
 * - having to repeat the name in a string
 * - having to repeat the action as whole
 * - having to declare things twice
 * - there's two if statements
 */

const Actor = (perspective, abilities) => {
  const actor = {
    attemptsTo: (...actions) => {
      for (const action of actions) {
        if (action.hasOwnProperty('id')) {
          const { id } = action
          let handler = perspective[id]
          if (!handler) throw new Error(`No handler for: ${id} (${action})`)
          if (action.args) handler = handler(...action.args)
          handler({ actor, ...abilities })
        } else {
          action({ actor, ...abilities })
        }
      }
    },
  }
  return actor
}

let n = 0
const makeAction = () => {
  const id = n++
  const action = (...args) => ({ id, args })
  action.id = id
  action.args = []
  return action
}

const Perspective = definition => {
  const result = {}
  const handle = (action, fn) => {
    result[action.id] = fn
  }
  definition(handle)
  return result
}

const perspective = describe('feynman', () => {
  context('an action with no parameters', () => {
    it('is attempted by the actor', () => {
      const browser = {
        refresh: sinon.spy(),
      }
      const abilities = { browser }
      const Refresh = { browser: makeAction() }
      const perspective = Perspective(handle => {
        handle(Refresh.browser, () => ({ browser }) => browser.refresh())
      })
      const joe = Actor(perspective, abilities)
      joe.attemptsTo(Refresh.browser)
      sinon.assert.called(browser.refresh)
    })
  })

  context('an action with a single parameter', () => {
    it('is attempted by the actor', () => {
      const browser = {
        clickOn: sinon.spy(),
      }
      const abilities = { browser }
      const ClickOn = { button: makeAction() }

      const perspective = Perspective(handle => {
        handle(ClickOn.button, text => ({ browser }) => browser.clickOn(text))
      })
      const joe = Actor(perspective, abilities)
      joe.attemptsTo(ClickOn.button('Book now'))
      sinon.assert.calledWith(browser.clickOn, 'Book now')
    })
  })

  context('an action with multiple parameters', () => {
    it('is attempted by the actor', () => {
      const browser = {
        fillIn: sinon.spy(),
      }
      const abilities = { browser }
      const FillIn = { label: makeAction(), selector: makeAction() }
      const perspective = Perspective(handle => {
        handle(FillIn.label, ({ name, with: text }) => ({ browser }) =>
          browser.fillIn(name, text)
        )
      })
      const joe = Actor(perspective, abilities)
      joe.attemptsTo(FillIn.label({ name: 'email', with: 'joe@example.com' }))
      sinon.assert.calledWith(browser.fillIn, 'email', 'joe@example.com')
    })
  })

  context('with multiple perspectives', () => {
    const Book = {
      aHoliday: makeAction(),
      aRoom: makeAction(),
      aFlight: makeAction(),
    }

    const SharedPerspective = Perspective(handle => {
      handle(Book.aHoliday, destination => ({ actor }) =>
        actor.attemptsTo(Book.aRoom, Book.aFlight(destination))
      )
    })

    const DomainPerspective = Perspective(handle => {
      handle(Book.aRoom, () => ({ state, domain }) =>
        domain.bookRoom({ email: state.get('email') })
      )
      handle(Book.aFlight, destination => ({ domain }) =>
        domain.bookFlight(destination)
      )
    })

    const WebAppPerspective = Perspective(handle => {
      const FillIn = {
        field: ({ name }) => ({
          with: text => ({ browser }) => browser.fillIn(name, text),
        }),
      }
      const Click = {
        on: text => ({ browser }) => browser.clickOn(text),
      }
      handle(Book.aRoom, () => ({ actor, state }) => {
        actor.attemptsTo(
          FillIn.field({ name: 'Email' }).with(state.get('email')),
          Click.on('Book Room')
        )
      })
    })

    it('allows actors attempt the same action from different perspectives', () => {
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
      const joe = Actor(
        { ...DomainPerspective, ...SharedPerspective },
        { domain, state }
      )
      joe.attemptsTo(Book.aHoliday('Barbados'))
      sinon.assert.calledWith(domain.bookFlight, 'Barbados')
      sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
    })
  })

  it(
    "gives a decent error when you attempt to do a task that doesn't have a corresponding action"
  )

  it('lets actions modify the state')

  it('waits for async actions to complete')

  describe('Actor', () => {
    it('merges in new abilities')
    it('merges in new state')
  })
})
