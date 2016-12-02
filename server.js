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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan('dev'));

var apiRoutes = express.Router();

// signup
apiRoutes.post('/signup', function (req, res) {
    if (!req.body.username || !req.body.password || !req.body.name || !req.body.email) {
        return res.status(400).send({ sucess: false, message: 'Invalid input' });
    } else {
        User.findOne({ username: req.body.username }, function (err, user) {
            if (user) {
                return res.status(400).send({
                    sucess: false,
                    message: 'Username already exisits.'
                })
            } else {
                var newUser = new User();
                newUser.username = req.body.username;
                newUser.password = req.body.password;
                newUser.name = req.body.name;
                newUser.email = req.body.email;
                newUser.admin = false;
                newUser.save(function (err) {
                    if (err) throw err;
                });
                var token = jwt.sign({ _id: newUser._id, username: newUser.username }, app.get('superSecret'), {
                    expiresIn: app.get('expiresIn')
                });
                res.json({
                    sucess: true,
                    message: 'Complete',
                    _id: newUser._id,
                    token: token
                });
            }
        })
    }
});

// login
apiRoutes.post('/authenticate', function (req, res) {
    User.findOne({
        username: req.body.username
    }, function (err, user) {
        if (err) throw err;

        if (!user) {
            res.json({ success: false, message: 'Authenticate failed. User not found.' });
        } else if (user) {
            if (user.password != req.body.password) {
                res.json({ sucess: false, message: 'Authenticate failed. Wrong password.' });
            } else {
                var token = jwt.sign({ _id: user._id, username: user.username }, app.get('superSecret'), {
                    expiresIn: app.get('expiresIn')
                });

                res.json({
                    sucess: true,
                    message: 'Authenticated',
                    _id: user._id,
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

// Test
apiRoutes.get('/', function (req, res) {
    res.send("Welcome to BibiEnd");
});

// Get all users
// apiRoutes.get('/users', function(req, res){
//     User.find({}, function(error, users){
//         res.json(users);
//     });
// });

// Get user by id
apiRoutes.get('/users/id/:id', function (req, res) {
    User.findOne({ _id: req.params.id }, function (err, user) {
        if (user) {
            user = user.toObject();
            delete user.password;
            delete user.__v;
            delete user.contacts;
            res.json(user);
        } else {
            return res.status(400).json({
                sucess: false,
                message: 'User not Found.'
            });
        }
    });
});

// Get user by username
apiRoutes.get('/users/username/:username', function (req, res) {
    User.findOne({ username: req.params.username }, function (err, user) {
        if (user) {
            user = user.toObject();
            delete user.password;
            delete user.__v;
            delete user.contacts;
            res.json(user);
        } else {
            return res.status(400).json({
                sucess: false,
                message: 'User not Found.'
            });
        }
    });
});

// Add contact
apiRoutes.put('/users/:userid/contacts/:contactid', function (req, res) {
    User.findOne({ _id: req.params.userid }, function (err, user) {
        if (err) throw err;
        if (user) {
            User.findOne({ _id: req.params.contactid }, function (err, contact) {
                if (err) throw err;
                if (contact) {
                    if (user.contacts.indexOf(contact._id) == -1) {
                        user.contacts.push(contact._id);
                        user.save();
                        res.json({
                            sucess: true,
                            message: 'Contact added.'
                        });
                    } else {
                        res.status(400).json({
                            sucess: false,
                            message: 'Contact already exists.'
                        });
                    }
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

// Get contacts
apiRoutes.get('/users/:id/contacts', function (req, res) {
    User.findOne({ _id: req.params.id })
        .populate('contacts')
        .exec(function (err, user) {
            if (err) {
                throw err;
            } else {
                if (user) {
                    contacts = user.contacts.toObject();
                    if (contacts) {
                        contactsAbstract = contacts.map(function (x) {
                            x = x.toObject();
                            delete x.password;
                            delete x.__v;
                            delete x.contacts;
                            return x;
                        });
                        res.json(contactsAbstract);
                    } else {
                        res.json('[]');
                    }
                } else {
                    res.status(400).json({
                        sucess: false,
                        message: 'User not found'
                    });
                }
            }
        });
});

// remove a contacts
apiRoutes.delete('/users/:userid/contacts/:contactid', function (req, res) {
    User.findOne({ _id: req.params.userid }, function (err, user) {
        if (err) throw err;
        if (user) {
            index = user.contacts.indexOf(req.params.contactid);
            if (index == -1) {
                res.status(400).json({
                    sucess: false,
                    message: 'Contact cannot be found.'
                });
            } else {
                user.contacts.splice(index, 1);
                user.save();
                res.json({
                    sucess: false,
                    message: 'Contact already exists.'
                });
            }
        } else {
            res.status(400).json({
                sucess: false,
                message: 'User cannot be found.'
            })
        }
    });
});

// TODO remove a user

// 

app.use('/api', apiRoutes);

app.listen(port);
console.log('Server running on port ' + port);
