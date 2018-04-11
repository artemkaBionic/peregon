'use strict';

var mongoose = require('../lib/mongoose');
var Schema = mongoose.Schema;

var InventoryProductSchema = new Schema({
    sku: {
        type: String,
        required: true,
        unique: true
    },
    full_description: {
        type: String,
        required: false
    },
    short_description: {
        type: String,
        required: false
    },
    department: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: false
    },
    subcategory: {
        type: String,
        required: false
    },
    manufacturer: {
        type: String,
        required: false
    },
    model_number: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: false
    }
});


module.exports = mongoose.model('inventory_products', InventoryProductSchema);
