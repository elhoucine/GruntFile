/* ###################################################
 * Title: GruntFile.js
 * Desc: The grunt build configuration file.
 * Author: Anthony Del Ciotto
 * Date: 20th October 2014
 * License: MIT
 * ################################################### */

module.exports = function(grunt) {
  // require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

  // object to represent the type of environment we are running in.
  // eg. production or development
  var EnvType = {
    prod: 'production',
    dev: 'development'
  };

  // configure the tasks
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // wipe the build directory clean
    clean: {
      build: {
        src: ['dist']
      },
      scripts: {
        src: ['dist/js/*.js', '!dist/js/app.js']
      }
    },

    // copy files into dist directory
    copy: {
      build: {
        cwd: 'src',
        src: ['**', '!**/less/**', '!**/views/**'],
        dest: 'dist',
        expand: true
      }
    },

    // Configure the less compilation for both dev and prod
    less: {
      development: {
        files: {
          "dist/css/style.css": "src/less/style.less"
        }
      },
      production: {
        options: {
          // minify css in prod mode
          cleancss: true,
        },
        files: {
          "dist/css/style.css": "src/less/style.less"
        }
      }
    },
    
    // configure autoprefixing for compiled output css
    autoprefixer: {
      options: {
        browsers: [
          'Android 2.3',
          'Android >= 4',
          'Chrome >= 20',
          'Firefox >= 24', // Firefox 24 is the latest ESR
          'Explorer >= 8',
          'iOS >= 6',
          'Opera >= 12',
          'Safari >= 6'
        ]
      },
      build: {
        expand: true,
        cwd: 'dist',
        src: ['css/*.css'],
        dest: 'dist'
      }
    },

    // configure concatenation for the js: for dev mode.
    // this task will only concat files. useful for when in development
    // and debugging as the file will be readable.
    concat: {
      dist: {
        // if some scripts depend upon eachother,
        // make sure to list them here in order
        // rather than just using the '*' wildcard.
        src: ['dist/js/*.js'],
        dest: 'dist/js/app.js'
      }
    },

    // configure minification for the js: for prod mode.
    // this task both concatenates and minifies the files.
    uglify: {
      build: {
        options: {
          banner: '/*! <%= pkg.name %>' + 
          '<%= grunt.template.today("dd-mm-yyyy") %> */\n',
          mangle: false
        },
        files: {
          'dist/js/app.js': ['dist/js/*.js']
        }
      }
    },

    // configure the jade template file compilation
    jade: {
      debug: {
        options: {
          data: {
            pretty: true,
            debug: true
          }
        },
        files: [{
          expand: true,
          cwd: 'src/views',
          src: ['**/*.jade'],
          dest: 'dist',
          ext: '.html'
        }]
      },

      release: {
        options: {
          data: {
            debug: false
          }
        },
        files: [{
          expand: true,
          cwd: 'src/views',
          src: ['**/*.jade'],
          dest: 'dist',
          ext: '.html'
        }]
      }
    },

    // grunt-express will serve the files from the folders listed in `bases`
    // on specified `port` and `hostname`
    express: {
      all: {
        options: {
          port: 3000,
          hostname: "0.0.0.0",
          bases: ['dist']
        }
      }
    },

    // configure grunt-watch to monitor the projects files
    // and perform each specific file type build task.
    watch: {
      dist: {
        options: {
          livereload: true
        },
        files: [
           // triggering livereload when the .css file is updated
          // (compared to triggering when less completes)
          // allows livereload to not do a full page refresh.
          // also do the same for the compiled .html files and
          // concatenated .js files.
          'dist/css/*.css',
          'dist/*.html',
          'dist/js/*.js'
        ]
      },

      scripts: {
        files: ['src/js/*.js'],
        tasks: ['concat']
      },

      stylesless: {
        files: ['src/less/*.less'],
        tasks: ['less:development', 'autoprefixer']
      },

      jade: {
        files: ['src/views/*.jade'],
        tasks: ['jade:debug']
      }
    },

    // grunt-open will open your browser at the project's URL
    open: {
      all: {
        // Gets the port from the connect configuration
        path: 'http://localhost:<%= express.all.options.port%>'
      }
    }
  });

  /**
   * Utility function to register the stylesheets task to grunt.
   * @param  {[type]} mode  [the mode, either dev, or production]
   */
  var registerStyleSheetsTask = function(mode) {
    grunt.registerTask('stylesheets:' + mode,
      'Compiles the stylesheets for development mode',
      ['less:' + mode, 'autoprefixer']
    );
  };

  /**
   * Utility function to register the scripts task to grunt.
   * @param  {[type]} mode  [the mode, either dev, or production]
   */
  var registerScriptsTask = function(mode) {
    // if we are running in dev mode, only concat the scripts
    // otherwise minify them also
    var scriptTask = (mode === EnvType.dev) ? 'concat' : 'uglify';

    grunt.registerTask('scripts:' + mode,
      'Compiles the javascript files in ' + mode + ' mode',
      [ scriptTask, 'clean:scripts']
    );
  };

  /**
   * Utility function to register the build task to grunt.
   * @param  {[type]} mode  [the mode, either dev, or production]
   */
  var registerBuildTask = function(mode) {
    var jadeMode = (mode === EnvType.dev) ? 'debug' : 'release';

    grunt.registerTask('build:' + mode, 
      'Compiles all of the assets and copies them' +
      ' to the build directory', 
      ['clean:build', 'copy', 'stylesheets:' + mode, 'scripts:' + mode,
        'jade:' + jadeMode]
    );
  };

  /**
   * Utility function to register the server task to grunt.
   * @param  {[type]} mode  [the mode, either dev, or production]
   */
  var registerServerTask = function(mode) {
    var tasks = ['express', 'open'];

    // if we are running in development mode, run the watch task
    if (mode === EnvType.dev) {
      tasks.push('watch');
    } else if (mode === EnvType.prod) {
      tasks.push('express-keepalive');
    }

    grunt.registerTask('server:' + mode,
      'Begins the express server and opens it in a browser' +
      'constantly watching for changes', 
      tasks
    );
  }; 

  /**
   * Utility function to register the main task to grunt.
   * @param  {[type]} mode  [the mode, either dev, or production]
   */
  var registerMainTask = function(mode) {
    grunt.registerTask(mode, 
      'Watches the project for changes' +
      'automatically builds them and runs a server', 
      ['build:' + mode, 'server:' + mode]
    );
  };

  // register all the tasks for both development and production
  registerStyleSheetsTask(EnvType.dev);
  registerStyleSheetsTask(EnvType.prod);
  registerScriptsTask(EnvType.dev);
  registerScriptsTask(EnvType.prod);
  registerBuildTask(EnvType.dev);
  registerBuildTask(EnvType.prod);
  registerServerTask(EnvType.dev);
  registerServerTask(EnvType.prod);
  registerMainTask(EnvType.dev);
  registerMainTask(EnvType.prod);
};
