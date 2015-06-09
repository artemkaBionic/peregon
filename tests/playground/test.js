var _ = require('lodash');
var data = require('./data.json').result;

var result = calculateUsage(data);
result = transformSummaryChartData(result);

console.log(JSON.stringify(result, null, 2));

function calculateUsage(data){
    var map = {
        'total': 'u_total_charges',
        'chargesLocalVoice': 'u_ac_local_voice_charges',
        'chargesLocalData': 'u_ac_local_data_charges',
        'chargesLocalMessages': 'u_ac_local_messages_charges',
        'chargesRoamingVoice': 'u_voice_roaming_charges',
        'chargesRoamingData': 'u_data_roaming_charges',
        'chargesRoamingMessages': 'u_message_roaming_charges',
        'chargesEquipment': 'u_equipment_charges',
        'chargesOther': 'u_other_charges',
        'chargesService': 'u_service_charges',
        'chargesRecurring': 'u_recurring_charges',
        'chargesTaxes': 'u_taxes'
    };

    //prepare empty structure for storing data
    var typeHash = {};
    _.each(map, function(element, key, list) {
        typeHash[key] = 0;
    });

    return _.chain(data)
        .groupBy("u_ac_month")
        .map(function(value, key, list) {
            var month = key;

            //calculate sum by type. result: {month: { type1: value1, type2: value2, ...}}
            var byType = _.reduce(value, function(memo, current){
                _.each(map, function(element, key, list) {
                    var field = map[key];
                    memo[key] += Number(current[field]);
                });
                return memo;
            }, typeHash);

            //extract type and value. result: { month: month, type: type1, amount: value1 }, ...}
            var result = [];
            _.each(byType, function(value, key) {

                result.push({month: month, type: key, amount: value});
            });
            return result;
        })
        .flatten()
        .value();
}

function transformSummaryChartData(data) {
    //Transform data into expected format
    //[{ key: "series", values: [[x,y], [x,y]] }]
    var summaryByType = _.chain(data)
        .groupBy("type")
        .map(function(value, key, list){
            var values = _.map(value, function(value, key, list) {
                return [value.month, value.amount]
            });

            return {key: key, values: values};
        })
        .value();

    return summaryByType;
}
