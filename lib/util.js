var xml2js = require('co-xml2js');


var xmlParser = new xml2js.Parser({ trim:true, explicitArray:false, explicitRoot:false });
var xmlBuilder = new xml2js.Builder();

exports.toXml = function(json){
	return xmlBuilder.buildObject(json);
};

exports.fromXml = function* (xml){
	return yield xmlParser.parseString(xml);
};

exports.generateNonceString = function(length){
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var maxPos = chars.length;
	var noceStr = "";
	for (var i = 0; i < (length || 32); i++) {
		noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return noceStr;
};
