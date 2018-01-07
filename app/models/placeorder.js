/**
 * Created by Admin on 07-01-2018.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var OrderSchema = new Schema({
    customerId: {
        type: String,
        required: true
    },
    orderData: {
        type: Array,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    totalamount: {
        type: Number,
        required: true
    },
    requestdate: {
        type: Date,
        default: Date.now
    },
    arrivaldate: {
        type: Date
    },
    orderPlaceDate: {
        type: Date
    },
    OrderReceived: {
        type: String,
    }
});

module.exports = mongoose.model('OrderRequest', OrderSchema);