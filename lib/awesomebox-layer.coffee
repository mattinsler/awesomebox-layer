q = require 'q'
path = require 'path'
mime = require 'mime'
cssmin = require 'cssmin'
UglifyJS = require 'uglify-js2'

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
    cache:
      css: {}
      js: {}
    locals: {}
    
    middleware: (root_path) ->
      (req, res, next) ->
        renderer = new Renderer(root: root_path)
        
        file = helpers.find_file(renderer.opts.root, req.url)
        return next() unless file?
        
        o = helpers.parse_filename(file)
        return next() unless o.type in ['css', 'js']
        
        q()
        .then ->
          return app.awesomebox.cache[o.type][req.url] if app.awesomebox.cache[o.type][req.url]?
        
          renderer.render(file, app.awesomebox.locals)
          .then (opts) ->
            return null unless opts.content?
            
            content_type = mime.lookup(req.url)
            content_type = mime.lookup(opts.type) if content_type is 'application/octet-stream'
            
            data =
              content_type: content_type
              content: opts.content
            
            return data if app.environment is 'development'
            
            if o.type is 'css'
              opts.content = cssmin(opts.content.toString())
            else if o.type is 'js'
              opts.content = UglifyJS.minify(opts.content.toString(), fromString: true).code
            
            app.awesomebox.cache[o.type][req.url] = data
        
        .then (data) ->
          return next() unless data?
          
          res.status(200)
          res.set('Content-Type': data.content_type)
          res.send(data.content)
        .catch (err) ->
          console.log req.url
          console.log err.stack
          next(err)
  
  app.sequence('http').insert(
    'awesomebox-render', setup_awesomebox_render(app)
    before: 'listen'
  )

setup_awesomebox_render = (app) ->
  (done) ->
    app.express.render = (name, options, next) ->
      renderer = new Renderer(root: app.path.views)
      
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
        console.log err.original_error.message
        next(err)
    
    done()
