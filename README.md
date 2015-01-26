# sails-hook-servicebus

`servicebus` hook for Sails v0.10

## Status

> ##### Stability: [1](http://nodejs.org/api/documentation.html#documentation_stability_index) - Experimental


## Purpose

A sails.js hook based on Matt Walters module [servicebus](https://github.com/mateodelnorte/servicebus).
+ Can help you to setup multiprocess actors or an event oriented architecture
+ regroup command receivers into a controller-style object for each channel
+ expose the servicebus wrapped instance as `sails.hooks.servicebus`


#### Sample setup

```bash
npm install sails-hook-servicebus

mkdir -p api/hooks/servicebus
echo "module.exports = require('sails-hook-servicebus');" > api/hooks/servicebus/index.js

mkdir -p api/receivers
mkdir -p api/subscribers
touch api/receivers/MyDataDomainChannel.js
touch api/subscribers/MyDataVewMaterializer.js
```

#### optional

```bash
echo "module.exports.servicebus = {
  url: 'amqp://localhost'
};
" > config/servicebus.js
```

### send / workers pattern

```javascript
sails.hooks.servicebus.send('mydatadomain', 'commandname', { my: 'data' });
```

#### RPC pattern

not tested

#### Channel listeners

##### api/receivers/MyDataDomainChannel.js

```javascript
module.exports = function(bus) {
  return {

    commandname: function myReceiver(data, ack, reject) {
      // do some heavy work with data
      sails.log.info('receiving object ' + data.id);

      // broadcast other messages
      bus.publish('some', stuff);

      // acknowledge the procedure
      return ack(optional_response);

      // reject the task
      return reject(optional_error);
    }

  };
};
```

##### start a receivers process

```javascript
sails.lift({

    log: {
      noShip: true
    },

    // Don't run the bootstrap
    bootstrap: function(done) {
      return done();
    },

    hooks: {
      noRoutes: function(sails) {
        return {
          initialize: function(cb) {
            sails.log.verbose('Wiping out explicit routes to make worker load faster...');
            sails.config.routes = {};
            return cb();
          }
        };
      },
      grunt: false,
      csrf: false,
      cors: false,
      controllers: false,
      policies: false,
      i18n: false,
      request: false,
      responses: false,
      http: false,
      sockets: false,
      views: false,
      pubsub: false,
      blueprints: false,
      session: false
    }
  }, function(err) {
  if (err) throw err;

  sails.hooks.servicebus.startReceivers([ /* 'mydatadomain', ...*/ ]);
});
```

### pubsub pattern

```javascript
var bus = sails.hooks.servicebus;

bus.subscribe('event.*', function (msg) {
  sails.log.info(msg);
});

bus.publish('event.one', { event: 'one' });
bus.publish('event.two', { event: 'two' });

```

#### Purpose oriented subscribers

##### api/subscribers/MyDataVewMaterializer.js

```javascript
module.exports = function(bus) {

  return {
    initialize: function(cb) {

      // be sure to manage inconsistencies due to missed / unordered events

      bus.subscribe('some', function(stuff) {
        // fetch, check and update some other models
      });

      cb();

    }
  };
};

```

##### start a subscribers process

```javascript
sails.lift({ /* noShip, noBootstrap, noHostHooks, noRoutes */ }, function() {
  sails.hooks.servicebus.startSubscribers([ /* 'mydataviewmaterializer', ...*/ ]);
});
```


## What is this?

This repo contains a hook, one of the building blocks Sails is made out of.

## License

MIT
