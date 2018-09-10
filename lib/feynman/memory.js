'use strict'

const { interactions, action } = require('./dsl')

const Memory = () => {
  const state = new Map()
  return {
    remember(item, value) {
      state.set(item, value)
    },
    recall(item) {
      if (!state.has(item))
        throw new Error(
          `I do not remember anything about '${item}', sorry.\n\nHere's what I *do* know about:\n${Array.from(
            state.keys()
          )
            .map(name => `- ${name}`)
            .join('\n')}\n\nWhy not ask me about those things instead?`
        )
      return state.get(item)
    },
  }
}

module.exports = interactions({
  Remember: {
    that: item => ({
      is: value => action(({ remember }) => remember(item, value)),
      equals: otherItem =>
        action(({ recall, remember }) => remember(item, recall(otherItem))),
    }),
  },
  Recall: {
    about: item => action(({ recall }) => recall(item)),
  },
})
module.exports.Memory = Memory
