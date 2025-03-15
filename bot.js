require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (!message.attachments.size) return;
    
    const attachment = message.attachments.first();
    const filePath = path.join(__dirname, attachment.name);
    
    const response = await fetch(attachment.url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    message.reply('Uploading video to YouTube...');

    uploadToYouTube(filePath, message);
});

async function uploadToYouTube(filePath, message) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'youtube_credentials.json', // Update with your JSON key file
            scopes: ['https://www.googleapis.com/auth/youtube.upload']
        });
        
        const youtube = google.youtube({
            version: 'v3',
            auth: await auth.getClient()
        });

        const videoTitle = `Uploaded from Discord - ${new Date().toISOString()}`;

        const response = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: videoTitle,
                    description: 'Uploaded via Discord bot',
                    tags: ['Discord', 'YouTube', 'Bot']
                },
                status: { privacyStatus: 'public' }
            },
            media: {
                body: fs.createReadStream(filePath)
            }
        });

        const videoId = response.data.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        message.reply(`Video uploaded successfully: ${videoUrl}`);
    } catch (error) {
        console.error(error);
        message.reply('Failed to upload the video.');
    } finally {
        fs.unlinkSync(filePath);
    }
}

client.login(process.env.DISCORD_BOT_TOKEN);
