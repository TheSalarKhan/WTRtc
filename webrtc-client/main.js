var signalingServer = new WebSocket("ws://localhost:7999");
// This is the state variable and it contains all the variables
// that we will be needing for a webRTC session.
var state = {
    signalingChannel: null,
    localStream: null,
    peerConnection: null
}
signalingServer.onopen = function(event){
    trace("Signaling channel on!");
    state.signalingChannel = signalingServer;
    startGettingUserMedia();
};

signalingServer.onerror = function(err) {
    trace("Got ws error!");
    trace(error);
};

signalingServer.onmessage = function(message) {
    trace("Received message: ");
    console.log(message.data);
    signalingServer.send('Hi!');

};

/**
 * After the initialization of the signaling channel, this is the second step
 * in establishing a call. In this step we get the users media, and unless we have media
 * we will not be performing any calls.
 */
function startGettingUserMedia() {
    /**
     * When we have connected with the websocket, the first thing todo is to
     * get usermedia.
     */
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
          var videoElement = document.getElementById('local-video');
          videoElement.src = window.URL.createObjectURL(stream);
          state.localStream = stream;
        });
}

/**
 * Now that we have the media, we are in a ready state. By ready state it means that this
 * node is properly connected to the signaling channel, and it also has access to user's media.
 * Now all that happens is wait. Here we are waiting for two events, either we are waiting for someone
 * to call us, or we are waiting for us to call someone.
 */
function createPeerClientObject() {
    var startTime = window.performance.now();
    state.peerConnection = new PeerConnectionClient();
}