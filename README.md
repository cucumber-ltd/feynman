# Feynman

A library for helping you organise your JavaScript test automation code, inspired by the [screenplay pattern][screenplay].

What's lovely about screenplay, as opposed to other patterns for organising automation code like [page objects][page objects], is that you're building abstractions around _behaviour_, rather than solution implementation. We think you're going to like it.

Compared to other screenplay implementations we've seen, what's unique about Feynman is that you can define multiple *perspectives* that allow you to run the same tasks against your application in different ways.

More on that later.

We're going to assume you know little or nothing about the screenplay pattern and explain this from the ground up. Let's start with an example.

## A simple example

```javascript
const { actor } = require('feynman')

const dave = await actor('dave')
await dave.attemptsTo(PostMessageInSlack)
```

What's going on here?

First, we call the `actor` method to get hold of an _Actor_ who we've given the label "dave". It doesn't matter what we
call our actor in this example, but you'll see why it's useful later on.

Next, we ask Dave to attempt an _Action_, `PostMessageInSlack`.

In order to make this code work, we'll need to define that action, as well as giving `dave` an _Ability_ that lets our action post messages in Slack.

First we create the action:

```javascript
const channel = 'YOURCHANNEL' // should look like CFCJMB2K0
const PostMessageInSlack = ({ slack }) => slack.chat.postMessage({ channel, text: "Hello world!" })
```

So our `PostMessageInSlack` action is defined as a function that takes a `slack` named parameter, representing the [Slack web client API](https://github.com/slackapi/node-slack-sdk), and calls the API to post a message.

How do we give `dave` this ability?

```javascript
(async () => {
  const { actor, abilities } = require('feynman')
  const { WebClient } = require('@slack/client')
  const token = process.env.SLACK_TOKEN
  const slack = new WebClient(token)

  abilities({ slack })

  const channel = 'YOURCHANNEL' // should look like CFCJMB2K0
  const PostMessageInSlack = ({ slack }) => slack.chat.postMessage({ channel, text: "Hello world!" })

  const dave = await actor('dave')
  await dave.attemptsTo(PostMessageInSlack)
})()
```

That's the fundamentals of using Feynman. Read on to learn more about:

* Composing actions
* Creating actions that take parameters
* Giving actors memory
* Using _perspectives_ to run your tests at different levels of the stack
* Using feynman with different test frameworks

[screenplay]: https://ideas.riverglide.com/page-objects-refactored-12ec3541990
[page objects]: https://martinfowler.com/bliki/PageObject.html
