'use strict'

const assert = require('assert')
const sinon = require('sinon')
const { Task } = require('./core')
const {
  reset,
  actor,
  perspective,
  abilities,
  interactions,
  tasks,
} = require('./dsl')

describe('feynman DSL', () => {
  beforeEach(() => reset({ full: true }))

  describe('actors', () => {
    it('creates, stores and retrieves actors by name', () => {
      const dave = actor('dave')
      const anotherDave = actor('dave')
      assert.deepEqual(dave, anotherDave)
    })

    it('runs an afterCreate callback when the actor is created', async () => {
      const setupMyActor = sinon.spy()
      const dave = await actor('dave', { afterCreate: setupMyActor })
      await actor('dave', { afterCreate: setupMyActor })
      sinon.assert.calledOnce(setupMyActor)
      sinon.assert.calledWith(setupMyActor, dave)
    })

    it('runs an afterCreate callback when the actor is created', async () => {
      const login = sinon.spy()
      const setupMyActor = () =>
        new Promise(resolve =>
          setTimeout(() => {
            login()
            resolve()
          }, 1)
        )
      await actor('dave', { afterCreate: setupMyActor })
      sinon.assert.calledOnce(login)
    })
  })

  describe('perspectives', () => {
    it('creates and stores perspectives by name', () => {
      const createUser = Task('create user')
      const onePerspective = perspective('web', handle => {
        handle(createUser, () => ({ browser }) => browser.click())
      })
      const anotherPerspective = perspective('web')
      assert.deepEqual(onePerspective, anotherPerspective)
    })

    it('creates actors with the default perspective', async () => {
      const createUser = Task('create user')
      perspective('web', handle => {
        handle(createUser, () => ({ browser }) => browser.click())
      })
      perspective.default('web')
      const browser = { click: sinon.spy() }
      const dave = (await actor('dave')).gainsAbilities({ browser })
      await dave.attemptsTo(createUser)
      sinon.assert.called(browser.click)
    })
  })

  describe('abilities', () => {
    it('sets and retrieves new abilities', () => {
      const xrayVision = 'an ability'
      abilities({ xrayVision })
      assert.equal(abilities().xrayVision, xrayVision)
      assert.equal(abilities.xrayVision, xrayVision)
    })

    it('creates actors with the set of abilities', async () => {
      const xrayVision = { look: sinon.spy() }
      abilities({ xrayVision })
      const SeeThroughWalls = ({ xrayVision }) => xrayVision.look()
      const dave = await actor('dave')
      await dave.attemptsTo(SeeThroughWalls)
      sinon.assert.called(xrayVision.look)
    })

    it('resets the abilities between tests', () => {
      const xrayVision = 'xray-vision'
      const elasticLimbs = 'elastic-limbs'
      abilities({ xrayVision })
      reset()
      abilities({ elasticLimbs })
      assert.deepEqual(Object.keys(abilities), ['elasticLimbs'])
    })
  })

  describe('resetting state between tests', () => {
    it('resets the actors', async () => {
      const dave = await actor('dave')
      reset()
      const anotherDave = await actor('dave')
      assert.notDeepEqual(dave, anotherDave)
    })

    it('does not reset perspectives', () => {
      const createUser = Task('create user')
      const onePerspective = perspective('web', handle => {
        handle(createUser, () => ({ browser }) => browser.click())
      })
      reset()
      const anotherPerspective = perspective('web')
      assert.deepEqual(onePerspective, anotherPerspective)
    })
  })

  describe('interactions', () => {
    let browser, dave

    beforeEach(async () => {
      browser = {
        click: sinon.spy(),
        clickButton: sinon.spy(),
        clickLink: sinon.spy(),
        fillIn: sinon.spy(),
      }
      abilities({ browser })
      dave = await actor('dave')
    })

    context('an interaction with no parameters', () => {
      const Interactions = interactions(handler => ({
        LogIn: handler(({ browser }) => browser.click('log in')),
      }))

      it('can be attempted by an actor', async () => {
        await dave.attemptsTo(Interactions.LogIn)
        sinon.assert.called(browser.click)
      })

      it('has a description', () => {
        assert.equal(Interactions.LogIn.description, 'Log in')
      })
    })

    context('an interaction with a parameter', () => {
      const Interactions = interactions(handler => ({
        Click: {
          button: text => handler(({ browser }) => browser.clickButton(text)),
        },
      }))

      it('can be attempted by an actor', async () => {
        await dave.attemptsTo(Interactions.Click.button('log in'))
        sinon.assert.calledWith(browser.clickButton, 'log in')
      })

      it('has a description', () => {
        assert.equal(
          Interactions.Click.button('Log in').description,
          "Click button 'Log in'"
        )
      })
    })

    context('an interaction with different variants', () => {
      const Interactions = interactions(handler => ({
        Click: {
          button: text => handler(({ browser }) => browser.clickButton(text)),
          link: text => handler(({ browser }) => browser.clickLink(text)),
        },
      }))

      it('can be attempted by an actor', async () => {
        await dave.attemptsTo(Interactions.Click.button('log in'))
        sinon.assert.calledWith(browser.clickButton, 'log in')
        await dave.attemptsTo(Interactions.Click.link('log in'))
        sinon.assert.calledWith(browser.clickLink, 'log in')
      })

      it('has a description for each variant', () => {
        assert.equal(
          Interactions.Click.button('Log in').description,
          "Click button 'Log in'"
        )
      })
    })

    context('an interaction with several parameters', () => {
      const Interactions = interactions(handler => ({
        FillIn: {
          field: name => ({
            with: text => handler(({ browser }) => browser.fillIn(name, text)),
          }),
        },
      }))

      it('can be attempted by an actor', async () => {
        await dave.attemptsTo(
          Interactions.FillIn.field('email').with('dave@example.com')
        )
        sinon.assert.calledWith(browser.fillIn, 'email', 'dave@example.com')
      })

      it('has a description', () => {
        assert.equal(
          Interactions.FillIn.field('email').with('dave@example.com')
            .description,
          "Fill in field 'email' with 'dave@example.com'"
        )
      })
    })

    xcontext('giving feedback about mistakes', () => {
      const assertErrorMessageExactly = (block, expected) => {
        let err
        try {
          block()
        } catch (whatWasCaught) {
          err = whatWasCaught
        }
        assert.equal(err.message, expected)
      }

      context('an empty interaction set', () => {
        const Interactions = interactions(() => ({}))

        it('throws a helpful error when you try to use an interaction', () => {
          assertErrorMessageExactly(
            () => Interactions.Click,
            `You haven't defined any interactions yet.

To define an interaction, do it something like this:

const { Click } = interactions(handle => ({
  Click: handle(({ // TODO: abilities }) => { // TODO: interact with your app })
}))`
          )
        })
      })

      context('an interaction with no parameters', () => {
        const Interactions = interactions(handler => ({
          LogIn: handler(() => {}),
        }))

        it("throws a helpful error when you try to use another interaction that doesn't exist", () => {
          assertErrorMessageExactly(
            () => Interactions.Click,
            `The interaction 'Click' is not defined.

Here's the ones that are already defined:

* LogIn`
          )
        })
      })

      context('an interaction with a parameter', () => {
        const Interactions = interactions(handler => ({
          Click: {
            button: () => handler(() => {}),
          },
        }))

        it("throws a helpful error when you try to use a factory method that doesn't exist", () => {
          assertErrorMessageExactly(
            () => Interactions.Click.link('log in'),
            `The factory method 'link' is not defined in 'Click'.

Here's the ones that are already defined:

* button`
          )
        })
      })

      context("a handler that's not a function", () => {
        const Interactions = interactions(handler => ({
          Click: {
            button: () => handler({ weGot: 'confused ' }),
          },
        }))
        it('throws a helpful error as you try to use the interaction', () => {
          assertErrorMessageExactly(
            () => Interactions.Click.button('log in'),
            'A handler must be a function'
          )
        })
      })
    })
  })

  describe('tasks', () => {
    let handler, dave

    beforeEach(async () => {
      handler = sinon.spy()
    })

    context('a task with no parameters', () => {
      const { CreateUser } = tasks(task => ({
        CreateUser: task(),
      }))

      beforeEach(async () => {
        perspective('web', handle => {
          handle(CreateUser, () => handler)
        })
        perspective('web')
        perspective.default('web')
        dave = await actor('dave')
      })

      it('runs the perspective handler when attempted', async () => {
        await dave.attemptsTo(CreateUser)
        sinon.assert.called(handler)
      })

      it('has a description and id', () => {
        assert.equal(CreateUser.description, 'Create user')
        assert.equal(CreateUser.id, 'Create user')
      })
    })
  })
})
