

EasyRPGMultiplayer.setSendMessageCallback(function(message, username, isGlobal) {
	document.getElementById("Player").contentWindow.easyrpgPlayer.sendChatMessage(message, username, !!isGlobal);
});

EasyRPGMultiplayer.setOnAuthResolvedCallback(function(result) {
	document.getElementById("Player").contentWindow.easyrpgPlayer.sendName(result.username);
});