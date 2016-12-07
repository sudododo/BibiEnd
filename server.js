var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var config = require('./config');
var User = require('./app/models/user');
var Group = require('./app/models/group');

app.set('superSecret', config.secret);
app.set('expiresIn', config.expiresIn);
app.set('version', config.version);

var port = process.env.PORT || 8080;
mongoose.connect(config.database);

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
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (err) throw err;
                if (isMatch) {
                    var token = jwt.sign({ _id: user._id, username: user.username }, app.get('superSecret'), {
                        expiresIn: app.get('expiresIn')
                    });
                    res.json({
                        sucess: true,
                        message: 'Authenticated',
                        _id: user._id,
                        token: token
                    });
                } else {
                    res.status(400).json({ sucess: false, message: 'Authenticate failed. Wrong password.' });
                }
            });
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
            delete user.groups;
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
            delete user.groups;
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
                        user.updateAt =
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
                            delete x.groups;
                            return x;
                        });
                        res.json({contacts:contactsAbstract});
                    } else {
                        res.json({contacts:[]});
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

// remove a contact
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
                    sucess: true,
                    message: 'Deleted.'
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

// Remove a user
apiRoutes.delete('/users/id/:id', function (req, res) {
    User.findOne({ _id: req.params.id }, function (err, user) {
        if (err) throw err;
        if (user) {
            user.isActive = false;
            user.save(function (err) {
                if (err) throw err;
            });
            res.json({
                sucess: true,
                message: 'Complete',
                _id: user._id
            });
        } else {
            return res.status(400).send({
                sucess: false,
                message: 'User does not exist.'
            });
        }
    });
});

// Update a user
apiRoutes.put('/users/id/:id', function (req, res) {
    if (!req.body.username || !req.body.password || !req.body.name || !req.body.email) {
        return res.status(400).send({ sucess: false, message: 'Invalid input' });
    } else {
        User.findOne({ _id: req.params.id }, function (err, user) {
            if (!user) {
                return res.status(400).send({
                    sucess: false,
                    message: 'Username does not exisit.'
                })
            } else {
                user.username = req.body.username;
                user.password = req.body.password;
                user.name = req.body.name;
                user.email = req.body.email;
                user.admin = false;
                user.save(function (err) {
                    if (err) throw err;
                });
                res.json({
                    sucess: true,
                    message: 'Complete'
                });
            }
        })
    }
});


// Create a group
apiRoutes.post('/groups', function (req, res) {
    if (!req.body.groupname || !req.body.name || !req.body.userid) {
        return res.status(400).send({ sucess: false, message: 'Invalid input' });
    } else {
        Group.findOne({ groupname: req.body.groupname }, function (err, group) {
            if (group) {
                return res.status(400).send({
                    sucess: false,
                    message: 'Groupname already exisits.'
                });
            } else {
                User.findOne({ _id: req.body.userid }, function (err, user) {
                    if (!user) {
                        return res.status(400).send({
                            sucess: false,
                            message: 'User does not exist.'
                        });
                    } else {
                        var newGroup = new Group({
                            groupname: req.body.groupname,
                            name: req.body.name,
                            createdBy: user._id,
                            members: [user._id]
                        });
                        newGroup.save(function (err) {
                            if (err) throw err;
                        });
                        user.groups.push(newGroup._id);
                        user.save(function (err) {
                            if (err) throw err;
                        });
                        res.json({
                            sucess: true,
                            message: 'Complete',
                            _id: newGroup._id
                        });
                    }
                });
            }
        });
    }
});

// Get a group by id
apiRoutes.get('/groups/:id', function (req, res) {
    Group.findOne({ _id: req.params.id }, function (err, group) {
        if (!group) {
            return res.status(400).send({
                sucess: false,
                message: 'Group cannot be found.'
            });
        } else {
            res.json(group);
        }
    });
});

// Update a group by id
apiRoutes.put('/groups/:id', function (req, res) {
    if (!req.body.groupname || !req.body.name) {
        return res.status(400).send({ sucess: false, message: 'Invalid input' });
    } else {
        Group.findOne({ _id: req.params.id }, function (err, group) {
            if (group) {
                group.groupname = req.body.groupname;
                group.name = req.body.name;
                group.save(function (err) {
                    if (err) throw err;
                });
                res.json({
                    sucess: true,
                    message: 'Complete',
                    _id: group._id
                });
            } else {
                return res.status(400).send({
                    sucess: false,
                    message: 'Gourp does not exist.'
                });
            }
        });
    }
});


// Add a member to a group
apiRoutes.put('/groups/:groupid/members/:memberid', function (req, res) {
    Group.findOne({ _id: req.params.groupid }, function (err, group) {
        if (err) throw err;
        if (group) {
            User.findOne({ _id: req.params.memberid }, function (err, member) {
                if (err) throw err;
                if (member) {
                    if (group.members.indexOf(member._id) == -1) {
                        group.members.push(member._id);
                        group.save(function (err) {
                            if (err) throw err;
                        });
                        member.groups.push(group._id);
                        member.save(function (err) {
                            if (err) throw err;
                        });
                        res.json({
                            sucess: true,
                            message: 'Member added.'
                        });
                    } else {
                        res.status(400).json({
                            sucess: false,
                            message: 'Member already exists.'
                        });
                    }
                } else {
                    res.status(400).json({
                        sucess: false,
                        message: 'Member cannot be found.'
                    })
                }
            });
        } else {
            res.status(400).json({
                sucess: false,
                message: 'Group cannot be found.'
            })
        }
    });
});

// Remove a user from a group
apiRoutes.delete('/groups/:groupid/members/:memberid', function (req, res) {
    Group.findOne({ _id: req.params.groupid }, function (err, group) {
        if (err) throw err;
        if (group) {
            index = group.members.indexOf(req.params.memberid);
            if (index == -1) {
                res.status(400).json({
                    sucess: false,
                    message: 'Member cannot be found.'
                });
            } else {
                group.members.splice(index, 1);
                group.save(function (err) {
                    if (err) throw err;
                });
                User.findOne({ _id: req.params.memberid }, function (err, member) {
                    if (err) throw err;
                    if (member) {
                        index2 = member.groups.indexOf(group._id);
                        member.groups.splice(index2, 1);
                        member.save(function (err) {
                            if (err) throw err;
                        });
                    }
                });
                res.json({
                    sucess: true,
                    message: 'Deleted.'
                });
            }
        } else {
            res.status(400).json({
                sucess: false,
                message: 'Group cannot be found.'
            })
        }
    });
});

// Remove a group
apiRoutes.delete('/groups/:id', function (req, res) {
    Group.findOne({ _id: req.params.id }, function (err, group) {
        if (err) throw err;
        if (group) {
            group.isActive = false;
            group.save(function (err) {
                if (err) throw err;
            });
            res.json({
                sucess: true,
                message: 'Complete',
                _id: group._id
            });
        } else {
            return res.status(400).send({
                sucess: false,
                message: 'Group does not exist.'
            });
        }
    });
});


app.use('/api/' + app.get('version'), apiRoutes);

app.listen(port);
console.log('Server running on port ' + port);
