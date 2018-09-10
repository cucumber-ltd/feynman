'use strict'

const assert = require('assert')

const { Perspective, Actor } = require('./core')
const { Memory, Remember, Recall } = require('./memory')

describe('Memory', () => {
  it('allows an actor to remember things', async () => {
    const joe = Actor({ ...Memory() }, Perspective('test'))
    await joe.attemptsTo(Remember.that('thing').is('something'))
    assert.equal(await joe.asks(Recall.about('thing')), 'something')
  })

  it('allows an actor to remember things under several names', async () => {
    const joe = Actor({ ...Memory() }, Perspective('test'))
    await joe.attemptsTo(
      Remember.that('thing').is('something'),
      Remember.that('other thing').equals('thing')
    )
    assert.equal(await joe.asks(Recall.about('other thing')), 'something')
  })

  it("throws when asked for something it can't remember", async () => {
    const joe = Actor({ ...Memory() }, Perspective('test'))
    let err
    try {
      await joe.asks(Recall.about('something unknown'))
    } catch (e) {
      err = e
    }
    assert(err, 'Expected it to throw')
    assert(
      err.message.match(/something unknown/),
      `The error message doesn't look right: ${err.message}`
    )
  })
})
