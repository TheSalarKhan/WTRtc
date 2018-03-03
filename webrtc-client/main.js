// These are the html elements.
var localVideo = document.getElementById('local-video');
var remoteVideo = document.getElementById('remote-video');

// This is the state variable and it contains all the variables
// that we will be needing for a webRTC session.
var state = {
    signalingChannel: null,
    localStream: null,
    peerConnectionClient: null,
    peerConnectionParams: {
        peerConnectionConfig: {
            rtcpMuxPolicy: 'require',
            bundlePolicy: 'max-bundle',
            certificates: [],
            iceServers: [
                {
                    "urls":["stun:stun.l.google.com:19302"]
                }
            ]
        },
        peerConnectionConstraints: { optional: [{DtlsSrtpKeyAgreement:false}] },
        videoRecvCodec: "VP9"
    }
}

/**
	For a given message string this function returns the message that would be
	returned from the other end.
*/
function getLoopbackResponse(msg) {
	// Convert string to object.
	var message;
	try {
		message = JSON.parse(msg);
	} catch (e) {
		trace('Error parsing JSON: ' + msg);
		return;
	}
	// If its an offer convert it to an answer.
	// If its a candidate, return it as is.
	if (message.type === 'offer') {
		var loopbackAnswer = msg + '';
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
	} else if (message.type === 'candidate') {
		return msg;
	} else {
		trace('Returning null, this is bad!!');
		return null;
	}
}

// This is a loopback signaling server.
signalingServer = {
	onmessage: function(message) {
		// This function is called when we receive a message from the other side.
		if(state.peerConnectionClient) {
			state.peerConnectionClient.receiveSignalingMessage(message);
		}
	},
	send: function(message) {
		this.onmessage(getLoopbackResponse(message));
	}
}

/**
 * After the initialization of the signaling channel, this is the second step
 * in establishing a call. In this step we get the users media, and unless we have media
 * we will not be performing any calls.
 */
function startGettingUserMedia() {
    mediaConstraints = {
        video: true,
        audio: true
    };
    mediaPromise = navigator.mediaDevices.getUserMedia(mediaConstraints)
        .catch(function(error) {
            trace("Error in getting user media.");
        })
        .then(function(stream) {
          // When we have the stream, we print a log, and then
          // show it on the local video div.
          trace('Got access to local media with mediaConstraints:\n' +
          '  \'' + JSON.stringify(mediaConstraints) + '\'');
          localVideo.src = window.URL.createObjectURL(stream);
          state.localStream = stream;
          maybeCreatePcClientAsync();
        });
}

function maybeCreatePcClientAsync() {
    return new Promise(function(resolve, reject) {
      if (state.peerConnectionClient) {
        resolve();
        return;
      }
      if (typeof RTCPeerConnection.generateCertificate === 'function') {
        var certParams = {name: 'ECDSA', namedCurve: 'P-256'};
        RTCPeerConnection.generateCertificate(certParams)
            .then(function(cert) {
              trace('ECDSA certificate generated successfully.');
              state.peerConnectionParams.peerConnectionConfig.certificates = [cert];
              createPeerClientObject();
              resolve();
            }.bind(this))
            .catch(function(error) {
              trace('ECDSA certificate generation failed.');
              reject(error);
            });
      } else {
        createPeerClientObject();
        resolve();
      }
    }.bind(this));
  };

/**
 * Now that we have the media, we are in a ready state. By ready state it means that this
 * node is properly connected to the signaling channel, and it also has access to user's media.
 * Now all that happens is wait. Here we are waiting for two events, either we are waiting for someone
 * to call us, or we are waiting for us to call someone.
 */
function createPeerClientObject() {
    // line 475, call.js.
    var startTime = window.performance.now();
    var pcClient = new PeerConnectionClient(state.peerConnectionParams, startTime);
    pcClient.onsignalingmessage = function(message) {
        // Send this message to the other side.
        stringToSend = JSON.stringify(message);
        signalingServer.send(stringToSend);
    };
    pcClient.onremotehangup = function() {
        // When the other side hangs-up we also
        // hangup.
        if(pcClient) {
            pcClient.close();
        }
    };
    pcClient.onremotesdpset = function(hasRemoteVideo) {
        // console.error("On remote sdp set.");
        // console.log(hasRemoteVideo);
        // If hasRemoteVideo, then wait for the video to arrive,
        // else do nothing.
        if(hasRemoteVideo) {
            if(remoteVideo.readyState >= 2) { // if can-play
                // This is where the code will end up upon the receipt
                // of remote stream.
            } else {
                remoteVideo.oncanplay = pcClient.onremotesdpset.bind(pcClient);
            }
        }
    };
    pcClient.onremotestreamadded = function(stream) {
        console.error("Remote stream added!");
        remoteVideo.srcObject = stream;
    };
    pcClient.onsignalingstatechange = function() {
        // console.log("On signaling state changed")
        //update info div
    };
    pcClient.oniceconnectionstatechange = function() {
        // console.log("On Ice connection state chagned")
        // update info div
    };
    pcClient.onnewicecandidate = function() {
        // console.log("On new ICE Candidate.");
        // on new ice candidate.
        // an ice candidate that has not been
        // seen before.
    };
    pcClient.onerror = function(error) {
        trace("Got error: ");
        trace(error);
    };
    // Save this object in the state.
    state.peerConnectionClient = pcClient;

    console.log("Adding local stream: ");
    console.log(state.localStream);
    pcClient.addStream(state.localStream);

    var offerOptions = {};
    pcClient.startAsCaller(offerOptions);
}



startGettingUserMedia();
