const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:7999');

ws.on('open', function open() {
  ws.send('Hello there');
});

const NEGATIVE_RESPONSE = {
  category: 'error',
  data: 'Invalid message'
};
const CALL_NEGOTIATION = 'call-negotiation';
function getLoopBackResponse(message) {
  /**
   * The type of message expected here is:
   * {
   *  category: 'call-negotiation',
   *  type: "offer"/"candidate",
   *  data: "ajhlk4jh234 can be whatever"
   * }
   */
  var category = message.category;
  var type = message.type;

  if(category != undefined && type != undefined) {
    if (type === 'offer') {
      var loopbackAnswer = message.data;
      loopbackAnswer = loopbackAnswer.replace('"offer"', '"answer"');
      loopbackAnswer =
          loopbackAnswer.replace('a=ice-options:google-ice\\r\\n', '');
      // As of Chrome M51, an additional crypto method has been added when
      // using SDES. This works in a P2P due to the negotiation phase removes
      // this line but for loopback where we reuse the offer, that is skipped
      // and remains in the answer and breaks the call.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=616263
      loopbackAnswer = loopbackAnswer
          .replace(/a=crypto:0 AES_CM_128_HMAC_SHA1_32\sinline:.{44}/, '');
      return {
        category: CALL_NEGOTIATION,
        type: "answer",
        data: loopbackAnswer
      };
      sendLoopbackMessage(JSON.parse(loopbackAnswer));
    } else if (message.type === 'candidate') {
      return message;
    }
  } else {
    return NEGATIVE_RESPONSE;
  }
}


ws.on('message', function incoming(message) {
  try {
    message = JSON.parse(message);
  } catch(error) {
    ws.send(JSON.stringify(NEGATIVE_RESPONSE));
    return;
  }
  ws.send(JSON.stringify(getLoopBackResponse(message)));
});
