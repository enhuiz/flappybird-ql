"use strict";

// assets 
var csvSrc = "res/csv/atlas.csv";
var atlasSrc = "res/img/atlas.png";

// game size
var width = 288;
var height = 512;

// physics
var xVel = -4;
var gravity = 1.5;
var jumpVel = -14;
var maxFallVel = 15;

// bird
var birdX = 69;
var birdStartY = 236;
var birdWidth = 25;
var birdHeight = 15;
var birdRenderOffsetX = -11;
var birdRenderOffsetY = -18;

// bird animation
var sineWaveA = 15;
var sineWaveT = 45;
var swingT = 5;

// pipe
var pipeWidth = 48;
var pipeHeight = 320;
var pipeSpacing = 172;
var pipeGap = 90;
var pipeStartX = 360;
var pipeRandomBoundary = 50;

// land
var landStartX = 0;
var landWidth = 288;
var landY = 400;

// ql
var qlAlpha = 0.6;
var qlGamma = 0.8;
var qlResolution = 15;
var qlAliveReward = 1;
var qlDeadReward = -100;
var qlEpsilon = 0;
var qlExploreJumpRate = 0.1;

// init fps
var inverseDefaultFPS = 1000 / 40;

// dead animation
var deadFlashFrame = 5;

// play ui
var playingScoreMidX = 144;
var playingScoreY = 41;
var playingScoreSpacing = 22;

// game over ui
var gameOverTextX = 40;
var gameOverTextY = 123;
var gameOverPanelX = 24;
var gameOverPanelY = 195;
var panelScoreRightX = 218;
var panelScoreY = 231;
var panelMaxScoreY = 272;
var panelScoreSpacing = 16;
var medalX = 55;
var medalY = 240;

// ready ui
var tutorialX = 88;
var tutorialY = 218;
var readyTextX = 46;
var readyTextY = 146;

function first(v) {
    return v.length > 0 ? v[0] : null;
}

function second(v) {
    return v.length > 1 ? [1] : null;
}

function last(v) {
    return v[v.length - 1];
}

function max(v) {
    if (!v || v.length === 0) return null;

    var index = 0;
    for (var i = 1; i < v.length; ++i) {
        index = v[i] > v[index] ? i : index;
    }
    return v[index];
}

function translate(startPos, vel, time) {
    return Math.floor(time * vel + startPos);
}

function apply(x, funcs) {
    funcs.forEach(function (f) {
        x = f(x);
    });
    return x;
}

function startingState() {
    return {
        mode: "ready",
        startFrame: 0,
        jumpFrame: 0,
        birdY: birdStartY,
        curFrame: 0,
        birdSprite: 0,
        round: 0,
        score: 0,
        totalScore: 0,
        maxScore: 0,
        deadFlash: 0,
        fps: 0,
        pipeList: [],
        landList: [],
    };
}

function resetState(gameState) {
    var round = gameState.round;
    var curFrame = gameState.curFrame;
    var totalScore = gameState.totalScore;
    var maxScore = gameState.maxScore;
    var score = gameState.score;

    var gameState = startingState();

    gameState.startFrame = curFrame;
    gameState.curFrame = curFrame;
    gameState.round = round + 1;
    gameState.totalScore = totalScore;
    gameState.maxScore = maxScore;

    return gameState;
}

function curPipePos(curFrame, pipe) {
    return translate(pipe.startX, xVel, curFrame - pipe.startFrame);
}

function curLandPos(curFrame, land) {
    return translate(land.startX, xVel, curFrame - land.startFrame);
}

function inPipe(pipe) {
    return birdX + birdWidth >= pipe.curX && birdX < pipe.curX + pipeWidth;
}

function inPipeGap(birdY, pipe) {
    return pipe.gapTop < birdY && (pipe.gapTop + pipeGap) > birdY + birdHeight;
}

function collideGround(birdY) {
    return birdY + birdHeight >= landY;
}

