# Feynman

A library for helping you organise your JavaScript test automation code, inspired by the [screenplay pattern][screenplay].

Feynman is designed to make it simple to run the same tasks at different levels of your stack.

Here's an example:

```javascript
const { Book, CancelRoom, CurrentBookings } = require('TODO')
const throughTheDomain = new DomainPerspective()
const throughTheWebApp = new WebAppPerspective()

const BookAHolidayTo = destination => composedOf(BookARoom, BookAFlightTo(destination))

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

- we don't quite now how to express assertions
  - do we just want to use attemptsTo and have commands that have assertions? This might make reporting harder later?
- is having namespaces for questions important?
- do we even need questions
- do we say checks or asserts

[screenplay]: https://ideas.riverglide.com/page-objects-refactored-12ec3541990
