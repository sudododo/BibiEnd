var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Group', new Schema({
    groupname: String,
    name: String,
    desc: String,
    avatar: String,
    members: [{type: Schema.Types.ObjectId, ref: 'User'}],
    createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
}));