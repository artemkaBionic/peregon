'use strict'

const request = require('supertest');
const server = require('../bin/www');
const chai = require('chai');
const should = require('should');
const app = require('../app');

chai.use(should);
// Module for testing non-exported functions
var rewire = require('rewire');
var inventory = rewire('../inventory');
var changeDeviceFormat = inventory.__get__('changeDeviceFormat'); 



describe('android_session', function () {
    it('should create session object', function (done) {
        request(app)
            .post('/data/inventory/session/start')
            .send({
                "item": {
                "InventoryNumber": "1302762807",
                "Manufacturer": "Samsung",
                "Model": "Galaxy S5 5.1",
                "Serial": "352570063169276",
                "Sku": "7393TS5",
                "StoreCode": "AC01"
                        },
                'type': "android"
            })            
            .end(function () {
                request(app)
                    .post('/data/inventory/session/update')
                    .send({
                        "itemNumber": "1302762807",
                        "message": "device  locked by someone"
                    })
                    .end(function() {
                        request(app)
                        .post('/data/inventory/session/finish')
                        .send({
                            "details": {complete: true},
                            "itemNumber": "1302762807"
                        })
                        .expect(200)
                        .end(function (err, res) {
                            console.log(res.body);
                            res.body.should.have.property('success'); 
                            done();
                        });
                    })
                    

            });
    })
    it('should convert device object to AWS API format', function () {
    
        var device = {
            InventoryNumber: '1302762807',
            Manufacturer: 'Samsung',
            Model: 'Galaxy S5 5.1',
            Serial: '352570063169276',
            Sku: '7393TS5',
            StoreCode: 'AC01'
        }
        var session_device = changeDeviceFormat(device);
        session_device.should.have.property('manufacturer');
    })

})


