

var fs          = require( 'fs' ),
    path        = require( 'path' ),
    through     = require( 'through2' ),
    glob        = require( 'glob' ),
    hogan       = require( 'hogan.js' ),
    gutil       = require( 'gulp-util' ),
    defaults    = require( 'lodash.defaults' );


module.exports = function( opts ) {

    defaults( opts, {
        // The data to compile with
        data: {},

        // The location to look for template partials, relative to the gulpfile
        tmplPath: './src/tmpl',

        // The template extension to look for
        tmplExtension: '.hjs'
    });

    /**
     * Simple promisified readFile
     *
     * @param filepath {String} the file to get
     * @returns {Promise} resolves to the file contents, as a string
     */
    function get( filepath ) {
        return new Promise( function( resolve, reject ) {
            fs.readFile( filepath, {
                encoding: 'utf8'
            }, function( err, res ) {
                if ( err ) {
                    reject( err );
                    return;
                }

                resolve( res );
            });
        });
    }

    /**
     * Grabs all the partials and returns an object where keys are the filename and values are the contents as a string
     *
     * @param directory {String} where to search for templates
     * @returns {Promise} resolves to an object with key-value pairs representing filename and contents
     */
    function getPartials( directory ) {
        return new Promise( function( resolve, reject) {

            // Glob for all templates and grab contents of each template file
            // Keep the path in the glob term to return absolute paths which makes life easier later on
            glob( path.join( directory, '*' + opts.tmplExtension ), null, function( err, files ) {

                if ( !files.length ) {
                    // reject( new Error( 'no template files found with extension ' + opts.tmplExtension ) );
                    resolve( {} );
                }

                // Get each file contents
                Promise.all( files.map( get ) )
                    .then( function( res ) {

                        // Reduce to a key-value object filename-contents then resolve
                        resolve( files.reduce( function( acc, item, index ) {
                            acc[ path.basename( item, opts.tmplExtension ) ] = res[ index ];
                            return acc;
                        }, [] ) );
                    })
                    .catch( function( err ) {
                        console.error( 'Error globbing for templates', err );
                    });

            });

        });
    }


    /**
     * Buffer the file through hogan
     */
    return through.obj( function( file, enc, cb ) {

        // Grab partials from source and compile
        getPartials( opts.tmplPath )
            .then( function( partials ) {

                var tmpl = hogan.compile( file.contents.toString() );
                file.contents = new Buffer( tmpl.render( opts.data, partials ) );

                cb( null, file );
            })
            .catch( function( err ) {
                console.error( new gutil.PluginError( 'Error generating templates', err ) );
            });
    });
};
