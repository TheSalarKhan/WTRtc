const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:7999');

ws.on('open', function open() {
  //ws.send('Hello there');
});

function getLoopBackResponse(message) {
  var msg = JSON.parse(message);
  var type = msg.type;

  if(type != undefined) {
    if (type === 'offer') {
      var loopbackAnswer = message;
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
      return loopbackAnswer;
    } else if (type === 'candidate') {
      return message;
    }
  } else {
    return '{}';
  }
}


ws.on('message', function incoming(message) {
  try {
    response = getLoopBackResponse(message);
    //console.log(response);
    ws.send(response);
  } catch(error) {
    ws.send(JSON.stringify({ 'message': 'Error while sending loopback response.' }));
    return;
  }
});
