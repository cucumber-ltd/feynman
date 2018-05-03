'use strict'
const { By } = require('selenium-webdriver')

module.exports = {
  named: widgetName =>
    async ({browser}) =>
      (await browser.findElement(By.css(`#${widgetName} button`))).click()
}