function updateCollision(gameState) {
    var birdY = gameState.birdY;
    var pipeList = gameState.pipeList;

    if (pipeList.some(function (pipe) {
        return (inPipe(pipe) &&
            !inPipeGap(birdY, pipe)) ||
            collideGround(birdY);
    })) {
        gameState.mode = "dead";
    }

    return gameState;
}

function newPipe(curFrame, startX) {
    return {
        startFrame: curFrame,
        startX: startX,
        curX: startX,
        gapTop: Math.floor(pipeRandomBoundary + Math.random() * (landY - pipeGap - 2 * pipeRandomBoundary))
    };
}

function newLand(curFrame, startX) {
    return {
        startFrame: curFrame,
        startX: startX,
        curX: startX,
    };
}

function updatePipes(gameState) {
    if (gameState.mode != "playing") return gameState;

    var curFrame = gameState.curFrame;
    var pipeList = gameState.pipeList.map(function (pipe) {
        pipe.curX = curPipePos(curFrame, pipe);
        return pipe;
    }).filter(function (pipe) {
        return pipe.curX > -pipeWidth;
    }).sort(function (a, b) {
        return a.curX - b.curX;
    });

    while (pipeList.length < 3) {
        var lastPipe = last(pipeList);
        pipeList.push(newPipe(curFrame, lastPipe ? lastPipe.curX + pipeSpacing : pipeStartX));
    }

    gameState.pipeList = pipeList;
    return gameState;
}

function updateLand(gameState) {
    if (gameState.mode == "dead") return gameState;

    var curFrame = gameState.curFrame;
    var landList = gameState.landList.map(function (land) {
        land.curX = curLandPos(curFrame, land);
        return land;
    }).filter(function (land) {
        return land.curX > -landWidth;
    }).sort(function (a, b) {
        return a.curX - b.curX;
    });

    while (landList.length < 2) {
        var lastLand = last(landList);
        landList.push(newLand(curFrame, lastLand ? lastLand.curX + landWidth : landStartX));
    }

    gameState.landList = landList;
    return gameState;
}

function animation(gameState) {
    var mode = gameState.mode;
    var curFrame = gameState.curFrame;

    if (mode === "ready" || mode === "playing")
        gameState.birdSprite = Math.floor(curFrame / swingT) % 3;

    if (mode === "ready")
        gameState.birdY = birdStartY + sineWaveA * Math.sin(curFrame * Math.PI * 2 / sineWaveT);

    if (mode === "dead") {
        gameState.deadFlash += 1;
    }

    return gameState;
}

function updateBird(gameState) {
    var curFrame = gameState.curFrame;
    var jumpFrame = gameState.jumpFrame;
    var birdY = gameState.birdY;
    var mode = gameState.mode;
    if (mode === "playing") {
        var curVel = Math.min(jumpVel + gravity * (curFrame - jumpFrame), maxFallVel);
        var newY = Math.min(birdY + curVel, landY - birdHeight);
        var newY = Math.max(newY, -birdHeight);
        gameState.birdY = newY;
    }
    return animation(gameState);
}

function updateScore(gameState) {
    if (gameState.mode == "playing") {
        var curFrame = gameState.curFrame;
        var startFrame = gameState.startFrame;
        var distance = (curFrame - startFrame) * Math.abs(xVel) + (pipeWidth + birdWidth) * 0.5;
        var newScore = Math.max(Math.floor((distance - pipeStartX + pipeSpacing) / pipeSpacing), 0);
        if (newScore - gameState.score === 1) {
            gameState.score += 1;
            gameState.totalScore += 1;
            gameState.maxScore = Math.max(gameState.score, gameState.maxScore);
        }
    }

    return gameState;
}

function jump(gameState) {
    var mode = gameState.mode;
    var curFrame = gameState.curFrame;

    if (mode !== "dead") {
        gameState.jumpFrame = curFrame;
    }

    if (mode === "ready") {
        gameState.startFrame = curFrame;
        gameState.mode = "playing";
    } else if (mode === "dead" && gameState.deadFlash > deadFlashFrame) {
        gameState = resetState(gameState);
        gameState = jump(gameState);
    }

    return gameState;
}

