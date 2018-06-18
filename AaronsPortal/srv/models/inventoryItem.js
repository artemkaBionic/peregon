'use strict';

var mongoose = require('../lib/mongoose');
var Schema = mongoose.Schema;

var InventoryItemSchema = new Schema({
    item_number: {
        type: String,
        required: true,
        unique: true
    },
    sku: {
        type: String,
        required: true
    },
    manufacturer: {
        type: String,
        required: false
    },
    model: {
        type: String,
        required: false
    },
    serial_number: {
        type: String,
        required: false
    },
    store: {
        type: String,
        required: false
    },
    purchased: {
        type: Date,
        required: false
    },
    first_leased: {
        type: Date,
        required: false
    },
    last_leased: {
        type: Date,
        required: false
    },
    store_last_received: {
        type: Date,
        required: false
    }
});

module.exports = mongoose.model('inventory_items', InventoryItemSchema);
