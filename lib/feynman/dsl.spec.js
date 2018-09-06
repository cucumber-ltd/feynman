'use strict'

const assert = require('assert')
const sinon = require('sinon')
const { Task } = require('./core')
const { reset, actor, perspective, abilities, interactions } = require('./dsl')

describe('feynman DSL', () => {
  beforeEach(reset)

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
      const onePerspecrtive = perspective('web', handle => {
        handle(createUser, () => ({ browser }) => browser.click())
      })
      const anotherPerspective = perspective('web')
      assert.deepEqual(onePerspecrtive, anotherPerspective)
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
    const Interactions = interactions(handler => ({
      FillIn: {
        field: name => ({
          with: text => handler(({ browser }) => browser.fillIn(name, text)),
        }),
      },
    }))

    it('creates interactions that can be attempted by actors as normal', () => {
      const browser = { fillIn: sinon.spy() }
      const dave = actor('dave', { browser })
      dave.attemptsTo(
        Interactions.FillIn.field('email').with('dave@example.com')
      )
      sinon.assertCalledWith(browser.fillIn, 'email', 'dave@example.com')
    })

    it('creates sets of interactions with descriptions', () => {
      assert.equal(
        Interactions.FillIn.field('email').with('dave@example.com').description,
        "Fill in field 'email' with 'dave@example.com'"
      )
    })

    it("throws a helpful error when you try to use an interaction that doesn't exist", () => {
      assert.throws(() => Interactions.Click, /not defined/i)
    })
  })
})
