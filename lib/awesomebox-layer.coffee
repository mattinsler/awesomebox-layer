path = require 'path'
mime = require 'mime'
try
  {helpers, Renderer} = require path.join(process.cwd(), 'node_modules', 'awesomebox-core')
catch err
  console.log '\nYou must npm install awesomebox-core in order to use awesomebox-layer\n'
  throw err

module.exports = (app) ->
  app.path.public ?= path.join(app.path.root, 'public')
  app.path.layouts ?= path.join(app.path.app, 'layouts')
  app.path.views ?= path.join(app.path.app, 'views')
  
  app.awesomebox =
    middleware: (root_path) ->
      renderer = new Renderer(root: root_path)
      
      (req, res, next) ->
        file = helpers.find_file(renderer.opts.root, req.url)
        return next() unless file?
        
        o = helpers.parse_filename(file)
        return next() unless o.engines.length > 0 or /\.html$/.test(file)
        
        renderer.render(file)
        .then (opts) ->
          return next() unless opts.content?
          
          content_type = mime.lookup(req.url)
          content_type = mime.lookup(opts.type) if content_type is 'application/octet-stream'
          
          res.status(200)
          res.set('Content-Type': content_type)
          res.send(opts.content)
        .catch (err) ->
          console.log req.url
          console.log err.stack
          next(err)
  
  app.sequence('http').insert(
    'awesomebox-render', setup_awesomebox_render(app)
    before: 'listen'
  )

setup_awesomebox_render = (app) ->
  renderer = new Renderer(root: app.path.views)
  
  (done) ->
    app.express.render = (name, options, next) ->
      file = helpers.find_file(renderer.opts.root, name)
      return next() unless file?
      
      data = {}
      data[k] = v for k, v of app.express.locals
      data[k] = v for k, v of (options._locals or {})
      data[k] = v for k, v of options
      
      renderer.render(file, data)
      .then (opts) ->
        return next() unless opts.content?
        next(null, opts.content)
      .catch (err) ->
        console.log renderer.opts.root, name
        console.log err.stack
        next(err)
    
    done()
