var fs = require('fs');

function rnd(minimum, maximum, precision) {
    minimum = minimum === undefined ? 0 : minimum;
    maximum = maximum === undefined ? 9007199254740992 : maximum;
    precision = precision === undefined ? 0 : precision;

    var random = Math.random() * (maximum - minimum) + minimum;

    return Number(random.toFixed(precision));
}

var result = [];
for(var i = 1; i <= 12; i++) {
    var entry = {
        //charges
        chargesLocalVoice: rnd(1000,2000,2),
        chargesLocalData: rnd(70,150,2),
        chargesLocalMessages: rnd(2000,4000,2),
        chargesRoamingVoice: rnd(0,50,2),
        chargesRoamingData: rnd(4000,6000,2),
        chargesRoamingMessages: rnd(0,100,2),
        chargesEquipment: rnd(0,1000,2),
        chargesOther: rnd(0,200,2),
        chargesService: rnd(0,200,2),
        chargesRecurring: rnd(1000,3000,2),
        chargesTaxes: rnd(0,1000,2)
    };

    var total = 0;
    for(var charge in entry) {
        total += entry[charge];
    }
    entry.total = total;

    entry.year = 2015;
    entry.month = i;

    //usages
    entry.usageLocalVoice = rnd(200, 800);
    entry.usageLocalData = rnd(1500019, 2004019);
    entry.usageLocalMessages = rnd(300, 600);
    entry.usageRoamingVoice = rnd(300, 500);
    entry.usageRoamingData = rnd(400920, 700920);
    entry.usageRoamingMessages = rnd(400, 700);

    result.push(entry);
}

var output = fs.createWriteStream(__dirname + '/data.json');
output.write(JSON.stringify(result, null, 2));
output.end();





