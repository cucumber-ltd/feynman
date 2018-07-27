# Feynman

A library for helping you organise your JavaScript test automation code, inspired by the [screenplay pattern][screenplay].

Feynman is designed to make it simple to run the same tasks at different levels of your stack.

Here's an example:

```javascript
const { Book, CancelRoom, CurrentBookings } = require('TODO')
const throughTheDomain = new DomainPerspective()
const throughTheWebApp = new WebAppPerspective()

Given('Joe has booked a hotel room', async () => {
  const joe = Actor()
  throughTheDomain(joe).attemptsTo(
    Book.aRoom
  )
})

When('Joe cancels his hotel room', async () => {
  const joe = Actor()
  throughTheWebApp(joe).attemptsTo(
    CancelRoom.bookedBy(joe)
  )
})

Then('Joe should have no bookings', async () => {
  const joe = Actor()
  
  throughTheWebApp(joe).attemptsTo(
    AssertThat(CurrentBookings.areEmpty)
  )
  // ==
  throughTheWebApp(joe).checksThat(
    CurrentBookings.areEmpty
  )
})


// TODO: map the Book.aRoom task to these lower level tasks to show that tasks are composable
//    Login.withValidCredentials,
//    SearchForRoom.availableWithinNextTwoWeeks
//    BookRoom.fromFirstSearchResult
```

## Puzzles

- how to pass state between steps (do actors have brains?)
  - do we want to re-use actors between steps?
  - maybe we can have a single state tree that we use reducers / selectors to manage
  - what makes Joe, Joe?
    - where does his state live?
- we don't quite now how to express assertions
  - do we just want to use attemptsTo and have commands that have assertions? This might make reporting harder later?
- is having namespaces for questions important?
- do we even need questions
- do we say checks or asserts
- how do we choose which low-level task to load that is composed of interactions? Based on the perspective?
  - perhaps we can just separate the definition from the handler (like commands / command handlers)

    [screenplay]: // TODO
