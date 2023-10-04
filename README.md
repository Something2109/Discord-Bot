# Discord-Bot

## Features

- Playing music from the Youtube url with the `/music` commands.
- Controlling the minecraft server throught the `/mc-server` commands.

## Install

### Presiquite

1. Install [Nodejs](https://ngrok.com/) to create the runtime environment to run the bot.
2. Register your own bot from the [Discord's Developer Portal](https://discord.com/developers/applications) and write down the bot's token and id. Invite it to your server and mark down the server's guild id.
3. To run the minecraft server, you must install [Java](https://www.java.com/en/) and download the [Minecraft Server](https://www.minecraft.net/en-us/download/server) jar file to your computer/server. Then set up and make sure to enable rcon in the server (you can read the tutorial of how to set up the server [here](https://minecraft.fandom.com/wiki/Tutorials/Setting_up_a_server) and what to enable rcon [here](https://minecraft.fandom.com/wiki/Server.properties)).
4. This bot using [Ngrok](https://ngrok.com/) to expose your server to the internet, so make sure to download it (it's recommended to install this as a service to your computer/server to make sure it always runs when the bot is running, read how to do it from [here](https://ngrok.com/docs/secure-tunnels/ngrok-agent/installing-as-a-service/)).

### Install

1. Download the source code and extract it where you want.
2. Create your `.env` file based on the `.env.example`. Make sure to fill all the required field in the file.
3. Run the `npm install` command in the source code's directory to install the required package.
4. Run the `npm run compile` to compile the source code to the the javascript code to run.

## Run

To start the bot, run the command `npm run start` in the directory of the bot. Make sure the bot update all the command to the discord remote server.
