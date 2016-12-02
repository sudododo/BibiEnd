var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('User', new Schema({
    username: String,
    password: String,
    name: String,
    email: String,
    desc: String,
    avatar: String,
    admin: Boolean,
    contacts: [{type: Schema.Types.ObjectId, ref: 'User'}]
}));