function getQLState(gameState) {
    var pipeList = gameState.pipeList;
    var birdY = gameState.birdY;
    var pipeList = pipeList.filter(function (pipe) {
        return birdX < pipe.curX + pipeWidth;
    }).sort(function (a, b) {
        return a.curX - b.curX;
    });

    var firstPipe = first(pipeList);
    var S = null;

    if (firstPipe) {
        S = [Math.floor(firstPipe.curX / qlResolution),
        Math.floor((firstPipe.gapTop - birdY) / qlResolution),
        ].join(',');
    }

    return S;
}

function reward(Q, S, S_, A, R) {
    if (S && S_ && A in [0, 1] && S in Q && S_ in Q)
        Q[S][A] = (1 - qlAlpha) * Q[S][A] + qlAlpha * (R + qlGamma * max(Q[S_]));
    return Q;
}

function updateQL(gameState) {
    if (!updateQL.enabled) return gameState;

    if (updateQL.skip) {
        updateQL.A = null;
        updateQL.S = null;
    }

    if (!updateQL.Q) {
        updateQL.Q = {};
        updateQL.S = null;
    }

    var Q = updateQL.Q;

    // prev state
    var S = updateQL.S;
    // prev action 
    var A = updateQL.A;
    // current state
    var S_ = getQLState(gameState);

    if (S_ && !(S_ in Q)) Q[S_] = [0, 0];

    if (gameState.mode == "playing") {
        updateQL.Q = reward(Q, S, S_, A, qlAliveReward);
        updateQL.S = S_;

        // current action, 0 for stay, 1 for jump
        var A_ = 0;

        if (Math.random() < qlEpsilon) { // explore
            A_ = Math.random() < qlExploreJumpRate ? 1 : 0;
        } else if (S_ in Q) { // exploit 
            A_ = Q[S_][0] >= Q[S_][1] ? 0 : 1;
        }

        if (A_ === 1) gameState = jump(gameState);
        updateQL.A = A_;
    } else if (gameState.mode == "dead") {
        updateQL.Q = reward(Q, S, S_, A, qlDeadReward);
        updateQL.S = null;
        updateQL.A = null;

        // restart the game
        updateQL.skip = false;
        gameState = jump(gameState);
    }

    return gameState;
}

function update(gameState, frameStamp) {
    gameState.curFrame = frameStamp;
    gameState.deltaTime = frameStamp - gameState.jumpFrame;
    return apply(gameState, [
        updateLand,
        updateBird,
        updatePipes,
        updateScore,
        updateCollision,
        updateQL,
    ]);
}

function drawSprite(spriteName, x, y) {
    var sprite = render.sprites[spriteName]
    render.ctx.drawImage(render.image, sprite[2], sprite[3], sprite[0], sprite[1], x, y, sprite[0], sprite[1]);
}

