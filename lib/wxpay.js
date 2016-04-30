var util = require('./util');
var request = require('co-request');
var md5 = require('MD5');

var extend = require('util')._extend;

exports = module.exports = WXPay;

function WXPay() {

    if (!(this instanceof WXPay)) {
        return new WXPay(arguments[0]);
    };

    this.options = arguments[0];
    this.wxpayID = {
        appid: this.options.appid,
        mch_id: this.options.mch_id
    };
};

WXPay.mix = function() {

    switch (arguments.length) {
        case 1:
            var obj = arguments[0];
            for (var key in obj) {
                if (WXPay.prototype.hasOwnProperty(key)) {
                    throw new Error('Prototype method exist. method: ' + key);
                }
                WXPay.prototype[key] = obj[key];
            }
            break;
        case 2:
            var key = arguments[0].toString(),
                fn = arguments[1];
            if (WXPay.prototype.hasOwnProperty(key)) {
                throw new Error('Prototype method exist. method: ' + key);
            }
            WXPay.prototype[key] = fn;
            break;
    }
};

WXPay.mix('option', function(option) {
    for (var k in option) {
        this.options[k] = option[k];
    }
});

WXPay.mix('sign', function(param) {

    var querystring = Object.keys(param).filter(function(key) {
        return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key) < 0;
    }).sort().map(function(key) {
        return key + '=' + param[key];
    }).join("&") + "&key=" + this.options.partner_key;

    return md5(querystring).toUpperCase();
});

WXPay.mix('createUnifiedOrder', function*(opts) {

    opts.nonce_str = opts.nonce_str || util.generateNonceString();
    extend(opts, this.wxpayID);
    opts.sign = this.sign(opts);

    var res = yield request({
        url: "https://api.mch.weixin.qq.com/pay/unifiedorder",
        method: 'POST',
        body: util.toXml(opts),
        agentOptions: {
            pfx: this.options.pfx,
            passphrase: this.options.mch_id
        }
    });

    return yield util.fromXml(res.body);
});

WXPay.mix('getBrandWCPayRequestParams', function*(order, fn) {

    order.trade_type = "JSAPI";
    var data = yield this.createUnifiedOrder(order);

    var reqparam = {
        appId: this.options.appid,
        timeStamp: Math.floor(Date.now() / 1000) + "",
        nonceStr: data.nonce_str,
        package: "prepay_id=" + data.prepay_id,
        signType: "MD5"
    };
    reqparam.paySign = this.sign(reqparam);

    return reqparam;
});

WXPay.mix('createMerchantPrepayUrl', function(param) {

    param.time_stamp = param.time_stamp || Math.floor(Date.now() / 1000);
    param.nonce_str = param.nonce_str || util.generateNonceString();
    extend(param, this.wxpayID);
    param.sign = this.sign(param);

    var query = Object.keys(param).filter(function(key) {
        return ['sign', 'mch_id', 'product_id', 'appid', 'time_stamp', 'nonce_str'].indexOf(key) >= 0;
    }).map(function(key) {
        return key + "=" + encodeURIComponent(param[key]);
    }).join('&');

    return "weixin://wxpay/bizpayurl?" + query;
});

WXPay.mix('parseCallback', function *(ctx) {

    var xml = yield new Promise(function (resolve, reject) {
      var buffers = [];

      ctx.req.on('data', function(trunk) {
          buffers.push(trunk);
      });

      ctx.req.on('end', function() {
          var xml = Buffer.concat(buffers).toString('utf8');
          resolve(xml);
      });

      ctx.req.once('error', function (err) {
        reject(err);
      });

    });

    return {
        success: util.toXml({
            xml: {
                return_code: 'SUCCESS'
            }
        }),
        fail: util.toXml({
            xml: {
                return_code: 'FAIL'
            }
        }),
        data: yield util.fromXml(xml)
    };
});

WXPay.mix('queryOrder', function*(query) {

    if (!(query.transaction_id || query.out_trade_no)) {
        throw {
            return_code: 'FAIL',
            return_msg: '缺少参数'
        };
    }

    query.nonce_str = query.nonce_str || util.generateNonceString();
    extend(query, this.wxpayID);
    query.sign = this.sign(query);

    var res = yield request({
        url: "https://api.mch.weixin.qq.com/pay/orderquery",
        method: "POST",
        body: util.toXml({
            xml: query
        })
    });
    return yield util.fromXml(res.body);
});

WXPay.mix('closeOrder', function*(order) {

    if (!order.out_trade_no) {
        throw {
            return_code: "FAIL",
            return_msg: "缺少参数"
        };
    }

    order.nonce_str = order.nonce_str || util.generateNonceString();
    extend(order, this.wxpayID);
    order.sign = this.sign(order);

    var res = yield request({
        url: "https://api.mch.weixin.qq.com/pay/closeorder",
        method: "POST",
        body: util.toXml({
            xml: order
        })
    });
    return yield util.fromXml(res.body);
});

WXPay.mix('refund', function*(order) {
    if (!(order.transaction_id || order.out_refund_no)) {
        throw {
            return_code: 'FAIL',
            return_msg: '缺少参数'
        };
    }

    order.nonce_str = order.nonce_str || util.generateNonceString();
    if (!order.op_user_id) {
        order.op_user_id = this.wxpayID.mch_id;
    }
    extend(order, this.wxpayID);
    order.sign = this.sign(order);

    var res = yield request({
        url: "https://api.mch.weixin.qq.com/secapi/pay/refund",
        method: "POST",
        body: util.toXml({
            xml: order
        }),
        agentOptions: {
            pfx: this.options.pfx,
            passphrase: this.options.mch_id
        }
    });

    return yield util.fromXml(res.body);
});

WXPay.mix('transfer', function*(opts) {
    opts.nonce_str = opts.nonce_str || util.generateNonceString();
    opts.check_name = opts.check_name || 'NO_CHECK';
    extend(opts, {
        mch_appid: this.wxpayID.appid,
        mchid: this.wxpayID.mch_id
    });
    opts.sign = this.sign(opts);

    var res = yield request({
        url: "https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers",
        method: 'POST',
        body: util.toXml(opts),
        agentOptions: {
            pfx: this.options.pfx,
            passphrase: this.options.mch_id
        }
    });
    return yield util.fromXml(res.body);
});
