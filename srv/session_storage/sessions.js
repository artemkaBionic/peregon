var Db = require('tingodb')().Db,
    assert = require('assert');
exports.test = test;
var db = new Db('.', {});
// Fetch a collection to insert document into
var collection = db.collection("sessions");
// Insert a single document
function test(){
    // collection.insert([{hello:'world_safe1'}
    //     , {hello:'world_safe2'}], {w:1}, function(err, result) {
    //     assert.equal(null, err);
    //
    //     // Fetch the document
    //
    // });
    collection.find({}).toArray(function(err, result) {
        if (err) throw err;
        console.log(result);

    });
}