function render(gameState) {
    if (!render.cvs || !render.ctx) {
        render.cvs = document.getElementById("cvs");
        render.cvs.width = width;
        render.cvs.height = height;
        render.ctx = render.cvs.getContext("2d");
        render.image = new Image();
        render.sprites = {};
        render.resourcesLoaded = false;

        render.ctx.font = render.ctx.font.replace(/\d+px/, "14px");

        render.image.addEventListener("load", function () {
            $.get(csvSrc, function (result) {
                result.split('\n').forEach(function (line) {
                    let values = line.split(' ');
                    render.sprites[values[0]] = [
                        Math.round(parseInt(values[1], 10)),
                        Math.round(parseInt(values[2], 10)),
                        Math.round(parseFloat(values[3]) * render.image.width),
                        Math.round(parseFloat(values[4]) * render.image.height)
                    ];
                });
                render.resourcesLoaded = true;
            });
        });
        render.image.src = atlasSrc;
    }

    var ctx = render.ctx;

    if (render.resourcesLoaded) {
        // clear
        ctx.fillRect(0, 0, render.cvs.width, render.cvs.height);

        // draw background
        drawSprite("bg_day", 0, 0);

        // draw pipes
        gameState.pipeList.forEach(function (pipe) {
            drawSprite("pipe_down", pipe.curX, pipe.gapTop - pipeHeight) // v
            drawSprite("pipe_up", pipe.curX, pipe.gapTop + pipeGap); // ^
        });

        // draw land
        gameState.landList.forEach(function (land) {
            drawSprite("land", land.curX, landY);
        });

        // draw bird
        var birdY = gameState.birdY;
        var birdSprite = gameState.birdSprite;
        drawSprite("bird0_" + birdSprite, birdX + birdRenderOffsetX, birdY + birdRenderOffsetY);

        if (gameState.mode === "playing") {
            // draw score
            var score = gameState.score.toString();
            for (var i = 0; i < score.length; ++i) {
                var digit = score[i];
                drawSprite("font_0" + (48 + parseInt(digit)), playingScoreMidX + (i - score.length / 2) * playingScoreSpacing, playingScoreY)
            }
        } else if (gameState.mode === "ready") {
            drawSprite("text_ready", readyTextX, readyTextY);
            drawSprite("tutorial", tutorialX, tutorialY);
        } else if (gameState.mode === "dead") {
            drawSprite("text_game_over", gameOverTextX, gameOverTextY);
            drawSprite("score_panel", gameOverPanelX, gameOverPanelY);

            // draw score
            var score = gameState.score.toString();
            for (var i = 0; i < score.length; ++i) {
                var digit = score[score.length - i - 1];
                drawSprite("number_score_0" + digit, panelScoreRightX - i * panelScoreSpacing, panelScoreY);
            }

            // draw max score
            var maxScore = gameState.maxScore.toString();
            for (var i = 0; i < maxScore.length; ++i) {
                var digit = maxScore[maxScore.length - i - 1];
                drawSprite("number_score_0" + digit, panelScoreRightX - i * panelScoreSpacing, panelMaxScoreY);
            }

            // draw medal
            var medal;
            if (score >= 30) medal = "3";
            else if (score >= 20) medal = "2";
            else if (score >= 10) medal = "1";
            else if (score >= 5) medal = "0";
            if (medal)
                drawSprite("medals_" + medal, medalX, medalY);

            if (gameState.deadFlash < deadFlashFrame) {
                ctx.globalAlpha = 1 - gameState.deadFlash / deadFlashFrame;
                ctx.fillRect(0, 0, render.cvs.width, render.cvs.height);
                ctx.globalAlpha = 1.0;
            }
        }
    }
}

var gameState = startingState();

cvs.addEventListener("mousedown", function (e) {
    e.preventDefault();
    // to avoid users mislead the bird when training
    if (updateQL.enabled) updateQL.skip = true;
    gameState = jump(gameState);
});

cvs.addEventListener("touchstart", function (e) {
    e.preventDefault();
    // to avoid users mislead the bird when training
    if (updateQL.enabled) updateQL.skip = true;
    gameState = jump(gameState);
});

function gameLoop() {
    if (!gameLoop.timeScale) {
        gameLoop.timeScale = 1;
        gameLoop.frameCount = 0;
        gameLoop.lastTime = (new Date).getTime();
    }

    gameState = update(gameState, gameLoop.frameCount++);
    render(gameState);

    // draw fps
    var curTime = (new Date).getTime();
    var lastTime = gameLoop.lastTime;
    gameLoop.lastTime = curTime;
    render.ctx.fillText(Math.floor(1000 / (curTime - lastTime)) + 'fps', 15, 25);

    gameLoop.eachFrame.update(gameState);

    setTimeout(gameLoop, inverseDefaultFPS / gameLoop.timeScale);
}

gameLoop.eachFrame = function (cb) {
    if (!gameLoop.eachFrame.callbacks) {
        gameLoop.eachFrame.callbacks = [];
    }
    gameLoop.eachFrame.callbacks.push(cb);
}

gameLoop.eachFrame.update = function (gameState) {
    (gameLoop.eachFrame.callbacks || []).forEach(function (cb) {
        cb(gameState);
    });
}

gameLoop.start = function () {
    setTimeout(gameLoop, inverseDefaultFPS);
}

console.log("core.js loaded");