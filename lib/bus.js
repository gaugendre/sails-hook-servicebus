var servicebus = require('servicebus');
var uuid = require('sails/node_modules/node-uuid').v4;

module.exports = function Bus(sails) {
  var bus = servicebus.bus(sails.config.servicebus);

  bus.use(bus.correlate());
  bus.use(bus.retry());

  return {

    send: function(channel, command, data, next, timeout) {
      if (typeof next === 'function') {
        var responded = false;
        data.responseChannel = channel + '.' + command + '.response-' + uuid();

        var sub = bus.subscribe(responseChannel, function(event, cb) {
          sub.unsubscribe();

          if (event.err) {
            next(event.err);
          } else {
            next(null, event.response);
          }

          responded = true;

          cb();
        });

        if (typeof timeout === 'undefined') {
          timeout = 200;
        }

        setTimeout(function() {
          if (!responded) {
            responded = true;
            sub.unsubscribe();

            sails.log.warn('command `' + command + '` sent on channel `' + channel + '` waiting for response on channel `' + data.responseChannel + '` timed out after ' + timeout + 'ms.');
            next('RPC timed out');
          }
        }, timeout);
      }

      bus.send(channel, {
        command: command,
        data: data
      }, {
        ack: true
      });
    },

    listen: bus.listen,

    addListener: function(module, name) {
      var receivers = module(bus);

      process.once('SIGINT', function() {
        bus.unlisten(name);
      });

      bus.listen(name, {
        ack: true
      }, function(msg) {
        var ack, reject;

        if (typeof msg.command !== 'string') {
          sails.log.warn('servicebus channel `' + name + '`: command is not a string');
          return msg.handle.reject('command is not a string');
        }

        if (typeof msg.data !== 'object') {
          sails.log.warn('servicebus channel `' + name + '`: data is not an object');
          return msg.handle.reject('data is not an object');
        }

        if (typeof receivers[msg.command] !== 'function') {
          sails.log.warn('servicebus channel `' + name + '`: command not recognized');
          return msg.handle.reject('command not recognized');
        }

        if (msg.data.responseChannel) {

          ack = function ack(response) {
            bus.publish(msg.data.responseChannel, {
              response: response
            });
            msg.handle.ack();
          };

          reject = function reject(err) {
            bus.publish(msg.data.responseChannel, {
              err: err
            });
            msg.handle.ack();
          };

        } else {
          ack = msg.handle.ack;
          reject = msg.handle.reject;
        }

        receivers[msg.command](msg.data, ack, reject);
      });

      return {
        teardown: function(cb) {
          // bus.unlisten(name);
          cb();
        }
      };
    },

    publish: bus.publish,

    subscribe: bus.subscribe,

    addSubscribtions: function(module, cb) {
      var subscribtions = module(bus);

      subscribtions.initialize(function() {
        if (cb) cb();
      });

      return subscribtions;
    },

    native: function(cb) {
      cb(bus);
    }

  };
};
