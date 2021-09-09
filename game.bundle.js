// Audio, Vector functions (subtract, distance, angle), and animations removed from bundle as they are unused

(function () {
  'use strict';

  /**
   * A simple event system. Allows you to hook into Kontra lifecycle events or create your own, such as for [Plugins](api/plugin).
   *
   * ```js
   * import { on, off, emit } from 'kontra';
   *
   * function callback(a, b, c) {
   *   console.log({a, b, c});
   * });
   *
   * on('myEvent', callback);
   * emit('myEvent', 1, 2, 3);  //=> {a: 1, b: 2, c: 3}
   * off('myEvent', callback);
   * ```
   * @sectionName Events
   */

  // expose for testing
  let callbacks = {};

  /**
   * Call all callback functions for the event. All arguments will be passed to the callback functions.
   * @function emit
   *
   * @param {String} event - Name of the event.
   * @param {...*} args - Comma separated list of arguments passed to all callbacks.
   */
  function emit(event, ...args) {
    (callbacks[event] || []).map(fn => fn(...args));
  }

  /**
   * Functions for initializing the Kontra library and getting the canvas and context
   * objects.
   *
   * ```js
   * import { getCanvas, getContext, init } from 'kontra';
   *
   * let { canvas, context } = init();
   *
   * // or can get canvas and context through functions
   * canvas = getCanvas();
   * context = getContext();
   * ```
   * @sectionName Core
   */

  let canvasEl, context;

  /**
   * Return the context object.
   * @function getContext
   *
   * @returns {CanvasRenderingContext2D} The context object the game draws to.
   */
  function getContext() {
    return context;
  }

  /**
   * Initialize the library and set up the canvas. Typically you will call `init()` as the first thing and give it the canvas to use. This will allow all Kontra objects to reference the canvas when created.
   *
   * ```js
   * import { init } from 'kontra';
   *
   * let { canvas, context } = init('game');
   * ```
   * @function init
   *
   * @param {String|HTMLCanvasElement} [canvas] - The canvas for Kontra to use. Can either be the ID of the canvas element or the canvas element itself. Defaults to using the first canvas element on the page.
   *
   * @returns {{canvas: HTMLCanvasElement, context: CanvasRenderingContext2D}} An object with properties `canvas` and `context`. `canvas` it the canvas element for the game and `context` is the context object the game draws to.
   */
  function init(canvas) {

    // check if canvas is a string first, an element next, or default to getting
    // first canvas on page
    canvasEl = document.getElementById(canvas) ||
               canvas ||
               document.querySelector('canvas');

    // @ifdef DEBUG
    if (!canvasEl) {
      throw Error('You must provide a canvas element for the game');
    }
    // @endif

    context = canvasEl.getContext('2d');
    context.imageSmoothingEnabled = false;

    emit('init');

    return { canvas: canvasEl, context };
  }

  /**
   * A promise based asset loader for loading images, audio, and data files. An `assetLoaded` event is emitted after each asset is fully loaded. The callback for the event is passed the asset and the url to the asset as parameters.
   *
   * ```js
   * import { load, on } from 'kontra';
   *
   * let numAssets = 3;
   * let assetsLoaded = 0;
   * on('assetLoaded', (asset, url) => {
   *   assetsLoaded++;
   *
   *   // inform user or update progress bar
   * });
   *
   * load(
   *   'assets/imgs/character.png',
   *   'assets/data/tile_engine_basic.json',
   *   ['/audio/music.ogg', '/audio/music.mp3']
   * ).then(function(assets) {
   *   // all assets have loaded
   * }).catch(function(err) {
   *   // error loading an asset
   * });
   * ```
   * @sectionName Assets
   */

  let imageRegex = /(jpeg|jpg|gif|png)$/;
  let leadingSlash = /^\//;
  let trailingSlash = /\/$/;
  let dataMap = new WeakMap();

  let imagePath = '';
  let dataPath = '';

  /**
   * Get the full URL from the base.
   *
   * @param {String} url - The URL to the asset.
   * @param {String} base - Base URL.
   *
   * @returns {String}
   */
  function getUrl(url, base) {
    return new URL(url, base).href;
  }

  /**
   * Join a base path and asset path.
   *
   * @param {String} base - The asset base path.
   * @param {String} url - The URL to the asset.
   *
   * @returns {String}
   */
  function joinPath(base, url) {
    return [base.replace(trailingSlash, ''), base ? url.replace(leadingSlash, '') : url]
      .filter(s => s)
      .join('/')
  }

  /**
   * Get the extension of an asset.
   *
   * @param {String} url - The URL to the asset.
   *
   * @returns {String}
   */
  function getExtension(url) {
    return url.split('.').pop();
  }

  /**
   * Get the name of an asset.
   *
   * @param {String} url - The URL to the asset.
   *
   * @returns {String}
   */
  function getName(url) {
    let name = url.replace('.' + getExtension(url), '');

    // remove leading slash if there is no folder in the path
    // @see https://stackoverflow.com/a/50592629/2124254
    return name.split('/').length == 2 ? name.replace(leadingSlash, '') : name;
  }

  /**
   * Object of all loaded image assets by both file name and path. If the base [image path](api/assets#setImagePath) was set before the image was loaded, the file name and path will not include the base image path.
   *
   * ```js
   * import { load, setImagePath, imageAssets } from 'kontra';
   *
   * load('assets/imgs/character.png').then(function() {
   *   // Image asset can be accessed by both
   *   // name: imageAssets['assets/imgs/character']
   *   // path: imageAssets['assets/imgs/character.png']
   * });
   *
   * setImagePath('assets/imgs');
   * load('character_walk_sheet.png').then(function() {
   *   // Image asset can be accessed by both
   *   // name: imageAssets['character_walk_sheet']
   *   // path: imageAssets['character_walk_sheet.png']
   * });
   * ```
   * @property {{[name: String]: HTMLImageElement}} imageAssets
   */
  let imageAssets = {};

  /**
   * Object of all loaded data assets by both file name and path. If the base [data path](api/assets#setDataPath) was set before the data was loaded, the file name and path will not include the base data path.
   *
   * ```js
   * import { load, setDataPath, dataAssets } from 'kontra';
   *
   * load('assets/data/file.txt').then(function() {
   *   // Audio asset can be accessed by both
   *   // name: dataAssets['assets/data/file']
   *   // path: dataAssets['assets/data/file.txt']
   * });
   *
   * setDataPath('assets/data');
   * load('info.json').then(function() {
   *   // Audio asset can be accessed by both
   *   // name: dataAssets['info']
   *   // path: dataAssets['info.json']
   * });
   * ```
   * @property {{[name: String]: any}} dataAssets
   */
  let dataAssets = {};

  /**
   * Add a global kontra object so TileEngine can access information about the
   * loaded assets when kontra is loaded in parts rather than as a whole (e.g.
   * `import { load, TileEngine } from 'kontra';`)
   */
  function addGlobal() {
    if (!window.__k) {
      window.__k = {
        dm: dataMap,
        u: getUrl,
        d: dataAssets,
        i: imageAssets
      };
    }
  }

  /**
   * Sets the base path for all image assets. If a base path is set, all load calls for image assets will prepend the base path to the URL.
   *
   * ```js
   * import { setImagePath, load } from 'kontra';
   *
   * setImagePath('/imgs');
   * load('character.png');  // loads '/imgs/character.png'
   * ```
   * @function setImagePath
   *
   * @param {String} path - Base image path.
   */
  function setImagePath(path) {
    imagePath = path;
  }

  /**
   * Load a single Image asset. Uses the base [image path](api/assets#setImagePath) to resolve the URL.
   *
   * Once loaded, the asset will be accessible on the the [imageAssets](api/assets#imageAssets) property.
   *
   * ```js
   * import { loadImage } from 'kontra';
   *
   * loadImage('car.png').then(function(image) {
   *   console.log(image.src);  //=> 'car.png'
   * })
   * ```
   * @function loadImage
   *
   * @param {String} url - The URL to the Image file.
   *
   * @returns {Promise<HTMLImageElement>} A deferred promise. Promise resolves with the Image.
   */
  function loadImage(url) {
    addGlobal();

    return new Promise((resolve, reject) => {
      let resolvedUrl, image, fullUrl;

      resolvedUrl = joinPath(imagePath, url);
      if (imageAssets[resolvedUrl]) return resolve(imageAssets[resolvedUrl]);

      image = new Image();

      image.onload = function loadImageOnLoad() {
        fullUrl = getUrl(resolvedUrl, window.location.href);
        imageAssets[ getName(url) ] = imageAssets[resolvedUrl] = imageAssets[fullUrl] = this;
        emit('assetLoaded', this, url);
        resolve(this);
      };

      image.onerror = function loadImageOnError() {
        reject(/* @ifdef DEBUG */ 'Unable to load image ' + /* @endif */ resolvedUrl);
      };

      image.src = resolvedUrl;
    });
  }

  /**
   * Load a single Data asset. Uses the base [data path](api/assets#setDataPath) to resolve the URL.
   *
   * Once loaded, the asset will be accessible on the the [dataAssets](api/assets#dataAssets) property.
   *
   * ```js
   * import { loadData } from 'kontra';
   *
   * loadData('assets/data/tile_engine_basic.json').then(function(data) {
   *   // data contains the parsed JSON data
   * })
   * ```
   * @function loadData
   *
   * @param {String} url - The URL to the Data file.
   *
   * @returns {Promise} A deferred promise. Promise resolves with the contents of the file. If the file is a JSON file, the contents will be parsed as JSON.
   */
  function loadData(url) {
    addGlobal();
    let resolvedUrl, fullUrl;

    resolvedUrl = joinPath(dataPath, url);
    if (dataAssets[resolvedUrl]) return Promise.resolve(dataAssets[resolvedUrl]);

    return fetch(resolvedUrl).then(response => {
      if (!response.ok) throw response;
      return response.clone().json().catch(() => response.text())
    }).then(response => {
      fullUrl = getUrl(resolvedUrl, window.location.href);
      if (typeof response === 'object') {
        dataMap.set(response, fullUrl);
      }

      dataAssets[ getName(url) ] = dataAssets[resolvedUrl] = dataAssets[fullUrl] = response;
      emit('assetLoaded', response, url);
      return response;
    });
  }

  /**
   * Load Image, Audio, or data files. Uses the [loadImage](api/assets#loadImage), [loadAudio](api/assets#loadAudio), and [loadData](api/assets#loadData) functions to load each asset type.
   *
   * ```js
   * import { load } from 'kontra';
   *
   * load(
   *   'assets/imgs/character.png',
   *   'assets/data/tile_engine_basic.json',
   *   ['/audio/music.ogg', '/audio/music.mp3']
   * ).then(function(assets) {
   *   // all assets have loaded
   * }).catch(function(err) {
   *   // error loading an asset
   * });
   * ```
   * @function load
   *
   * @param {...String[]} urls - Comma separated list of asset urls to load.
   *
   * @returns {Promise<any[]>} A deferred promise. Resolves with all the loaded assets.
   */
  function load(...urls) {
    addGlobal();

    return Promise.all(
      urls.map(asset => {
        // account for a string or an array for the url
        let extension = getExtension( [].concat(asset)[0] );

        return extension.match(imageRegex)
          ? loadImage(asset)
            : loadData(asset);
      })
    );
  }

  /**
   * Rotate a point by an angle.
   * @function rotatePoint
   *
   * @param {{x: Number, y: Number}} point - The {x,y} point to rotate.
   * @param {Number} angle - Angle (in radians) to rotate.
   *
   * @returns {{x: Number, y: Number}} The new x and y coordinates after rotation.
   */
  function rotatePoint(point, angle) {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);
    let x = point.x * cos - point.y * sin;
    let y = point.x * sin + point.y * cos;

    return {x, y};
  }

  /**
   * Return a random integer between a minimum (inclusive) and maximum (inclusive) integer.
   * @see https://stackoverflow.com/a/1527820/2124254
   * @function randInt
   *
   * @param {Number} min - Min integer.
   * @param {Number} max - Max integer.
   *
   * @returns {Number} Random integer between min and max values.
   */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Clamp a number between two values, preventing it from going below or above the minimum and maximum values.
   * @function clamp
   *
   * @param {Number} min - Min value.
   * @param {Number} max - Max value.
   * @param {Number} value - Value to clamp.
   *
   * @returns {Number} Value clamped between min and max.
   */
  function clamp(min, max, value) {
    return Math.min( Math.max(min, value), max );
  }

  /**
   * A simple 2d vector object.
   *
   * ```js
   * import { Vector } from 'kontra';
   *
   * let vector = Vector(100, 200);
   * ```
   * @class Vector
   *
   * @param {Number} [x=0] - X coordinate of the vector.
   * @param {Number} [y=0] - Y coordinate of the vector.
   */
  class Vector {
    constructor(x = 0, y = 0, vec = {}) {
      this.x = x;
      this.y = y;

      // @ifdef VECTOR_CLAMP
      // preserve vector clamping when creating new vectors
      if (vec._c) {
        this.clamp(vec._a, vec._b, vec._d, vec._e);

        // reset x and y so clamping takes effect
        this.x = x;
        this.y = y;
      }
      // @endif
    }

    /**
     * Calculate the addition of the current vector with the given vector.
     * @memberof Vector
     * @function add
     *
     * @param {Vector|{x: number, y: number}} vector - Vector to add to the current Vector.
     *
     * @returns {Vector} A new Vector instance whose value is the addition of the two vectors.
     */
    add(vec) {
      return new Vector(
        this.x + vec.x,
        this.y + vec.y,
        this
      );
    }

    // @ifdef VECTOR_SCALE
    /**
     * Calculate the multiple of the current vector by a value.
     * @memberof Vector
     * @function scale
     *
     * @param {Number} value - Value to scale the current Vector.
     *
     * @returns {Vector} A new Vector instance whose value is multiplied by the scalar.
     */
    scale(value) {
      return new Vector(
        this.x * value,
        this.y * value
      );
    }
    // @endif

    // @ifdef VECTOR_NORMALIZE
    /**
     * Calculate the normalized value of the current vector. Requires the Vector [length](api/vector#length) function.
     * @memberof Vector
     * @function normalize
     *
     * @returns {Vector} A new Vector instance whose value is the normalized vector.
     */
    // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#use-placeholder-arguments-instead-of-var
    normalize(length = this.length()) {
      return new Vector(
        this.x / length,
        this.y / length
      );
    }
    // @endif

    // @ifdef VECTOR_DOT||VECTOR_ANGLE
    /**
     * Calculate the dot product of the current vector with the given vector.
     * @memberof Vector
     * @function dot
     *
     * @param {Vector|{x: number, y: number}} vector - Vector to dot product against.
     *
     * @returns {Number} The dot product of the vectors.
     */
    dot(vec) {
      return this.x * vec.x + this.y * vec.y;
    }
    // @endif

    // @ifdef VECTOR_LENGTH||VECTOR_NORMALIZE||VECTOR_ANGLE
    /**
     * Calculate the length (magnitude) of the Vector.
     * @memberof Vector
     * @function length
     *
     * @returns {Number} The length of the vector.
     */
    length() {
      return Math.hypot(this.x, this.y);
    }
    // @endif

    // @ifdef VECTOR_CLAMP
    /**
     * Clamp the Vector between two points, preventing `x` and `y` from going below or above the minimum and maximum values. Perfect for keeping a sprite from going outside the game boundaries.
     *
     * ```js
     * import { Vector } from 'kontra';
     *
     * let vector = Vector(100, 200);
     * vector.clamp(0, 0, 200, 300);
     *
     * vector.x += 200;
     * console.log(vector.x);  //=> 200
     *
     * vector.y -= 300;
     * console.log(vector.y);  //=> 0
     *
     * vector.add({x: -500, y: 500});
     * console.log(vector);    //=> {x: 0, y: 300}
     * ```
     * @memberof Vector
     * @function clamp
     *
     * @param {Number} xMin - Minimum x value.
     * @param {Number} yMin - Minimum y value.
     * @param {Number} xMax - Maximum x value.
     * @param {Number} yMax - Maximum y value.
     */
    clamp(xMin, yMin, xMax, yMax) {
      this._c = true;
      this._a = xMin;
      this._b = yMin;
      this._d = xMax;
      this._e = yMax;
    }

    /**
     * X coordinate of the vector.
     * @memberof Vector
     * @property {Number} x
     */
    get x() {
      return this._x;
    }

    /**
     * Y coordinate of the vector.
     * @memberof Vector
     * @property {Number} y
     */
    get y() {
      return this._y;
    }

    set x(value) {
      this._x = (this._c ? clamp(this._a, this._d, value) : value);
    }

    set y(value) {
      this._y = (this._c ? clamp(this._b, this._e, value) : value);
    }
    // @endif
  }

  function factory$1() {
    return new Vector(...arguments);
  }
  factory$1.prototype = Vector.prototype;
  factory$1.class = Vector;

  /**
   * This is a private class that is used just to help make the GameObject class more manageable and smaller.
   *
   * It maintains everything that can be changed in the update function:
   * position
   * velocity
   * acceleration
   * ttl
   */
  class Updatable {

    constructor(properties) {
      return this.init(properties);
    }

    init(properties = {}) {

      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The game objects position vector. Represents the local position of the object as opposed to the [world](api/gameObject#world) position.
       * @property {Vector} position
       * @memberof GameObject
       * @page GameObject
       */
      this.position = factory$1();

      // --------------------------------------------------
      // optionals
      // --------------------------------------------------

      // @ifdef GAMEOBJECT_VELOCITY
      /**
       * The game objects velocity vector.
       * @memberof GameObject
       * @property {Vector} velocity
       * @page GameObject
       */
      this.velocity = factory$1();
      // @endif

      // @ifdef GAMEOBJECT_ACCELERATION
      /**
       * The game objects acceleration vector.
       * @memberof GameObject
       * @property {Vector} acceleration
       * @page GameObject
       */
      this.acceleration = factory$1();
      // @endif

      // @ifdef GAMEOBJECT_TTL
      /**
       * How may frames the game object should be alive.
       * @memberof GameObject
       * @property {Number} ttl
       * @page GameObject
       */
      this.ttl = Infinity;
      // @endif

      // add all properties to the object, overriding any defaults
      Object.assign(this, properties);
    }

    /**
     * Update the position of the game object and all children using their velocity and acceleration. Calls the game objects [advance()](api/gameObject#advance) function.
     * @memberof GameObject
     * @function update
     * @page GameObject
     *
     * @param {Number} [dt] - Time since last update.
     */
    update(dt) {
      this.advance(dt);
    }

    /**
     * Move the game object by its acceleration and velocity. If you pass `dt` it will multiply the vector and acceleration by that number. This means the `dx`, `dy`, `ddx` and `ddy` should be the how far you want the object to move in 1 second rather than in 1 frame.
     *
     * If you override the game objects [update()](api/gameObject#update) function with your own update function, you can call this function to move the game object normally.
     *
     * ```js
     * import { GameObject } from 'kontra';
     *
     * let gameObject = GameObject({
     *   x: 100,
     *   y: 200,
     *   width: 20,
     *   height: 40,
     *   dx: 5,
     *   dy: 2,
     *   update: function() {
     *     // move the game object normally
     *     this.advance();
     *
     *     // change the velocity at the edges of the canvas
     *     if (this.x < 0 ||
     *         this.x + this.width > this.context.canvas.width) {
     *       this.dx = -this.dx;
     *     }
     *     if (this.y < 0 ||
     *         this.y + this.height > this.context.canvas.height) {
     *       this.dy = -this.dy;
     *     }
     *   }
     * });
     * ```
     * @memberof GameObject
     * @function advance
     * @page GameObject
     *
     * @param {Number} [dt] - Time since last update.
     *
     */
    advance(dt) {
      // @ifdef GAMEOBJECT_VELOCITY
      // @ifdef GAMEOBJECT_ACCELERATION
      let acceleration = this.acceleration;

      // @ifdef VECTOR_SCALE
      if (dt) {
        acceleration = acceleration.scale(dt);
      }
      // @endif

      this.velocity = this.velocity.add(acceleration);
      // @endif
      // @endif

      // @ifdef GAMEOBJECT_VELOCITY
      let velocity = this.velocity;

      // @ifdef VECTOR_SCALE
      if (dt) {
        velocity = velocity.scale(dt);
      }
      // @endif

      this.position = this.position.add(velocity);
      this._pc();
      // @endif

      // @ifdef GAMEOBJECT_TTL
      this.ttl--;
      // @endif
    }

    // --------------------------------------------------
    // velocity
    // --------------------------------------------------

    // @ifdef GAMEOBJECT_VELOCITY
    /**
     * X coordinate of the velocity vector.
     * @memberof GameObject
     * @property {Number} dx
     * @page GameObject
     */
    get dx() {
      return this.velocity.x;
    }

    /**
     * Y coordinate of the velocity vector.
     * @memberof GameObject
     * @property {Number} dy
     * @page GameObject
     */
    get dy() {
      return this.velocity.y;
    }

    set dx(value) {
      this.velocity.x = value;
    }

    set dy(value) {
      this.velocity.y = value;
    }
    // @endif

    // --------------------------------------------------
    // acceleration
    // --------------------------------------------------

    // @ifdef GAMEOBJECT_ACCELERATION
    /**
     * X coordinate of the acceleration vector.
     * @memberof GameObject
     * @property {Number} ddx
     * @page GameObject
     */
    get ddx() {
      return this.acceleration.x;
    }

    /**
     * Y coordinate of the acceleration vector.
     * @memberof GameObject
     * @property {Number} ddy
     * @page GameObject
     */
    get ddy() {
      return this.acceleration.y;
    }

    set ddx(value) {
      this.acceleration.x = value;
    }

    set ddy(value) {
      this.acceleration.y = value;
    }
    // @endif

    // --------------------------------------------------
    // ttl
    // --------------------------------------------------

    // @ifdef GAMEOBJECT_TTL
    /**
     * Check if the game object is alive.
     * @memberof GameObject
     * @function isAlive
     * @page GameObject
     *
     * @returns {Boolean} `true` if the game objects [ttl](api/gameObject#ttl) property is above `0`, `false` otherwise.
     */
    isAlive() {
      return this.ttl > 0;
    }
    // @endif

    _pc() {}
  }

  // noop function
  let noop = () => {};

  /**
   * The base class of most renderable classes. Handles things such as position, rotation, anchor, and the update and render life cycle.
   *
   * Typically you don't create a GameObject directly, but rather extend it for new classes.
   * @class GameObject
   *
   * @param {Object} [properties] - Properties of the game object.
   * @param {Number} [properties.x] - X coordinate of the position vector.
   * @param {Number} [properties.y] - Y coordinate of the position vector.
   * @param {Number} [properties.width] - Width of the game object.
   * @param {Number} [properties.height] - Height of the game object.
   *
   * @param {CanvasRenderingContext2D} [properties.context] - The context the game object should draw to. Defaults to [core.getContext()](api/core#getContext).
   *
   * @param {Number} [properties.dx] - X coordinate of the velocity vector.
   * @param {Number} [properties.dy] - Y coordinate of the velocity vector.
   * @param {Number} [properties.ddx] - X coordinate of the acceleration vector.
   * @param {Number} [properties.ddy] - Y coordinate of the acceleration vector.
   * @param {Number} [properties.ttl=Infinity] - How many frames the game object should be alive. Used by [Pool](api/pool).
   *
   * @param {{x: number, y: number}} [properties.anchor={x:0,y:0}] - The x and y origin of the game object. {x:0, y:0} is the top left corner of the game object, {x:1, y:1} is the bottom right corner.
   * @param {Number} [properties.sx=0] - The x camera position.
   * @param {Number} [properties.sy=0] - The y camera position.
   * @param {GameObject[]} [properties.children] - Children to add to the game object.
   * @param {Number} [properties.opacity=1] - The opacity of the game object.
   * @param {Number} [properties.rotation=0] - The rotation around the anchor in radians.
   * @param {Number} [properties.scaleX=1] - The x scale of the game object.
   * @param {Number} [properties.scaleY=1] - The y scale of the game object.
   *
   * @param {(dt?: number) => void} [properties.update] - Function called every frame to update the game object.
   * @param {Function} [properties.render] - Function called every frame to render the game object.
   *
   * @param {...*} properties.props - Any additional properties you need added to the game object. For example, if you pass `gameObject({type: 'player'})` then the game object will also have a property of the same name and value. You can pass as many additional properties as you want.
   */
  class GameObject extends Updatable {
    /**
     * @docs docs/api_docs/gameObject.js
     */

    /**
     * Use this function to reinitialize a game object. It takes the same properties object as the constructor. Useful it you want to repurpose a game object.
     * @memberof GameObject
     * @function init
     *
     * @param {Object} properties - Properties of the game object.
     */
    init({

      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The width of the game object. Represents the local width of the object as opposed to the [world](api/gameObject#world) width.
       * @memberof GameObject
       * @property {Number} width
       */
      width = 0,

      /**
       * The height of the game object. Represents the local height of the object as opposed to the [world](api/gameObject#world) height.
       * @memberof GameObject
       * @property {Number} height
       */
      height = 0,

      /**
       * The context the game object will draw to.
       * @memberof GameObject
       * @property {CanvasRenderingContext2D} context
       */
      context = getContext(),

      render = this.draw,
      update = this.advance,

      // --------------------------------------------------
      // optionals
      // --------------------------------------------------

      // @ifdef GAMEOBJECT_GROUP
      /**
       * The game objects parent object.
       * @memberof GameObject
       * @property {GameObject|null} parent
       */

      /**
       * The game objects children objects.
       * @memberof GameObject
       * @property {GameObject[]} children
       */
      children = [],
      // @endif

      // @ifdef GAMEOBJECT_ANCHOR
      /**
       * The x and y origin of the game object. {x:0, y:0} is the top left corner of the game object, {x:1, y:1} is the bottom right corner.
       * @memberof GameObject
       * @property {{x: number, y: number}} anchor
       *
       * @example
       * // exclude-code:start
       * let { GameObject } = kontra;
       * // exclude-code:end
       * // exclude-script:start
       * import { GameObject } from 'kontra';
       * // exclude-script:end
       *
       * let gameObject = GameObject({
       *   x: 150,
       *   y: 100,
       *   width: 50,
       *   height: 50,
       *   color: 'red',
       *   // exclude-code:start
       *   context: context,
       *   // exclude-code:end
       *   render: function() {
       *     this.context.fillStyle = this.color;
       *     this.context.fillRect(0, 0, this.height, this.width);
       *   }
       * });
       *
       * function drawOrigin(gameObject) {
       *   gameObject.context.fillStyle = 'yellow';
       *   gameObject.context.beginPath();
       *   gameObject.context.arc(gameObject.x, gameObject.y, 3, 0, 2*Math.PI);
       *   gameObject.context.fill();
       * }
       *
       * gameObject.render();
       * drawOrigin(gameObject);
       *
       * gameObject.anchor = {x: 0.5, y: 0.5};
       * gameObject.x = 300;
       * gameObject.render();
       * drawOrigin(gameObject);
       *
       * gameObject.anchor = {x: 1, y: 1};
       * gameObject.x = 450;
       * gameObject.render();
       * drawOrigin(gameObject);
       */
      anchor = {x: 0, y: 0},
      // @endif

      // @ifdef GAMEOBJECT_CAMERA
      /**
       * The X coordinate of the camera.
       * @memberof GameObject
       * @property {Number} sx
       */
      sx = 0,

      /**
       * The Y coordinate of the camera.
       * @memberof GameObject
       * @property {Number} sy
       */
      sy = 0,
      // @endif

      // @ifdef GAMEOBJECT_OPACITY
      /**
       * The opacity of the object. Represents the local opacity of the object as opposed to the [world](api/gameObject#world) opacity.
       * @memberof GameObject
       * @property {Number} opacity
       */
      opacity = 1,
      // @endif

      // @ifdef GAMEOBJECT_ROTATION
      /**
       * The rotation of the game object around the anchor in radians. Represents the local rotation of the object as opposed to the [world](api/gameObject#world) rotation.
       * @memberof GameObject
       * @property {Number} rotation
       */
      rotation = 0,
      // @endif

      // @ifdef GAMEOBJECT_SCALE
      /**
       * The x scale of the object. Represents the local x scale of the object as opposed to the [world](api/gameObject#world) x scale.
       * @memberof GameObject
       * @property {Number} scaleX
       */
      scaleX = 1,

      /**
       * The y scale of the object. Represents the local y scale of the object as opposed to the [world](api/gameObject#world) y scale.
       * @memberof GameObject
       * @property {Number} scaleY
       */
      scaleY = 1,
      // @endif

      ...props
    } = {}) {

      // @ifdef GAMEOBJECT_GROUP
      this.children = [];
      // @endif

      // by setting defaults to the parameters and passing them into
      // the init, we can ensure that a parent class can set overriding
      // defaults and the GameObject won't undo it (if we set
      // `this.width` then no parent could provide a default value for
      // width)
      super.init({
        width,
        height,
        context,

        // @ifdef GAMEOBJECT_ANCHOR
        anchor,
        // @endif

        // @ifdef GAMEOBJECT_CAMERA
        sx,
        sy,
        // @endif

        // @ifdef GAMEOBJECT_OPACITY
        opacity,
        // @endif

        // @ifdef GAMEOBJECT_ROTATION
        rotation,
        // @endif

        // @ifdef GAMEOBJECT_SCALE
        scaleX,
        scaleY,
        // @endif

        ...props
      });

      // di = done init
      this._di = true;
      this._uw();

      // @ifdef GAMEOBJECT_GROUP
      children.map(child => this.addChild(child));
      // @endif

      // rf = render function
      this._rf = render;

      // uf = update function
      this._uf = update;
    }

    /**
     * Update all children
     */
    update(dt) {
      this._uf(dt);

      // @ifdef GAMEOBJECT_GROUP
      this.children.map(child => child.update && child.update(dt));
      // @endif
    }

    /**
     * Render the game object and all children. Calls the game objects [draw()](api/gameObject#draw) function.
     * @memberof GameObject
     * @function render
     *
     * @param {Function} [filterObjects] - [Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) function which is used to filter which children to render.
     */
    render(filterObjects) {
      let context = this.context;
      context.save();

      // 1) translate to position
      //
      // it's faster to only translate if one of the values is non-zero
      // rather than always translating
      // @see https://jsperf.com/translate-or-if-statement/2
      if (this.x || this.y) {
        context.translate(this.x, this.y);
      }

      // @ifdef GAMEOBJECT_ROTATION
      // 2) rotate around the anchor
      //
      // it's faster to only rotate when set rather than always rotating
      // @see https://jsperf.com/rotate-or-if-statement/2
      if (this.rotation) {
        context.rotate(this.rotation);
      }
      // @endif

      // @ifdef GAMEOBJECT_CAMERA
      // 3) translate to the camera position after rotation so camera
      // values are in the direction of the rotation rather than always
      // along the x/y axis
      if (this.sx || this.sy) {
        context.translate(-this.sx, -this.sy);
      }
      // @endif

      // @ifdef GAMEOBJECT_SCALE
      // 4) scale after translation to position so object can be
      // scaled in place (rather than scaling position as well).
      //
      // it's faster to only scale if one of the values is not 1
      // rather than always scaling
      // @see https://jsperf.com/scale-or-if-statement/4
      if (this.scaleX != 1 || this.scaleY != 1) {
        context.scale(this.scaleX, this.scaleY);
      }
      // @endif

      // @ifdef GAMEOBJECT_ANCHOR
      // 5) translate to the anchor so (0,0) is the top left corner
      // for the render function
      let anchorX = -this.width * this.anchor.x;
      let anchorY = -this.height * this.anchor.y;

      if (anchorX || anchorY) {
        context.translate(anchorX, anchorY);
      }
      // @endif

      // @ifdef GAMEOBJECT_OPACITY
      // it's not really any faster to gate the global alpha
      // @see https://jsperf.com/global-alpha-or-if-statement/1
      this.context.globalAlpha = this.opacity;
      // @endif

      this._rf();

      // @ifdef GAMEOBJECT_ANCHOR
      // 7) translate back to the anchor so children use the correct
      // x/y value from the anchor
      if (anchorX || anchorY) {
        context.translate(-anchorX, -anchorY);
      }
      // @endif

      // @ifdef GAMEOBJECT_GROUP
      // perform all transforms on the parent before rendering the children
      let children = this.children;
      if (filterObjects) {
        children = children.filter(filterObjects);
      }
      children.map(child => child.render && child.render());
      // @endif

      context.restore();
    }

    /**
     * Draw the game object at its X and Y position, taking into account rotation, scale, and anchor.
     *
     * Do note that the canvas has been rotated and translated to the objects position (taking into account anchor), so {0,0} will be the top-left corner of the game object when drawing.
     *
     * If you override the game objects `render()` function with your own render function, you can call this function to draw the game object normally.
     *
     * ```js
     * let { GameObject } = kontra;
     *
     * let gameObject = GameObject({
     *  x: 290,
     *  y: 80,
     *  width: 20,
     *  height: 40,
     *
     *  render: function() {
     *    // draw the game object normally (perform rotation and other transforms)
     *    this.draw();
     *
     *    // outline the game object
     *    this.context.strokeStyle = 'yellow';
     *    this.context.lineWidth = 2;
     *    this.context.strokeRect(0, 0, this.width, this.height);
     *  }
     * });
     *
     * gameObject.render();
     * ```
     * @memberof GameObject
     * @function draw
     */
    draw() {}

    /**
     * Sync property changes from the parent to the child
     */
    _pc(prop, value) {
      this._uw();

      // @ifdef GAMEOBJECT_GROUP
      this.children.map(child => child._pc());
      // @endif
    }

    /**
     * X coordinate of the position vector.
     * @memberof GameObject
     * @property {Number} x
     */
    get x() {
      return this.position.x;
    }

    /**
     * Y coordinate of the position vector.
     * @memberof GameObject
     * @property {Number} y
     */
    get y() {
      return this.position.y;
    }

    set x(value) {
      this.position.x = value;

      // pc = property changed
      this._pc();
    }

    set y(value) {
      this.position.y = value;
      this._pc();
    }

    get width() {
      // w = width
      return this._w;
    }

    set width(value) {
      this._w = value;
      this._pc();
    }

    get height() {
      // h = height
      return this._h;
    }

    set height(value) {
      this._h = value;
      this._pc();
    }

    /**
     * Update world properties
     */
    _uw() {
      // don't update world properties until after the init has finished
      if (!this._di) return;

      // @ifdef GAMEOBJECT_GROUP||GAMEOBJECT_OPACITY||GAMEOBJECT_ROTATION||GAMEOBJECT_SCALE
      let {
        _wx = 0,
        _wy = 0,

        // @ifdef GAMEOBJECT_OPACITY
        _wo = 1,
        // @endif

        // @ifdef GAMEOBJECT_ROTATION
        _wr = 0,
        // @endif

        // @ifdef GAMEOBJECT_SCALE
        _wsx = 1,
        _wsy = 1
        // @endif
      } = (this.parent || {});
      // @endif

      // wx = world x, wy = world y
      this._wx = this.x;
      this._wy = this.y;

      // ww = world width, wh = world height
      this._ww = this.width;
      this._wh = this.height;

      // @ifdef GAMEOBJECT_OPACITY
      // wo = world opacity
      this._wo = _wo * this.opacity;
      // @endif

      // @ifdef GAMEOBJECT_ROTATION
      // wr = world rotation
      this._wr = _wr + this.rotation;

      let {x, y} = rotatePoint({x: this.x, y: this.y}, _wr);
      this._wx = x;
      this._wy = y;
      // @endif

      // @ifdef GAMEOBJECT_SCALE
      // wsx = world scale x, wsy = world scale y
      this._wsx = _wsx * this.scaleX;
      this._wsy = _wsy * this.scaleY;

      this._wx = this.x * _wsx;
      this._wy = this.y * _wsy;
      this._ww = this.width * this._wsx;
      this._wh = this.height * this._wsy;
      // @endif

      // @ifdef GAMEOBJECT_GROUP
      this._wx += _wx;
      this._wy += _wy;
      // @endif
    }

    /**
     * The world position, width, height, opacity, rotation, and scale. The world property is the true position, width, height, etc. of the object, taking into account all parents.
     *
     * The world property does not adjust for anchor or scale, so if you set a negative scale the world width or height could be negative. Use [getWorldRect](/api/helpers#getWorldRect) to get the world position and size adjusted for anchor and scale.
     * @property {{x: number, y: number, width: number, height: number, opacity: number, rotation: number, scaleX: number, scaleY: number}} world
     * @memberof GameObject
     */
    get world() {
      return {
        x: this._wx,
        y: this._wy,
        width: this._ww,
        height: this._wh,

        // @ifdef GAMEOBJECT_OPACITY
        opacity: this._wo,
        // @endif

        // @ifdef GAMEOBJECT_ROTATION
        rotation: this._wr,
        // @endif

        // @ifdef GAMEOBJECT_SCALE
        scaleX: this._wsx,
        scaleY: this._wsy
        // @endif
      }
    }

    // --------------------------------------------------
    // group
    // --------------------------------------------------

    // @ifdef GAMEOBJECT_GROUP
    /**
     * Add an object as a child to this object. The childs [world](api/gameObject#world) property will be updated to take into account this object and all of its parents.
     * @memberof GameObject
     * @function addChild
     *
     * @param {GameObject} child - Object to add as a child.
     *
     * @example
     * // exclude-code:start
     * let { GameObject } = kontra;
     * // exclude-code:end
     * // exclude-script:start
     * import { GameObject } from 'kontra';
     * // exclude-script:end
     *
     * function createObject(x, y, color, size = 1) {
     *   return GameObject({
     *     x,
     *     y,
     *     width: 50 / size,
     *     height: 50 / size,
     *     anchor: {x: 0.5, y: 0.5},
     *     color,
     *     // exclude-code:start
     *     context: context,
     *     // exclude-code:end
     *     render: function() {
     *       this.context.fillStyle = this.color;
     *       this.context.fillRect(0, 0, this.height, this.width);
     *     }
     *   });
     * }
     *
     * let parent = createObject(300, 100, 'red');
     * let child = createObject(25, 25, 'yellow', 2);
     *
     * parent.addChild(child);
     *
     * parent.render();
     */
    addChild(child, { absolute = false } = {}) {
      this.children.push(child);
      child.parent = this;
      child._pc = child._pc || noop;
      child._pc();
    }

    /**
     * Remove an object as a child of this object. The removed objects [world](api/gameObject#world) property will be updated to not take into account this object and all of its parents.
     * @memberof GameObject
     * @function removeChild
     *
     * @param {GameObject} child - Object to remove as a child.
     */
    removeChild(child) {
      let index = this.children.indexOf(child);
      if (index !== -1) {
        this.children.splice(index, 1);
        child.parent = null;
        child._pc();
      }
    }
    // @endif

    // --------------------------------------------------
    // opacity
    // --------------------------------------------------

    // @ifdef GAMEOBJECT_OPACITY
    get opacity() {
      return this._opa;
    }

    set opacity(value) {
      this._opa = value;
      this._pc();
    }
    // @endif

    // --------------------------------------------------
    // rotation
    // --------------------------------------------------

    // @ifdef GAMEOBJECT_ROTATION
    get rotation() {
      return this._rot;
    }

    set rotation(value) {
      this._rot = value;
      this._pc();
    }
    // @endif

    // --------------------------------------------------
    // scale
    // --------------------------------------------------

    // @ifdef GAMEOBJECT_SCALE
    /**
     * Set the x and y scale of the object. If only one value is passed, both are set to the same value.
     * @memberof GameObject
     * @function setScale
     *
     * @param {Number} x - X scale value.
     * @param {Number} [y=x] - Y scale value.
     */
    setScale(x, y = x) {
      this.scaleX = x;
      this.scaleY = y;
    }

    get scaleX() {
      return this._scx;
    }

    set scaleX(value) {
      this._scx = value;
      this._pc();
    }

    get scaleY() {
      return this._scy;
    }

    set scaleY(value) {
      this._scy = value;
      this._pc();
    }
    // @endif
  }

  function factory$2() {
    return new GameObject(...arguments);
  }
  factory$2.prototype = GameObject.prototype;
  factory$2.class = GameObject;

  /**
   * A versatile way to update and draw your sprites. It can handle simple rectangles, images, and sprite sheet animations. It can be used for your main player object as well as tiny particles in a particle engine.
   * @class Sprite
   * @extends GameObject
   *
   * @param {Object} [properties] - Properties of the sprite.
   * @param {String} [properties.color] - Fill color for the game object if no image or animation is provided.
   * @param {HTMLImageElement|HTMLCanvasElement} [properties.image] - Use an image to draw the sprite.
   * @param {{[name: string] : Animation}} [properties.animations] - An object of [Animations](api/animation) from a [Spritesheet](api/spriteSheet) to animate the sprite.
   */
  class Sprite extends factory$2.class {
    /**
     * @docs docs/api_docs/sprite.js
     */

    init({
      /**
       * The color of the game object if it was passed as an argument.
       * @memberof Sprite
       * @property {String} color
       */

      // @ifdef SPRITE_IMAGE
      /**
       * The image the sprite will use when drawn if passed as an argument.
       * @memberof Sprite
       * @property {HTMLImageElement|HTMLCanvasElement} image
       */
      image,

      /**
       * The width of the sprite. If the sprite is a [rectangle sprite](api/sprite#rectangle-sprite), it uses the passed in value. For an [image sprite](api/sprite#image-sprite) it is the width of the image. And for an [animation sprite](api/sprite#animation-sprite) it is the width of a single frame of the animation.
       * @memberof Sprite
       * @property {Number} width
       */
      width = image ? image.width : undefined,

      /**
       * The height of the sprite. If the sprite is a [rectangle sprite](api/sprite#rectangle-sprite), it uses the passed in value. For an [image sprite](api/sprite#image-sprite) it is the height of the image. And for an [animation sprite](api/sprite#animation-sprite) it is the height of a single frame of the animation.
       * @memberof Sprite
       * @property {Number} height
       */
      height = image ? image.height : undefined,
      // @endif

      ...props
    } = {}) {
      super.init({
        // @ifdef SPRITE_IMAGE
        image,
        width,
        height,
        // @endif
        ...props
      });
    }

    draw() {
      // @ifdef SPRITE_IMAGE
      if (this.image) {
        this.context.drawImage(
          this.image,
          0, 0, this.image.width, this.image.height
        );
      }
      // @endif

      if (this.color) {
        this.context.fillStyle = this.color;
        this.context.fillRect(0, 0, this.width, this.height);
      }
    }
  }

  function factory$3() {
    return new Sprite(...arguments);
  }
  factory$3.prototype = Sprite.prototype;
  factory$3.class = Sprite;

  let fontSizeRegex = /(\d+)(\w+)/;

  function parseFont(font) {
    let match = font.match(fontSizeRegex);

    // coerce string to number
    // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#coercion-to-test-for-types
    let size = +match[1];
    let unit = match[2];
    let computed = size;

    // compute font size
    // switch(unit) {
    //   // px defaults to the size

    //   // em uses the size of the canvas when declared (but won't keep in sync with
    //   // changes to the canvas font-size)
    //   case 'em': {
    //     let fontSize = window.getComputedStyle(getCanvas()).fontSize;
    //     let parsedSize = parseFont(fontSize).size;
    //     computed = size * parsedSize;
    //   }

    //   // rem uses the size of the HTML element when declared (but won't keep in
    //   // sync with changes to the HTML element font-size)
    //   case 'rem': {
    //     let fontSize = window.getComputedStyle(document.documentElement).fontSize;
    //     let parsedSize = parseFont(fontSize).size;
    //     computed = size * parsedSize;
    //   }
    // }

    return {
      size,
      unit,
      computed
    };
  }

  /**
   * An object for drawing text to the screen. Supports newline characters as well as automatic new lines when setting the `width` property.
   *
   * You can also display RTL languages by setting the attribute `dir="rtl"` on the main canvas element. Due to the limited browser support for individual text to have RTL settings, it must be set globally for the entire game.
   *
   * @example
   * // exclude-code:start
   * let { Text } = kontra;
   * // exclude-code:end
   * // exclude-script:start
   * import { Text } from 'kontra';
   * // exclude-script:end
   *
   * let text = Text({
   *   text: 'Hello World!\nI can even be multiline!',
   *   font: '32px Arial',
   *   color: 'white',
   *   x: 300,
   *   y: 100,
   *   anchor: {x: 0.5, y: 0.5},
   *   textAlign: 'center'
   * });
   * // exclude-code:start
   * text.context = context;
   * // exclude-code:end
   *
   * text.render();
   * @class Text
   * @extends GameObject
   *
   * @param {Object} properties - Properties of the text.
   * @param {String} properties.text - The text to display.
   * @param {String} [properties.font] - The [font](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font) style. Defaults to the main context font.
   * @param {String} [properties.color] - Fill color for the text. Defaults to the main context fillStyle.
   * @param {Number} [properties.width] - Set a fixed width for the text. If set, the text will automatically be split into new lines that will fit the size when possible.
   * @param {String} [properties.textAlign='left'] - The [textAlign](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign) for the context. If the `dir` attribute is set to `rtl` on the main canvas, the text will automatically be aligned to the right, but you can override that by setting this property.
   * @param {Number} [properties.lineHeight=1] - The distance between two lines of text.
   */
  class Text extends factory$2.class {

    init({

      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The string of text. Use newline characters to create multi-line strings.
       * @memberof Text
       * @property {String} text
       */
      text = '',

      /**
       * The text alignment.
       * @memberof Text
       * @property {String} textAlign
       */
      textAlign = '',

      /**
       * The distance between two lines of text. The value is multiplied by the texts font size.
       * @memberof Text
       * @property {Number} lineHeight
       */
      lineHeight = 1,

     /**
      * The font style.
      * @memberof Text
      * @property {String} font
      */
      font = getContext().font,

      /**
       * The color of the text.
       * @memberof Text
       * @property {String} color
       */

       ...props
    } = {}) {
      // cast to string
      text = '' + text;

      super.init({
        text,
        textAlign,
        lineHeight,
        font,
        ...props
      });

      // p = prerender
      this._p();
    }

    // keep width and height getters/settings so we can set _w and _h and not
    // trigger infinite call loops
    get width() {
      // w = width
      return this._w;
    }

    set width(value) {
      // d = dirty
      this._d = true;
      this._w = value;

      // fw = fixed width
      this._fw = value;
    }

    get text() {
      return this._t;
    }

    set text(value) {
      this._d = true;
      this._t = value;
    }

    get font() {
      return this._f;
    }

    set font(value) {
      this._d = true;
      this._f = value;
      this._fs = parseFont(value).computed;
    }

    get lineHeight() {
      // lh = line height
      return this._lh;
    }

    set lineHeight(value) {
      this._d = true;
      this._lh = value;
    }

    render() {
      if (this._d) {
        this._p();
      }
      super.render();
    }

    /**
     * Calculate the font width, height, and text strings before rendering.
     */
    _p() {
      // s = strings
      this._s = [];
      this._d = false;
      let context = this.context;

      context.font = this.font;

      // @ifdef TEXT_AUTONEWLINE
      if (!this._s.length && this._fw) {
        let parts = this.text.split(' ');
        let start = 0;
        let i = 2;

        // split the string into lines that all fit within the fixed width
        for (; i <= parts.length; i++) {
          let str = parts.slice(start, i).join(' ');
          let width = context.measureText(str).width;

          if (width > this._fw) {
            this._s.push(parts.slice(start, i - 1).join(' '));
            start = i - 1;
          }
        }

        this._s.push(parts.slice(start, i).join(' '));
      }
      // @endif

      // @ifdef TEXT_NEWLINE
      if (!this._s.length && this.text.includes('\n')) {
        let width = 0;
        this.text.split('\n').map(str => {
          this._s.push(str);
          width = Math.max(width, context.measureText(str).width);
        });

        this._w = this._fw || width;
      }
      // @endif

      if (!this._s.length) {
        this._s.push(this.text);
        this._w = this._fw || context.measureText(this.text).width;
      }

      this.height = this._fs + ((this._s.length - 1) * this._fs * this.lineHeight);
      this._uw();
    }

    draw() {
      let alignX = 0;
      let textAlign = this.textAlign;
      let context = this.context;

      // @ifdef TEXT_RTL
      textAlign = this.textAlign || (context.canvas.dir === 'rtl' ? 'right' : 'left');
      // @endif

      // @ifdef TEXT_ALIGN||TEXT_RTL
      alignX = textAlign === 'right'
        ? this.width
        : textAlign === 'center'
          ? this.width / 2 | 0
          : 0;
      // @endif

      this._s.map((str, index) => {
        context.textBaseline = 'top';
        context.textAlign = textAlign;
        context.fillStyle = this.color;
        context.font = this.font;
        context.fillText(str, alignX, this._fs * this.lineHeight * index);
      });
    }
  }

  function factory$4() {
    return new Text(...arguments);
  }
  factory$4.prototype = Text.prototype;
  factory$4.class = Text;

  /**
   * Clear the canvas.
   */
  function clear(context) {
    let canvas = context.canvas;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * The game loop updates and renders the game every frame. The game loop is stopped by default and will not start until the loops `start()` function is called.
   *
   * The game loop uses a time-based animation with a fixed `dt` to [avoid frame rate issues](http://blog.sklambert.com/using-time-based-animation-implement/). Each update call is guaranteed to equal 1/60 of a second.
   *
   * This means that you can avoid having to do time based calculations in your update functions and instead do fixed updates.
   *
   * ```js
   * import { Sprite, GameLoop } from 'kontra';
   *
   * let sprite = Sprite({
   *   x: 100,
   *   y: 200,
   *   width: 20,
   *   height: 40,
   *   color: 'red'
   * });
   *
   * let loop = GameLoop({
   *   update: function(dt) {
   *     // no need to determine how many pixels you want to
   *     // move every second and multiple by dt
   *     // sprite.x += 180 * dt;
   *
   *     // instead just update by how many pixels you want
   *     // to move every frame and the loop will ensure 60FPS
   *     sprite.x += 3;
   *   },
   *   render: function() {
   *     sprite.render();
   *   }
   * });
   *
   * loop.start();
   * ```
   * @class GameLoop
   *
   * @param {Object} properties - Properties of the game loop.
   * @param {(dt: Number) => void} [properties.update] - Function called every frame to update the game. Is passed the fixed `dt` as a parameter.
   * @param {Function} properties.render - Function called every frame to render the game.
   * @param {Number}   [properties.fps=60] - Desired frame rate.
   * @param {Boolean}  [properties.clearCanvas=true] - Clear the canvas every frame before the `render()` function is called.
   * @param {CanvasRenderingContext2D} [properties.context] - The context that should be cleared each frame if `clearContext` is not set to `false`. Defaults to [core.getContext()](api/core#getContext).
   * @param {Boolean} [properties.blur=false] - If the loop should still update and render if the page does not have focus.
   */
  function GameLoop({
    fps = 60,
    clearCanvas = true,
    update = noop,
    render,
    context = getContext(),
    blur = false
  } = {}) {
    // check for required functions
    // @ifdef DEBUG
    if (!render) {
      throw Error('You must provide a render() function');
    }
    // @endif

    // animation variables
    let accumulator = 0;
    let delta = 1E3 / fps;  // delta between performance.now timings (in ms)
    let step = 1 / fps;
    let clearFn = clearCanvas ? clear : noop;
    let last, rAF, now, dt, loop;
    let focused = true;

    if (!blur) {
      window.addEventListener('focus', () => { focused = true; });
      window.addEventListener('blur', () => { focused = false; });
    }

    /**
     * Called every frame of the game loop.
     */
    function frame() {
      rAF = requestAnimationFrame(frame);

      // don't update the frame if tab isn't focused
      if (!focused) return;

      now = performance.now();
      dt = now - last;
      last = now;

      // prevent updating the game with a very large dt if the game were to lose focus
      // and then regain focus later
      if (dt > 1E3) {
        return;
      }

      emit('tick');
      accumulator += dt;

      while (accumulator >= delta) {
        loop.update(step);

        accumulator -= delta;
      }

      clearFn(context);
      loop.render();
    }

    // game loop object
    loop = {
      /**
       * Called every frame to update the game. Put all of your games update logic here.
       * @memberof GameLoop
       * @function update
       *
       * @param {Number} [dt] - The fixed dt time of 1/60 of a frame.
       */
      update,

      /**
       * Called every frame to render the game. Put all of your games render logic here.
       * @memberof GameLoop
       * @function render
       */
      render,

      /**
       * If the game loop is currently stopped.
       *
       * ```js
       * import { GameLoop } from 'kontra';
       *
       * let loop = GameLoop({
       *   // ...
       * });
       * console.log(loop.isStopped);  //=> true
       *
       * loop.start();
       * console.log(loop.isStopped);  //=> false
       *
       * loop.stop();
       * console.log(loop.isStopped);  //=> true
       * ```
       * @memberof GameLoop
       * @property {Boolean} isStopped
       */
      isStopped: true,

      /**
       * Start the game loop.
       * @memberof GameLoop
       * @function start
       */
      start() {
        last = performance.now();
        this.isStopped = false;
        requestAnimationFrame(frame);
      },

      /**
       * Stop the game loop.
       * @memberof GameLoop
       * @function stop
       */
      stop() {
        this.isStopped = true;
        cancelAnimationFrame(rAF);
      },

      // expose properties for testing
      // @ifdef DEBUG
      _frame: frame,
      set _last(value) {
        last = value;
      }
      // @endif
    };

    return loop;
  }

  /**
   * A minimalistic keyboard API. You can use it move the main sprite or respond to a key press.
   *
   * ```js
   * import { initKeys, keyPressed } from 'kontra';
   *
   * // this function must be called first before keyboard
   * // functions will work
   * initKeys();
   *
   * function update() {
   *   if (keyPressed('left')) {
   *     // move left
   *   }
   * }
   * ```
   * @sectionName Keyboard
   */

  /**
   * Below is a list of keys that are provided by default. If you need to extend this list, you can use the [keyMap](api/keyboard#keyMap) property.
   *
   * - a-z
   * - 0-9
   * - enter, esc, space, left, up, right, down
   * @sectionName Available Keys
   */

  let keydownCallbacks = {};
  let keyupCallbacks = {};
  let pressedKeys = {};

  /**
   * A map of [KeyboardEvent code values](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values) to key names. Add to this object to expand the list of [available keys](api/keyboard#available-keys).
   *
   * ```js
   * import { keyMap, bindKeys } from 'kontra';
   *
   * keyMap['ControlRight'] = 'ctrl';
   *
   * bindKeys('ctrl', function(e) {
   *   // handle ctrl key
   * });
   * ```
   * @property {{[key in (String|Number)]: string}} keyMap
   */
  let keyMap = {
    // named keys
    'Enter': 'enter',
    'Escape': 'esc',
    'Space': 'space',
    'ArrowLeft': 'left',
    'ArrowUp': 'up',
    'ArrowRight': 'right',
    'ArrowDown': 'down'
  };

  /**
   * Call the callback handler of an event.
   * @param {Function} callback
   * @param {KeyboardEvent} evt
   */
  function call(callback = noop, evt) {
    if (callback._pd) {
      evt.preventDefault();
    }
    callback(evt);
  }

  /**
   * Execute a function that corresponds to a keyboard key.
   *
   * @param {KeyboardEvent} evt
   */
  function keydownEventHandler(evt) {
    let key = keyMap[evt.code];
    let callback = keydownCallbacks[key];
    pressedKeys[key] = true;
    call(callback, evt);
  }

  /**
   * Set the released key to not being pressed.
   *
   * @param {KeyboardEvent} evt
   */
  function keyupEventHandler(evt) {
    let key = keyMap[evt.code];
    let callback = keyupCallbacks[key];
    pressedKeys[key] = false;
    call(callback, evt);
  }

  /**
   * Reset pressed keys.
   */
  function blurEventHandler$1() {
    pressedKeys = {};
  }

  /**
   * Initialize keyboard event listeners. This function must be called before using other keyboard functions.
   * @function initKeys
   */
  function initKeys() {
    let i;

    // alpha keys
    // @see https://stackoverflow.com/a/43095772/2124254
    for (i = 0; i < 26; i++) {
      // rollupjs considers this a side-effect (for now), so we'll do it in the
      // initKeys function
      keyMap[i + 65] = keyMap['Key' + String.fromCharCode(i + 65)] = String.fromCharCode(i + 97);
    }

    // numeric keys
    for (i = 0; i < 10; i++) {
      keyMap[48+i] = keyMap['Digit'+i] = ''+i;
    }

    window.addEventListener('keydown', keydownEventHandler);
    window.addEventListener('keyup', keyupEventHandler);
    window.addEventListener('blur', blurEventHandler$1);
  }

  /**
   * Check if a key is currently pressed. Use during an `update()` function to perform actions each frame.
   *
   * ```js
   * import { Sprite, initKeys, keyPressed } from 'kontra';
   *
   * initKeys();
   *
   * let sprite = Sprite({
   *   update: function() {
   *     if (keyPressed('left')){
   *       // left arrow pressed
   *     }
   *     else if (keyPressed('right')) {
   *       // right arrow pressed
   *     }
   *
   *     if (keyPressed('up')) {
   *       // up arrow pressed
   *     }
   *     else if (keyPressed('down')) {
   *       // down arrow pressed
   *     }
   *   }
   * });
   * ```
   * @function keyPressed
   *
   * @param {String} key - Key to check for pressed state.
   *
   * @returns {Boolean} `true` if the key is pressed, `false` otherwise.
   */
  function keyPressed(key) {
    return !!pressedKeys[key];
  }

  // let { init, Sprite, GameLoop, load, imageAssets, setImagePath, initKeys, keyPressed, randInt, rotatePoint, Text, Vector } = kontra (used when testing without a server, kontra library should be included as a source in index.html);

  init();
  initKeys();
  setImagePath('assets/img/');

  /*
  * Updates canvas by increasing the width and height based on player score
  * Return the size of the canvas
  */
  let updtCanvas = (score=0) => {
      let canvas = document.getElementById("game");
      canvas.height = canvas.width = Math.floor(160 * Math.min(score/100, 1))+160;

      return canvas.width;
  };

  /*
  * Obtains the vertices of a given object and accounts for any rotations
  * Used in the checkSAT function
  * Return an array of vertices of given object
  */
  let getV = obj => {
      let objX = obj.x;
      let objY = obj.y;
      let objHW = obj.width/2-2;
      let objHH = obj.height/2-2;
      let objR = obj.rotation;
      let objOP = [ rotatePoint({x: (objX - objHW - objX), y: (objY - objHH - objY)}, objR), 
                      rotatePoint({x: (objX + objHW - objX), y: (objY - objHH - objY)}, objR), 
                      rotatePoint({x: (objX - objHW - objX), y: (objY + objHH - objY)}, objR), 
                      rotatePoint({x: (objX + objHW - objX), y: (objY + objHH - objY)}, objR) ];

      let objV = [];
      for (let i=0; i<4; i++) {
          objV.push( {x: (objOP[i].x + objX), y: (objOP[i].y + objY)} );
      }
      return objV;
  };

  /*
  * A collision checker for two given objects that accounts for rotation
  * Uses the Separating Axis Theorem (SAT)
  * Return true for collision between two given objects, false otherwise
  */
  let checkSAT = (obj1, obj2) => {
      let obj1V = getV(obj1);

      // Loops through each edge of obj1
      for (let i=0; i<4; i++) {
          // Normalize the normal line of each edge to obtain the axis
          let axis = factory$1(-(obj1V[(i+1)%4].y - obj1V[i%4].y), (obj1V[(i+1)%4].x - obj1V[i%4].x));
          axis = axis.normalize();

          // Finds the min and max points on axis of obj1
          let obj1min = axis.dot(obj1V[0]);
          let obj1max = obj1min;
          for(let j=0; j<4; j++) {
              let vertex = axis.dot(obj1V[j]);
              obj1min = Math.min(obj1min, vertex);
              obj1max = Math.max(obj1max, vertex);
          }
          let obj2V = getV(obj2);

          // Finds the min and max points on axis of obj2
          let obj2min = axis.dot(obj2V[0]);
          let obj2max = obj2min;
          for(let j=0; j<4; j++) {
              let vertex = axis.dot(obj2V[j]);
              obj2min = Math.min(obj2min, vertex);
              obj2max = Math.max(obj2max, vertex);
          }        
          // Checks if min and max points of both objects overlap, returns true if there is no overlap
          if(obj1max < obj2min || obj1min > obj2max) {
              return true;
          }    }
      return false;
  };

  /*
  * A function called to start or restart (if gameOn) the game
  * Loads all assets required
  * Initializes and creates all game variables, sprite objects, and factories required
  * All game events occur within this function in the game loop
  */
  let gameStart = (gameOn = false) => {
      load('map-indexed.png', 'player.png', 'rock.png', 'fuel.png', 'earth.png', 'moon.png').then(
          () => {
              /*
              * rockArr: contains an array of individual rock objects for update and render purposes
              * fuel: keeps track of the fuel object
              * spawn: sets the spawn rate for rocks
              * gameSize: keeps track of the current map size
              */
              let rockArr = [];
              let fuel = null;
              let spawn = 60;
              let gameState = 0;
              let gameSize = updtCanvas();

              let bkgd = factory$3({
                  x: 0,
                  y: 0,
                  image: imageAssets['map-indexed']
              });

              // Text rendering for menu screen
              let mMenuTxt = factory$4({
                  anchor: {x: 0.5, y:0.5},
                  x: gameSize/2,
                  y: gameSize/2,
                  font: '14px Arial',
                  color: 'white',
                  text: "",
                  textAlign: 'center',
                  update: function() {
                      this.x = gameSize/2;
                      this.y = this.x;
                      if(gameState == 1) {
                          this.text = "You got hit\nENTER to restart";
                      } else if(!gameOn) {
                          this.text = "ENTER to start";
                      } else if(gameState == 2) {
                          this.text = "You land on the moon\nEnd1/2\nENTER to restart";
                      } else {
                          this.text = "You returned to earth!\nEnd2/2\nENTER to restart";
                      }                    if(keyPressed('enter')) {
                          lp.stop();
                          gameStart(true);
                      }                }
              });

              // Vector clamp used to keep player within game boundry
              let vector = factory$1(80, 80);
              vector.clamp(0, 0, 160, 160);
              let player = factory$3({
                  anchor: {x: 0.5, y:0.5},
                  x: vector.x,
                  y: vector.y,
                  spd: 0,
                  tbo: 100,
                  tboCD: 0,
                  rotation: 0,
                  image: imageAssets['player'],
                  update: function() {
                      if(keyPressed('left') || keyPressed('a')) {
                          this.rotation = (this.rotation - 0.06)%(2*Math.PI);
                      }
                      if(keyPressed('up') || keyPressed('w')) {
                          if(keyPressed('space') && this.tbo > 0) {
                              this.spd = Math.min(0.9, this.spd + 0.04);
                              this.tbo -= 2;
                              this.tboCD = 120;
                          } else {
                              this.spd = Math.min(0.6, this.spd + 0.03);
                              if(this.tboCD == 0) {
                                  this.tbo = Math.min(this.tbo+1, 100);
                              }
                          }                    } else {
                          if(this.spd > 0) {
                              this.spd = Math.max(0, this.spd - 0.02);
                          }                    }
                      if(keyPressed('right') || keyPressed('d')) {
                          this.rotation = (this.rotation + 0.06)%(2*Math.PI);
                      }
                      this.x = vector.x += Math.cos(this.rotation)*this.spd;
                      this.y = vector.y += Math.sin(this.rotation)*this.spd;

                      vector.clamp(0, 0, gameSize, gameSize);

                      if(this.tboCD > 0) {
                          this.tboCD--;
                      }                }
              });

              let moon = factory$3({
                  anchor: {x: 0.5, y: 0.5},
                  x: randInt(208, 224),
                  y: randInt(208, 224),
                  image: imageAssets['moon']
              });

              let earth = factory$3({
                  anchor: {x: 0.5, y: 0.5},
                  x: randInt(248, 288),
                  y: randInt(248, 288),
                  image: imageAssets['earth']
              });

              // Text rendering for score
              let scrTxt = factory$4({
                  x: 70,
                  score: 0,
                  font: '12px Arial',
                  text: "",
                  color: 'white',
                  textAlign: 'center',
                  update: function() {
                      this.text = "Score: " + this.score;
                  }
              });

              // Text rendering for turbo
              let tboTxt = factory$4({
                  font: '12px Arial',
                  text: `Turbo: ${player.tbo}`,
                  color: 'white',
                  textAlign: 'center',
                  update: function() {
                      this.text = `Turbo: ${player.tbo}`;
                  }
              });

              /*
              * Creates a fuel object within the given map size
              * Returns the fuel sprite object
              */
              const fuelFactory = (size=160) => {
                  let x = randInt(30, size-30);
                  let y = randInt(30, size-30);

                  while((x < earth.x+10 && x > earth.x-10 && y < earth.y+10 && y > earth.y-10) || 
                      (x < moon.x+10 && x > moon.x-10 && y < moon.y+10 && y > moon.y-10)) {
                      x = randInt(30, size-30);
                      y = randInt(30, size-30);
                  }

                  return factory$3({
                      anchor: {x: 0.5, y: 0.5},
                      x,
                      y,
                      image: imageAssets['fuel']
                  });
              };

              /*
              * Creates a rock/asteroid object on a random edge of the given map size
              * Sets a random linear path and velocity
              * Returns the rock sprite object
              */
              const rockFactory = (size=160) => {
                  let chooseXY = randInt(0, 1);
                  let x;
                  let y;
                  let dx;
                  let dy;

                  if(chooseXY) {
                      x = randInt(0, 1)*(size+2)-1;
                      y = randInt(0, size);
                      dx = randInt(0, 100)*0.01*(0.65 - 0.4) + 0.4;

                      if(x > 0) {
                          dx = -dx;
                      }                    dy = (randInt(0, 100)*0.01*(0.65 - 0.4) + 0.4) * (randInt(0, 1)*2-1);
                  } else {
                      x = randInt(0, size);
                      y = randInt(0, 1)*(size+2)-1;
                      dx = (randInt(0, 100)*0.01*(0.65 - 0.4) + 0.4) * (randInt(0, 1)*2-1);
                      dy = randInt(0, 100)*0.01*(0.65 - 0.4) + 0.4;

                      if(y > 0) {
                          dy = -dy;
                      }                }
                  return factory$3({
                      anchor: {x: 0.5, y: 0.5},
                      x,
                      y,
                      dx,
                      dy,
                      image: imageAssets['rock']
                  });
              };

              // The game loop function checks for any events in-game and updates and renders accordingly
              let lp = GameLoop({
                  update: function() {
                      bkgd.update();

                      if(gameState > 0 || !gameOn) {
                          mMenuTxt.update();
                      } else {
                          player.update();
                          tboTxt.update();

                          moon.update();
                          if(!checkSAT(player, moon)) {
                              gameState = 2;
                          }
                          earth.update();
                          if(!checkSAT(player, earth)) {
                              gameState = 3;
                          }
                          if(fuel == null) {
                              fuel = fuelFactory();
                          }                        if(!checkSAT(player, fuel)) {
                              fuel = fuelFactory(gameSize);
                              scrTxt.score++;
                              scrTxt.update();
                          }
                          gameSize = updtCanvas(scrTxt.score);
                          fuel.update();

                          // Checks for rock/asteroid limit and spawns more accordingly
                          if(rockArr.length < Math.min(scrTxt.score, 50)) {
                              if(spawn <=0) {
                                  for(let i=0; i<randInt(Math.min(Math.ceil(scrTxt.score/20), 3), Math.min(Math.floor(scrTxt.score/10), 5)); i++) {
                                      rockArr.push(rockFactory(gameSize));
                                  }                                spawn = randInt(15, 30);
                              }                        }
                          // Filters out rock/asteroids not within game boundry
                          rockArr = rockArr.filter(rock => {
                              if(rock.x >= -5 && rock.x <= gameSize+5 && rock.y >= -5 && rock.y <= gameSize+5) {
                                  if((player.x < rock.x+8 || player.x > rock.x-8) && (player.y < rock.y+8 || player.y > rock.y-8)) {
                                      if(!checkSAT(player, rock)) {
                                          gameState = 1;
                                      }                                }                                rock.update();
                                  return rock;
                              }                        });

                          spawn--;
                      }                },

                  render: function() {
                      bkgd.render();
                      scrTxt.render();

                      if(gameState > 0 || !gameOn) {
                          mMenuTxt.render();
                      } else {
                          player.render();
                          tboTxt.render();
                          moon.render();
                          earth.render();
                          if(fuel != null) {
                              fuel.render();
                          }
                          rockArr.forEach(rock => {
                              rock.render();
                          });
                      }                }
              });

              // Runs the game loop
              lp.start();
          });
  };

  // Starts the game
  gameStart();

}());
