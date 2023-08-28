require('dotenv').config()
const { readCommands, refreshCommands, initEvent } = require('./util/utils');
const path = require('node:path');

// Require the necessary discord.js classes
const { Client, GatewayIntentBits } = require('discord.js');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commands = readCommands();

client.commands = commands.collection;

refreshCommands(commands.list);

initEvent(client);

// Log in to Discord with your client's token
client.login(process.env.TOKEN);