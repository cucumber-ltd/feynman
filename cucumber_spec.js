"use strict"

const assert = require("assert")
const sinon = require('sinon')
const { Task } = require("./lib/feynman")
const { reset } = require('./cucumber')

describe("cucumber integration", () => {
  beforeEach(reset)

  it("creates, stores and retrieves actors by name", () => {
    const { actor } = require("./cucumber")
    const dave = actor("dave")
    const anotherDave = actor("dave")
    assert.deepEqual(dave, anotherDave)
  })

  it("runs an afterCreate callback when the actor is created", () => {
    const setupMyActor = sinon.spy()
    const { actor } = require("./cucumber")
    const dave = actor("dave", { afterCreate: setupMyActor })
    const anotherDave = actor("dave", { afterCreate: setupMyActor })
    sinon.assert.calledOnce(setupMyActor)
    sinon.assert.calledWith(setupMyActor, dave)
  })

  it("resets the state between scenarios", () => {
    const { actor, reset } = require("./cucumber")
    const dave = actor("dave")
    reset()
    const anotherDave = actor("dave")
    assert.notDeepEqual(dave, anotherDave)
  })

  it("creates and stores perspectives by name", () => {
    const createUser = Task()
    const { perspective } = require("./cucumber")
    const onePerspecrtive = perspective("web", handle => {
      handle(createUser, () => ({ browser }) => browser.click())
    })
    const anotherPerspective = perspective("web")
    assert.deepEqual(onePerspecrtive, anotherPerspective)
  })

  it("creates actors with the default perspective", async () => {
    const createUser = Task('create user')
    const { actor, perspective } = require("./cucumber")
    perspective("web", handle => {
      handle(createUser, () => ({ browser }) => browser.click())
    })
    perspective.default("web")
    const browser = { click: sinon.spy() }
    const dave = actor("dave").gainsAbilities({ browser })
    await dave.attemptsTo(createUser)
    sinon.assert.called(browser.click)
  })
})
