/**
 * Created by Admin on 20-07-2016.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProductSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    price:{
        type: Number,
        required: true
    },
    arrivaldate:{
        type: Date
    },
    productimg: {
        type: String
    }
});

module.exports = mongoose.model('Productupload', ProductSchema);