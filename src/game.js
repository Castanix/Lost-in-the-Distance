import { init, Sprite, GameLoop, load, imageAssets, setImagePath, initKeys, keyPressed, randInt, rotatePoint, Text, Vector } from '../node_modules/kontra/kontra.mjs'; // (used for rollup)
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
    };

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
        let axis = Vector(-(obj1V[(i+1)%4].y - obj1V[i%4].y), (obj1V[(i+1)%4].x - obj1V[i%4].x));
        axis = axis.normalize();

        // Finds the min and max points on axis of obj1
        let obj1min = axis.dot(obj1V[0]);
        let obj1max = obj1min;
        for(let j=0; j<4; j++) {
            let vertex = axis.dot(obj1V[j]);
            obj1min = Math.min(obj1min, vertex);
            obj1max = Math.max(obj1max, vertex);
        };

        let obj2V = getV(obj2);

        // Finds the min and max points on axis of obj2
        let obj2min = axis.dot(obj2V[0]);
        let obj2max = obj2min;
        for(let j=0; j<4; j++) {
            let vertex = axis.dot(obj2V[j]);
            obj2min = Math.min(obj2min, vertex);
            obj2max = Math.max(obj2max, vertex);
        };
        
        // Checks if min and max points of both objects overlap, returns true if there is no overlap
        if(obj1max < obj2min || obj1min > obj2max) {
            return true;
        };
    };

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

            let bkgd = Sprite({
                x: 0,
                y: 0,
                image: imageAssets['map-indexed']
            });

            // Text rendering for menu screen
            let mMenuTxt = Text({
                anchor: {x: 0.5, y:0.5},
                x: gameSize/2,
                y: gameSize/2,
                font: '14px Arial',
                color: 'white',
                text: "",
                textAlign: 'center',
                update: function() {
                    this.x = gameSize/2
                    this.y = this.x
                    if(gameState == 1) {
                        this.text = "You got hit\nENTER to restart";
                    } else if(!gameOn) {
                        this.text = "ENTER to start";
                    } else if(gameState == 2) {
                        this.text = "You land on the moon\nEnd1/2\nENTER to restart";
                    } else {
                        this.text = "You returned to earth!\nEnd2/2\nENTER to restart";
                    };
                    if(keyPressed('enter')) {
                        lp.stop();
                        gameStart(true);
                    };
                }
            });

            // Vector clamp used to keep player within game boundry
            let vector = Vector(80, 80);
            vector.clamp(0, 0, 160, 160);
            let player = Sprite({
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
                    };

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
                        };
                    } else {
                        if(this.spd > 0) {
                            this.spd = Math.max(0, this.spd - 0.02);
                        };
                    };

                    if(keyPressed('right') || keyPressed('d')) {
                        this.rotation = (this.rotation + 0.06)%(2*Math.PI);
                    };

                    this.x = vector.x += Math.cos(this.rotation)*this.spd;
                    this.y = vector.y += Math.sin(this.rotation)*this.spd;

                    vector.clamp(0, 0, gameSize, gameSize);

                    if(this.tboCD > 0) {
                        this.tboCD--;
                    };
                }
            });

            let moon = Sprite({
                anchor: {x: 0.5, y: 0.5},
                x: randInt(208, 224),
                y: randInt(208, 224),
                image: imageAssets['moon']
            });

            let earth = Sprite({
                anchor: {x: 0.5, y: 0.5},
                x: randInt(248, 288),
                y: randInt(248, 288),
                image: imageAssets['earth']
            });

            // Text rendering for score
            let scrTxt = Text({
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
            let tboTxt = Text({
                font: '12px Arial',
                text: `Turbo: ${player.tbo}`,
                color: 'white',
                textAlign: 'center',
                update: function() {
                    this.text = `Turbo: ${player.tbo}`
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

                return Sprite({
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
                    };
                    dy = (randInt(0, 100)*0.01*(0.65 - 0.4) + 0.4) * (randInt(0, 1)*2-1);
                } else {
                    x = randInt(0, size);
                    y = randInt(0, 1)*(size+2)-1;
                    dx = (randInt(0, 100)*0.01*(0.65 - 0.4) + 0.4) * (randInt(0, 1)*2-1);
                    dy = randInt(0, 100)*0.01*(0.65 - 0.4) + 0.4;

                    if(y > 0) {
                        dy = -dy;
                    };
                };

                return Sprite({
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
                        };

                        earth.update();
                        if(!checkSAT(player, earth)) {
                            gameState = 3;
                        };

                        if(fuel == null) {
                            fuel = fuelFactory();
                        };
                        if(!checkSAT(player, fuel)) {
                            fuel = fuelFactory(gameSize);
                            scrTxt.score++;
                            scrTxt.update();
                        };

                        gameSize = updtCanvas(scrTxt.score);
                        fuel.update();

                        // Checks for rock/asteroid limit and spawns more accordingly
                        if(rockArr.length < Math.min(scrTxt.score, 50)) {
                            if(spawn <=0) {
                                for(let i=0; i<randInt(Math.min(Math.ceil(scrTxt.score/20), 3), Math.min(Math.floor(scrTxt.score/10), 5)); i++) {
                                    rockArr.push(rockFactory(gameSize));
                                };
                                spawn = randInt(15, 30);
                            };
                        };

                        // Filters out rock/asteroids not within game boundry
                        rockArr = rockArr.filter(rock => {
                            if(rock.x >= -5 && rock.x <= gameSize+5 && rock.y >= -5 && rock.y <= gameSize+5) {
                                if((player.x < rock.x+8 || player.x > rock.x-8) && (player.y < rock.y+8 || player.y > rock.y-8)) {
                                    if(!checkSAT(player, rock)) {
                                        gameState = 1;
                                    };
                                };
                                rock.update();
                                return rock;
                            };
                        });

                        spawn--;
                    };
                },

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
                    };
                }
            });

            // Runs the game loop
            lp.start();
        });
};

// Starts the game
gameStart();