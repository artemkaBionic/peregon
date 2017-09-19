var Db = require('tingodb')().Db,
    assert = require('assert');
var db = new Db('.', {});
var collection = db.collection("sessions");
exports.getAllSessions = getAllSessions;
exports.addSession = addSession;

function addSession(id, session){
    var session2 = session;
    session2._id = id;
    collection.insert([session2], {w:1}, function(err, result) {
        assert.equal(null, err);
    });
}

function getAllSessions(){
    collection.find({}).toArray(function(err, result) {
        if (err) throw err;
        console.log(result);

    });
}
