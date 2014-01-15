(function() {
  var Renderer, UglifyJS, cssmin, err, helpers, mime, path, q, setup_awesomebox_render, _ref;

  q = require('q');

  path = require('path');

  mime = require('mime');

  cssmin = require('cssmin');

  UglifyJS = require('uglify-js2');

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
      cache: {
        css: {},
        js: {}
      },
      middleware: function(root_path) {
        return function(req, res, next) {
          var file, o, renderer, _ref1;
          renderer = new Renderer({
            root: root_path
          });
          file = helpers.find_file(renderer.opts.root, req.url);
          if (file == null) {
            return next();
          }
          o = helpers.parse_filename(file);
          if ((_ref1 = o.type) !== 'css' && _ref1 !== 'js') {
            return next();
          }
          return q().then(function() {
            if (app.awesomebox.cache[o.type][req.url] != null) {
              return app.awesomebox.cache[o.type][req.url];
            }
            return renderer.render(file).then(function(opts) {
              var content_type, data;
              if (opts.content == null) {
                return null;
              }
              content_type = mime.lookup(req.url);
              if (content_type === 'application/octet-stream') {
                content_type = mime.lookup(opts.type);
              }
              data = {
                content_type: content_type,
                content: opts.content
              };
              if (app.environment === 'development') {
                return data;
              }
              if (o.type === 'css') {
                opts.content = cssmin(opts.content.toString());
              } else if (o.type === 'js') {
                opts.content = UglifyJS.minify(opts.content.toString(), {
                  fromString: true
                }).code;
              }
              return app.awesomebox.cache[o.type][req.url] = data;
            });
          }).then(function(data) {
            if (data == null) {
              return next();
            }
            res.status(200);
            res.set({
              'Content-Type': data.content_type
            });
            return res.send(data.content);
          })["catch"](function(err) {
            console.log(req.url);
            console.log(err.stack);
            return next(err);
          });
        };
      }
    };
    return app.sequence('http').insert('awesomebox-render', setup_awesomebox_render(app), {
      before: 'listen'
    });
  };

  setup_awesomebox_render = function(app) {
    return function(done) {
      app.express.render = function(name, options, next) {
        var data, file, k, renderer, v, _ref1, _ref2;
        renderer = new Renderer({
          root: app.path.views
        });
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
        })["catch"](function(err) {
          console.log(renderer.opts.root, name);
          console.log(err.stack);
          return next(err);
        });
      };
      return done();
    };
  };

}).call(this);
