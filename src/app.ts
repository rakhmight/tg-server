// modules
const fastify = require("fastify");
const path = require('path')

// plugins
const { corsParams } = require('./plugins/cors')
const { socketParams } = require('./plugins/socket')

export const build = (opts = {}) => {
  const app = fastify(opts)

  app.register(require('@fastify/cors'), corsParams)
  app.register(require('fastify-socket.io'), socketParams)

  app.after()
  return app;
};