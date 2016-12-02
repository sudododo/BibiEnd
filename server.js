var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var config = require('./config');
var User = require('./app/models/user');

var port = process.env.PORT || 8080;
mongoose.connect(config.database);
app.set('superSecret', config.secret);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(morgan('dev'));

var apiRoutes = express.Router();

// register
apiRoutes.post('/signup', function(req, res){
    if(!req.body.username || !req.body.password || !req.body.name || !req.body.email) {
        return res.status(400).send({sucess: false, message: 'Invalid input'});
    } else {
        User.findOne({username: req.body.username}, function(err, user) {
            if(user) {
                return res.status(400).send({
                    sucess: false,
                    message: 'User already exisits.'
                })
            } else {
                var newUser = new User();
                newUser.username = req.body.username;
                newUser.password = req.body.password;
                newUser.name = req.body.name;
                newUser.email = req.body.email;
                newUser.admin = false;
                newUser.save(function(err) {
                    if(err) throw err;
                });
                var token = jwt.sign({ username: newUser.username}, app.get('superSecret'), {
                    expiresIn: app.get('expiresIn')
                });
                res.json({
                    sucess: true,
                    message: 'Complete',
                    token: token
                });
            }
        })
    }
});

// login
apiRoutes.post('/authenticate', function(req, res){
    User.findOne({
        username: req.body.username
    }, function(err, user) {
        if(err) throw err;

        if(!user) {
            res.json({ success: false, message: 'Authenticate failed. User not found.'});
        } else if(user) {
            if(user.password != req.body.password) {
                res.json({ sucess: false, message: 'Authenticate failed. Wrong password.'});
            } else {
                var token = jwt.sign({ username: user.username }, app.get('superSecret'), {
                    expiresIn: app.get('expiresIn')
                });

                res.json({
                    sucess: true,
                    message: 'Authenticated',
                    token: token
                });
            }
        }
    });
});

// apiRoutes.use(function(req, res, next) {
//     var token = req.body.token || req.query.token || req.headers['x-access-token'];
//     if(token) {
//         jwt.verify(token, app.get('superSecret'), function(err, decoded) {
//             if(err) {
//                 return res.status(401).send({sucess: false, message: 'Failed to authenticate token.'});
//             } else {
//                 req.decoded = decoded;
//                 next();
//             }
//         });
//     } else {
//         return res.status(403).send({
//             sucess: false,
//             message: 'No token provided.'
//         });
//     }
// });

apiRoutes.get('/', function(req, res) {
    res.send("Welcome to BibiEnd");
});

// apiRoutes.get('/users', function(req, res){
//     User.find({}, function(error, users){
//         res.json(users);
//     });
// });

apiRoutes.get('/users/:username', function(req, res) {
    User.findOne({ username: req.params.username}, function(err, user) {
        if(user) {
            user = user.toObject();
            delete user.password;
            delete user.__v;
            res.json(user);
        } else {
            return res.status(400).json({
                sucess: false,
                message: 'User not Found.'
            });
        }
    });
});

apiRoutes.put('/users/:username/contacts/:contact', function(req, res) {
    User.findOne({ username: req.params.username}, function(err, user) {
        if(err) throw err;
        if(user) {
            User.findOne({ username: req.params.contact}, function(err, contact) {
                if(err) throw err;
                if(contact) {
                    user.contacts.push(contact._id);
                    user.save();
                    res.json({
                        sucess: true,
                        message: 'Contact added.'
                    });
                } else {
                    res.status(400).json({
                        sucess: false,
                        message: 'Contact cannot be found.'
                    })
                }
            });
        } else {
            res.status(400).json({
                sucess: false,
                message: 'User cannot be found.'
            })
        }
    });
});

apiRoutes.get('/users/:username/contacts', function(req, res) {
    User.findOne({username: req.params.username})
        .select('contacts')
        .populate('contacts')
        .exec(function(err, user){
        if(err){
            throw err;
        } else {
            if(user) {
                contacts = user.contacts;
                if(contacts) {
                    contacts.forEach(function(x){
                        delete x.password;
                        delete x.__v;
                        delete x.contacts;
                    })
                }
                res.json(user.contacts);
            } else {
                res.status(400).json({
                    sucess: false,
                    message: 'User not found'
                });
            }
        }
    });
});


app.use('/api', apiRoutes);

app.listen(port);
console.log('Server running on port ' + port);
