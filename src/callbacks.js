

EasyRPGMultiplayer.setSendMessageCallback(function(message, username) {
	document.getElementById("Player").contentWindow.easyrpgPlayer.sendChatMessage(message, username);
});

EasyRPGMultiplayer.setOnAuthResolvedCallback(function(result) {
	document.getElementById("Player").contentWindow.easyrpgPlayer.sendName(result.username);
});