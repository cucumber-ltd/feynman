module.exports = {
  named: widgetName => async ({ db }) => db.put({ widgetName })
};
