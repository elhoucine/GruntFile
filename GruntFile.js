/* ###################################################
 * Title: GruntFile.js
 * Desc: The grunt build configuration file.
 * Author: Elhoucine Az
 * Original Author: Anthony Del Ciotto
 * Date: 20th October 2014
 * License: MIT
 * ################################################### */

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  // some constants for various paths and files to be used by
  // the task configurations
  var BUILD_DIR = 'dist/';
  var BUILD_DIR_JS = BUILD_DIR + 'js/';
  var BUILD_DIR_CSS = BUILD_DIR + 'css/';
  var BUILD_FILE_JS = BUILD_DIR_JS + 'app.js';

  var SRC_DIR = 'src/';
  var SRC_DIR_JS = SRC_DIR + 'js/';
  var SRC_DIR_LESS = SRC_DIR + 'less/';
  var SRC_DIR_JADE = SRC_DIR + 'views/'; 
  var SRC_FILES_JS = SRC_DIR_JS + '*.js';
  var SRC_FILE_LESS = SRC_DIR_LESS + 'style.less';
  var SRC_FILES_LESS = SRC_DIR_LESS + '*.less';
  var SRC_FILES_JADE = SRC_DIR_JADE + '*.jade';

  var AP_BROWSERS = [
        'Android 2.3',
        'Android >= 4',
        'Chrome >= 20',
        'Firefox >= 24', // Firefox 24 is the latest ESR
        'Explorer >= 8',
        'iOS >= 6',
        'Opera >= 12',
        'Safari >= 6'
  ];
  var JADE_FILE_CFG =  [{
        expand: true,
        cwd: SRC_DIR_JADE,
        src: ['**/*.jade'],
        dest: BUILD_DIR,
        ext: '.html'
  }];

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
        src: [BUILD_DIR]
      },
      scripts: {
        src: [BUILD_DIR_JS + '*.js', '!' + BUILD_FILE_JS]
      }
    },

    // copy files into dist directory
    copy: {
      build: {
        cwd: SRC_DIR,
        src: ['**', '!**/less/**', '!**/views/**'],
        dest: BUILD_DIR,
        expand: true
      }
    },

    // Configure the less compilation for both dev and prod
    less: {
      development: {
        files: {
          "dist/css/style.css": SRC_FILE_LESS
        }
      },
      production: {
        options: {
          // minify css in prod mode
          cleancss: true,
        },
        files: {
          "dist/css/style.css": SRC_FILE_LESS
        }
      }
    },
    
    // configure autoprefixing for compiled output css
    autoprefixer: {
      options: {
        browsers: AP_BROWSERS
      },
      build: {
        expand: true,
        cwd: BUILD_DIR,
        src: ['css/*.css'],
        dest: BUILD_DIR
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
        src: [BUILD_DIR_JS + '*.js'],
        dest: BUILD_FILE_JS
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
          BUILD_FILE_JS: [BUILD_DIR_JS + '*.js']
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
        files: JADE_FILE_CFG
      },

      release: {
        options: {
          data: {
            debug: false
          }
        },
        files: JADE_FILE_CFG
      }
    },

    // grunt-express will serve the files from the folders listed in `bases`
    // on specified `port` and `hostname`
    express: {
      all: {
        options: {
          port: 3000,
          hostname: "0.0.0.0",
          bases: [BUILD_DIR],
          livereload: true
        }
      }
    },

    // configure grunt-watch to monitor the projects files
    // and perform each specific file type build task.
    watch: {
      scripts: {
        options: { livereload: false },
        files: [SRC_FILES_JS],
        tasks: ['concat']
      },

      stylesless: {
        options: { livereload: false },
        files: [SRC_FILES_LESS],
        tasks: ['less:development', 'autoprefixer']
      },

      jade: {
        options: { livereload: false },
        files: [SRC_FILES_JADE],
        tasks: ['jade']
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
    grunt.registerTask('build:' + mode, 
      'Compiles all of the assets and copies them' +
      ' to th build directory', 
      ['clean:build', 'copy', 'stylesheets:' + mode, 'scripts:' + mode, 
        'jade']
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

  // register development mode as the main task
  grunt.registerTask('default', 'Default task: development', 'development');
};
