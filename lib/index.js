var path = require('path');
var async = require('sails/node_modules/async');
var _ = require('sails/node_modules/lodash');

var howto_loadReceiversAndSubscribers = require('./loaders');
var Bus = require('./bus');

module.exports = function(sails) {
  var load = howto_loadReceiversAndSubscribers(sails);
  var bus = Bus(sails);

  var receivers, subscribers;

  var hook = _.extend({

    defaults: function(config) {
      return {
        paths: {
          receivers: path.resolve(config.appPath, 'api/receivers'),
          subscribers: path.resolve(config.appPath, 'api/subscribers')
        },
        servicebus: {

        }
      };
    },

    configure: function() {
      _.extend(sails.config.paths, {
        receivers: path.resolve(sails.config.appPath, sails.config.paths.receivers),
        subscribers: path.resolve(sails.config.appPath, sails.config.paths.subscribers)
      });

      sails.on('hook:servicebus:reload', hook.reload);
      sails.on('lower', hook.teardown);
    },

    initialize: function(cb) {

      receivers = {};
      subscribers = {};

      cb();
    },

    reload: function() {
      hook.teardown(function() {
        hook.initialize(function(err) {
          if (err) {
            sails.log.error('Failed to reinitialize Servicebus.');
            sails.log.error(err);
          } else {
            sails.emit('hook:servicebus:reloaded');
          }
        });
      });
    },

    teardown: function(cb) {
      cb = cb || function(err) {
        if (err) {
          sails.log.error('Failed to teardown Servicebus hook.');
          sails.log.error(err);
        }
      };
      async.forEach(Object.keys(receivers), function(name, cb) {
        var listener = receivers[name];
        if (listener.teardown) {
          listener.teardown(cb);
        } else {
          cb();
        }
      }, cb);
    },

    startReceivers: function(moduleNames) {
      sails.log.verbose('Servicebus::startReceivers', moduleNames);

      load.receivers(function(err, modules) {
        if (err) {
          sails.log.warn(err);
        }

        var modulesToLoad = !_.isEmpty(moduleNames) ? moduleNames : Object.keys(modules);

        _.each(modulesToLoad, function(moduleName) {
          if (modules[moduleName]) {
            receivers[moduleName] = bus.addListener(modules[moduleName], moduleName);
            sails.log.silly('Servicebus listening to channel `' + moduleName + '`.');
          } else {
            sails.log.warn('Servicebus module `' + moduleName + '` not found.');
          }
        });
      });

      // process.once('SIGINT', sails.lower);
    },

    startSubscribers: function(moduleNames) {
      sails.log.verbose('Servicebus::startSubscribers', moduleNames);

      load.subscribers(function(err, modules) {
        if (err) {
          sails.log.warn(err);
        }

        var modulesToLoad = !_.isEmpty(moduleNames) ? moduleNames : Object.keys(modules);

        async.each(modulesToLoad, function(moduleName, cb) {
          if (modules[moduleName]) {
            subscribers[moduleName] = bus.addSubscribtions(modules[moduleName], cb);
            sails.log.silly('Servicebus subscriptions `' + moduleName + '` added.');
          } else {
            sails.log.warn('Servicebus module `' + moduleName + '` not found.');
            cb();
          }
        }, function() {});
      });
    }

  }, bus);

  return hook;
};
