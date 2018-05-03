'use strict'

const caller = require('caller')
const { lstatSync, readdirSync } = require('fs')
const { basename, resolve, join, extname } = require('path')
const  pascalCase = require('pascal-case')

const isDirectory = source => lstatSync(source).isDirectory()
const listDirectoriesIn = path =>
  readdirSync(path)
    .map(name => join(path, name))
    .filter(isDirectory)

const listFilesIn = path =>
  readdirSync(path)
  .map(name => join(path, name))
  .filter(path => !isDirectory(path))

const isJavaScriptFile = path => path.extname !== '.js'

class Task {
  static from({ absolutePath }) {
    const name = pascalCase(basename(absolutePath, extname(absolutePath)))
    const path = absolutePath
    return new this({ name, path })
  }

  constructor({ name, path }) {
    this._name = name
    this._path = path
  }

  addTo(perspective) {
    perspective[this._name] = require(this._path)
  }
}

class Perspective {
  static from({ absolutePath }) {
    const files = listFilesIn(absolutePath).filter(isJavaScriptFile)
    const tasks = files.map(absolutePath => Task.from({ absolutePath }));
    const name = basename(absolutePath, extname(absolutePath))
    return new this({ name, tasks })
  }

  constructor({ name, tasks }) {
    this._name = name
    for(const task of tasks)
      task.addTo(this)
  }

  addTo(perspectives) {
    perspectives[this._name] = this
  }
}

class Perspectives {
  static from({ path }) {
    const absolutePath = resolve(join(caller(), '..', path))
    const perspectivePaths = listDirectoriesIn(absolutePath)
    const perspetives = perspectivePaths.map(absolutePath => Perspective.from({ absolutePath }))
    return new this(perspetives)
  }
  constructor(perspectives) {
    for(const perspective of perspectives)
      perspective.addTo(this)
  }
}

module.exports = path => Perspectives.from({ path })
