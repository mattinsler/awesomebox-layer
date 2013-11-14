(function() {
  var Renderer, err, helpers, mime, path, setup_awesomebox_render, _ref;

  path = require('path');

  mime = require('mime');

  try {
    _ref = require(path.join(process.cwd(), 'node_modules', 'awesomebox-core')), helpers = _ref.helpers, Renderer = _ref.Renderer;
  } catch (_error) {
    err = _error;
    console.log('\nYou must npm install awesomebox-core in order to use awesomebox-layer\n');
    throw err;
  }

  module.exports = function(app) {
    var _base, _base1, _base2;
    if ((_base = app.path)["public"] == null) {
      _base["public"] = path.join(app.path.root, 'public');
    }
    if ((_base1 = app.path).layouts == null) {
      _base1.layouts = path.join(app.path.app, 'layouts');
    }
    if ((_base2 = app.path).views == null) {
      _base2.views = path.join(app.path.app, 'views');
    }
    app.awesomebox = {
      middleware: function(root_path) {
        var renderer;
        renderer = new Renderer({
          root: root_path
        });
        return function(req, res, next) {
          var file, o;
          file = helpers.find_file(renderer.opts.root, req.url);
          if (file == null) {
            return next();
          }
          o = helpers.parse_filename(file);
          if (!(o.engines.length > 0 || /\.html$/.test(file))) {
            return next();
          }
          return renderer.render(file).then(function(opts) {
            var content_type;
            if (opts.content == null) {
              return next();
            }
            content_type = mime.lookup(req.url);
            if (content_type === 'application/octet-stream') {
              content_type = mime.lookup(opts.type);
            }
            res.status(200);
            res.set({
              'Content-Type': content_type
            });
            return res.send(opts.content);
          })["catch"](next);
        };
      }
    };
    return app.sequence('http').insert('awesomebox-render', setup_awesomebox_render(app), {
      before: 'listen'
    });
  };

  setup_awesomebox_render = function(app) {
    var renderer;
    renderer = new Renderer({
      root: app.path.views
    });
    return function(done) {
      app.express.render = function(name, options, next) {
        var data, file, k, v, _ref1, _ref2;
        file = helpers.find_file(renderer.opts.root, name);
        if (file == null) {
          return next();
        }
        data = {};
        _ref1 = app.express.locals;
        for (k in _ref1) {
          v = _ref1[k];
          data[k] = v;
        }
        _ref2 = options._locals || {};
        for (k in _ref2) {
          v = _ref2[k];
          data[k] = v;
        }
        for (k in options) {
          v = options[k];
          data[k] = v;
        }
        return renderer.render(file, data).then(function(opts) {
          if (opts.content == null) {
            return next();
          }
          return next(null, opts.content);
        })["catch"](next);
      };
      return done();
    };
  };

}).call(this);
