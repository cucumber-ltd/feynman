'use strict'

const assert = require('assert')
const sinon = require('sinon')
const { Task } = require('./core')
const { reset, actor, perspective, tasks } = require('./dsl')

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

  describe('resetting state between tests', () => {
    it('resets the actors', async () => {
      const dave = await actor('dave')
      reset()
      const anotherDave = await actor('dave')
      assert.notDeepEqual(dave, anotherDave)
    })

    it('does not reset perspectives', () => {
      const createUser = Task('create user')
      const onePerspecrtive = perspective('web', handle => {
        handle(createUser, () => ({ browser }) => browser.click())
      })
      reset()
      const anotherPerspective = perspective('web')
      assert.deepEqual(onePerspecrtive, anotherPerspective)
    })
  })

  describe('defining tasks', () => {
    it('creates a task with no parameters', () => {
      const { CreateUser } = tasks({
        CreateUser: [],
      })
      assert.equal(CreateUser.id, 'CreateUser')
    })

    it('fails to find a task with the wrong name', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-unused-vars
        const { CreateTiger } = tasks({
          CreateUser: [],
        })
      }, /The task CreateTiger is not defined/)
    })

    it('creates a task with parameters', () => {
      const { createUser } = tasks({
        createUser: ['name'],
      })
      assert.deepEqual(createUser('matt').params, { name: 'matt' })
    })

    it('creates a nested task with parameters', () => {
      const { CreateUser } = tasks({
        CreateUser: {
          named: ['name'],
        },
      })
      assert.deepEqual(CreateUser.named('matt').params, { name: 'matt' })
      assert.deepEqual(CreateUser.named.id, 'CreateUser.named')
    })

    xit('creates a deeply nested task with parameters', () => {
      const { CreateUser } = tasks({
        CreateUser: {
          named: [
            'name',
            {
              withBacon: ['flavour'],
            },
          ],
        },
      })
      assert.deepEqual(CreateUser.named('matt').withBacon('smoked'), {
        name: 'matt',
        flavour: 'smoke',
      })
      assert.deepEqual(CreateUser.named.withBacon.id, 'CreateUser.named.withBacon')
    })
  })
})
