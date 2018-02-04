/**
 * Created by Admin on 20-07-2016.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProductSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    modalno: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    arrivaldate: {
        type: Date,
        default: Date.now
    },
    productimages: {
        type: Array
    },
    image: {
        type: String
    },
    shortdescription: {
        type: Array
    },
    fulldescription: {
        type: Array
    }
});

module.exports = mongoose.model('productuploads', ProductSchema);