// server.js
var express = require('express');
var fs = require('fs');


var multiparty = require('multiparty');
var util = require('util');

var app = express();
var port = process.env.PORT || 8085;
var router = express.Router();
var env = app.get('env') == 'development' ? 'dev' : app.get('env');

var Sequelize = require('sequelize');
var bodyParser = require('body-parser');

app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({
    extended: true
}));

var request = require('request');
var moment = require('moment');
var jwt = require('jwt-simple');


var config = require('./database.json')[env];
var password = config.password ? config.password : null;

// initialize database connection
var sequelize = new Sequelize(
    config.database,
    config.user,
    config.password, {
        dialect: config.driver,
        logging: console.log,
        define: {
            timestamps: false
        }
    }
);


var fileName = '';
var size = '';
var GOOGLE_SECRET = "uQQVIGjooRbkXJKD6iCsJXFA";
var TOKEN_SECRET = "This is secret";


require("./app/articles/article_model.js")(sequelize, Sequelize);
require("./app/users/user_model.js")(sequelize, Sequelize);


router.route('/imageUpload')
    .post(function (req, res) {

        var count = 0;
        var form = new multiparty.Form();

        form.on('error', function (err) {
            console.log('Error parsing form: ' + err.stack);
        });

// Parts are emitted when parsing the form
        form.on('part', function (part) {
            if (!part.filename) return;
            size = part.byteCount;
            fileName = part.filename;
        });

        form.on('file', function (name, file) {
            fileName = file.originalFilename;
            size = file.size;

            console.log(file.path);
            console.log(__dirname);
            console.log('filename: ' + fileName);
            console.log('fileSize: ' + (size / 1024));
            var tmp_path = file.path
            var target_path = './uploads/' + fileName;
            fs.renameSync(tmp_path, target_path, function (err) {
                if (err) console.error(err.stack);
            });
            console.log(target_path);
        });

// Close emitted after form parsed
        form.on('close', function () {
            res.json({
                "status": true,
                "url": "http://localhost/arbisoft/blog-app/backend/uploads/" + fileName
            });
        });

// Parse req
        form.parse(req);


    });

router.route('/auth/google')
    .post(function (req, res) {

        var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
        var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
        var params = {
            code: req.body.code,
            client_id: req.body.clientId,
            client_secret: GOOGLE_SECRET,
            redirect_uri: req.body.redirectUri,
            grant_type: 'authorization_code'
        };

        // Step 1. Exchange authorization code for access token.
        request.post(accessTokenUrl, {json: true, form: params}, function (err, response, token) {
            var accessToken = token.access_token;
            var headers = {Authorization: 'Bearer ' + accessToken};

            // Step 2. Retrieve profile information about the current user.
            request.get({url: peopleApiUrl, headers: headers, json: true}, function (err, response, profile) {
                if (profile.error) {
                    return res.status(500).send({status: false, message: profile.error.message});
                }
                // Step 3a. Link user accounts.
                if (req.headers.authorization) {
                    var user = User.build();
                    ////////////////
                    user.retrieveById(profile.sub, function (userInfo) {
                        if (userInfo) {
                            return res.status(409).send({
                                status: false,
                                message: 'There is already a Google account that belongs to you'
                            });
                        } else {

                            var token = req.headers.authorization.split(' ')[1];
                            var payload = jwt.decode(token, TOKEN_SECRET);

                            /////////////////

                            user.retrieveById(payload.sub, function (user) {

                                if (!user) {
                                    return res.status(400).send({status: false, message: 'User not found'});
                                }
                                var user = User.build({
                                    sub: profile.sub,
                                    name: profile.name,
                                    email: profile.email,
                                    picture: profile.picture,
                                    gender: profile.gender,
                                });

                                user.add(function (success) {

                                        var token = createJWT(user);
                                        res.send({token: token});
                                    },
                                    function (err) {
                                        res.send(err);
                                    });


                            }, function (error) {
                                res.send("Error:User not found");
                            });


                            ////////////////


                        }
                    }, function (error) {
                        res.send("Error:User not found");
                    });
                    ////////////////
                } else {
                    // Step 3b. Create a new user account or return an existing one.

                    var user = User.build();

                    user.retrieveById(profile.sub, function (userInfo) {
                        if (userInfo) {

                            return res.send({token: createJWT(userInfo)});
                        } else {

                            var user = User.build({
                                sub: profile.sub,
                                name: profile.name,
                                email: profile.email,
                                picture: profile.picture,
                                gender: profile.gender,
                            });

                            user.add(function (success) {

                                    var token = createJWT(user);
                                    res.send({token: token});
                                },
                                function (err) {
                                    res.send(err);
                                });


                        }
                    }, function (error) {
                        res.send("Profile creation error");
                    });

                }
            });
        });

    });


router.route('/articles')
// get all the articles (accessed at GET http://localhost:8080/api/articles)
    .get(function (req, res) {
        var article = Article.build();

        article.retrieveAll(function (articles) {
            if (articles) {
                if (articles.length == 0) {
                    res.json({
                        "data": articles,
                        "status": true,
                        "message": "There are no articles"
                    });
                }
                else {
                    res.json({
                        "data": articles,
                        "status": true,
                        "message": "Articles found"
                    });
                }

            } else {
                res.json({
                    "status": false,
                    "message": "Articles not found"
                });
            }
        }, function (error) {
            res.send({
                "status": false,
                "message": "Articles not found"
            });
        });
    });


// Middleware to use for all requests and intercepting the below routes
router.use(function (req, res, next) {

    if (req.method === 'OPTIONS') {
        console.log('!OPTIONS Request');
        var headers = {};
        // IE8 does not allow domains to be specified, just the *
        // headers["Access-Control-Allow-Origin"] = req.headers.origin;
        headers["Access-Control-Allow-Origin"] = req.headers.origin;
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = true;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "x-access-token, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization";
        res.writeHead(200, headers);
        res.end();
    }
    else {
        if (!req.headers.authorization) {
            return res.status(401).send(
                {
                    "status": false,
                    "message": 'Please make sure your request has an Authorization header'
                }
            )
        }
        var token = req.headers.authorization.split(' ')[1];

        var payload = null;
        try {
            payload = jwt.decode(token, TOKEN_SECRET);
        }
        catch (err) {
            return res.status(401).send(
                {
                    "status": false,
                    "message": err.message
                }
            );
        }

        if (payload.exp <= moment().unix()) {
            return res.status(401).send(
                {
                    "status": false,
                    "message": 'Token has expired'
                });
        }
        req.user = payload.sub;
        next();
    }
});


/*
 |--------------------------------------------------------------------------
 | Generate JSON Web Token
 |--------------------------------------------------------------------------
 */
function createJWT(user) {
    var payload = {
        sub: user.dataValues.sub,
        iat: moment().unix(),
        exp: moment().add(14, 'days').unix()
    };
    return jwt.encode(payload, TOKEN_SECRET);
}


require("./app/articles/articles_route.js")(router);


//ACCESS ORGIN
// =============================================================================
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,x-access-token');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// REGISTER OUR ROUTES
// =============================================================================
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);