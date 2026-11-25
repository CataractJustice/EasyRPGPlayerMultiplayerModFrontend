/*
API
setOwnSprite(sheet, index);
resetOwnSpriteToDefault();

*/

const SpriteSetCommand = {
	execute: async function (args) 
	{
		const result = 
		{
			success: true,
			error: "",
			message: `command ${args[0]} executed`
		};
		const spriteSheets = gameIndexFile.cache.charset;
		const spriteSheet = args[1];
		//has to be [0;7]
		const spriteIndex = args[2];
		if(spriteSeets.hasOwnProperty(spriteSheet)) 
		{

		}
		else 
		{

		}
		return result;
	}
}

const SpriteDefaultCommand = 
{
	
}