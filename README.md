# co-weixin-pay
[weixin-pay](https://github.com/lext-7/weixin-pay) with co

## Usage

install from npm
```
npm install co-weixin-pay
```

创建统一支付订单
```js
var WXPay = require('weixin-pay');

var wxpay = WXPay({
	appid: 'xxxxxxxx',
	mch_id: '1234567890',
	partner_key: 'xxxxxxxxxxxxxxxxx', //微信商户平台API密钥
	pfx: fs.readFileSync('./wxpay_cert.p12'), //微信商户平台证书
});

var result =  yield wxpay.createUnifiedOrder({
	body: '扫码支付测试',
	out_trade_no: '20140703'+Math.random().toString().substr(2, 10),
	total_fee: 1,
	spbill_create_ip: '192.168.2.210',
	notify_url: 'http://wxpay_notify_url',
	trade_type: 'NATIVE',
	product_id: '1234567890'
});
```

查询订单
```js
// 通过微信订单号查
var result =  yield wxpay.queryOrder({ transaction_id:"xxxxxx" });

// 通过商户订单号查
var result =  yield wxpay.queryOrder({ out_trade_no:"xxxxxx" });
```

关闭订单
```js
var result =  yield wxpay.closeOrder({ out_trade_no:"xxxxxx"});
```
退款接口
```js
var params = {
	appid: 'xxxxxxxx',
	mch_id: '1234567890',
    op_user_id: '商户号即可',
    out_refund_no: '20140703'+Math.random().toString().substr(2, 10),
    total_fee: '1', //原支付金额
    refund_fee: '1', //退款金额
    transaction_id: '微信订单号'
};

var result = yield  wxpay.refund(params);
```

### 原生支付 (NATIVE)

#### 模式一

提供一个生成支付二维码链接的函数，把url生成二维码给用户扫。

```js
var url = wxpay.createMerchantPrepayUrl({ product_id: '123456' });
```

商户后台收到微信的回调之后，调用 createUnifiedOrder() 生成预支付交易单，将结果的XML数据返回给微信。

[什么是模式一？](http://pay.weixin.qq.com/wiki/doc/api/native.php?chapter=6_4)

#### 模式二

直接调用 createUnifiedOrder() 函数生成预支付交易单，将结果中的 code_url 生成二维码给用户扫。

[什么是模式二？](http://pay.weixin.qq.com/wiki/doc/api/native.php?chapter=6_5)

### 公众号支付 (JS API)

生成JS API支付参数，发给页面
```js
var result = yield  wxpay.getBrandWCPayRequestParams({
	openid: '微信用户 openid',
	body: '公众号支付测试',
    detail: '公众号支付测试',
	out_trade_no: '20150331'+Math.random().toString().substr(2, 10),
	total_fee: 1,
	spbill_create_ip: '192.168.2.210',
	notify_url: 'http://wxpay_notify_url'
});
```

网页调用参数（以ejs为例）
```js
WeixinJSBridge.invoke(
	"getBrandWCPayRequest", <%-JSON.stringify(payargs)%>, function(res){
		if(res.err_msg == "get_brand_wcpay_request:ok" ) {
    		// success
    	}
});
```

### 中间件

商户服务端处理微信的回调（koa为例）
```js

app.use(function *() {
	var result = yield wxpay.parseCallbacl(this);

	// handle with callback data
	result.data;
	// ...

	// return success
	this.body = result.success;
	// return fail
	this.body = result.fail;
});
```


### 企业支付

```js
var result = yield wxpay.transfer({
	partner_trade_no: '3123123123', // 订单号
	openid: 'openid',
	amount: 100, // 分为单位
	desc: '描述',
	spbill_create_ip: '192.168.2.210', // ip,
	check_name: 'NO_CHECK', //默认为 NO_CHECK, 可不填
});
```
