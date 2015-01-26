module.exports = function howto_lookupReceiversAndSubscribers(sails) {

  return {

    receivers: function lookupReceivers(next) {

      sails.log.verbose('Loading servicebus receivers...');

      sails.hooks.moduleloader.optional({
        dirname: sails.config.paths.receivers,
        filter: /(.+)Channel\.(js|coffee|litcoffee)$/,
        flattenDirectories: true,
        keepDirectoryPath: true,
        replaceExpr: /Channel/
      }, next);

    },

    subscribers: function lookupSubscribers(next) {

      sails.log.verbose('Loading servicebus subscribers...');

      sails.hooks.moduleloader.optional({
        dirname: sails.config.paths.subscribers,
        filter: /(.+)\.(js|coffee|litcoffee)$/,
        flattenDirectories: true,
        keepDirectoryPath: true
      }, next);

    }
  };

};
