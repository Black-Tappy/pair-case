import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser } from '@whiskeysockets/baileys';
import { upload } from './mega.js';

const router = express.Router();

// Ensure the session directory exists
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './' + (num || `session`);
    
    // Remove existing session if present
    await removeFile(dirs);

    let retryCount = 0;
    const MAX_RETRIES = 5;

    // Enhanced session initialization function
    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            // Initialize socket connection
            const logger = pino({ level: 'info' }).child({ level: 'info' });

            let Tohidkhan6332 = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger: logger,
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });

            if (!Tohidkhan6332.authState.creds.registered) {
                await delay(2000);
                num = num.replace(/[^0-9]/g, '');
                const code = await Tohidkhan6332.requestPairingCode(num);
                if (!res.headersSent) {
                    console.log({ num, code });
                    await res.send({ code });
                }
            }

            Tohidkhan6332.ev.on('creds.update', saveCreds);

            Tohidkhan6332.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    console.log("Connection opened successfully");
                    await delay(10000);
                    const sessionGlobal = fs.readFileSync(dirs + '/creds.json');

                    // Helper to generate a random Mega file ID
                    function generateRandomId(length = 6, numberLength = 4) {
                        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        let result = '';
                        for (let i = 0; i < length; i++) {
                            result += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                        const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                        return `${result}${number}`;
                    }

                    // Upload session file to Mega
                    const megaUrl = await upload(fs.createReadStream(`${dirs}/creds.json`), `${generateRandomId()}.json`);

                    // Add "UMAR=" prefix to the session ID
                    let stringSession = `${megaUrl.replace('https://mega.nz/file/', '')}`;

                    // Send the session ID to the target number
                    const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                    await Tohidkhan6332.sendMessage(userJid, { text: stringSession });

                    // Send confirmation message
                    await Tohidkhan6332.sendMessage(userJid, { 
                        text: `
*Hello there Shadow-Xtech User! 👋🏻* 
╭──────────────────
│ 𝔖𝔥𝔞𝔡𝔬𝔴-𝔛𝔱𝔢𝔠𝔥 ℭ𝔬𝔫𝔫𝔢𝔠𝔱𝔢𝔡 🛠️
╰──────────────────                      
╭──────────────────
│ 𝔇𝔬𝔫'𝔱 𝔰𝔥𝔞𝔯𝔢 𝔰𝔢𝔰𝔰𝔦𝔬𝔫 𝔴𝔦𝔱𝔥 𝔶𝔬𝔲 G𝔉😂
╰──────────────────
╭──────────────────
│ *T𝔥𝔞𝔫𝔨𝔰 𝔣𝔬𝔯 𝔲𝔰𝔦𝔫𝔤 𝔖𝔥𝔞𝔡𝔬𝔴-X𝔱𝔢𝔠𝔥 ✨* 
╰──────────────────
╭──────────────────
│ 🔗 𝔉𝔬𝔩𝔩𝔬𝔴 𝔪y W𝔥𝔞𝔱𝔰𝔄𝔭𝔭 ℭ𝔥𝔞𝔫𝔫𝔢𝔩:
╰──────────────────
╭────────────────── 
│ https://whatsapp.com/channel/0029VasHgfG4tRrwjAUyTs10
╰──────────────────
╭──────────────────
│ 𝔇𝔬𝔫𝔱 𝔣𝔬𝔯𝔤𝔢𝔱 𝔱𝔬 𝔣𝔬𝔯𝔨 𝔱𝔥𝔢 𝔯𝔢𝔭𝔬 ⬇️
╰──────────────────
╭──────────────────
│ https://github.com/Tappy-Black/Shadow-Xtech-V1
╰──────────────────
╭──────────────────
│G𝔢𝔱 𝔯𝔦𝔤𝔥𝔱 w𝔦𝔱𝔠𝔥𝔞🩷🎀 .
╰──────────────────
╭──────────────────
│ *© 𝔓𝔬𝔴𝔢𝔯𝔢𝔡 𝔟y B𝔩𝔞𝔠𝔨-T𝔞𝔭𝔭y 🎀🩷*
╰──────────────────
` 
                    });

                    // Clean up session after use
                    await delay(100);
                    removeFile(dirs);
                    process.exit(0);
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    console.log('Connection closed unexpectedly:', lastDisconnect.error);
                    retryCount++;

                    if (retryCount < MAX_RETRIES) {
                        console.log(`Retrying connection... Attempt ${retryCount}/${MAX_RETRIES}`);
                        await delay(10000);
                        initiateSession();
                    } else {
                        console.log('Max retries reached, stopping reconnection attempts.');
                        await res.status(500).send({ message: 'Unable to reconnect after multiple attempts.' });
                    }
                }
            });
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }

    await initiateSession();
});

// Ensure session cleanup on exit or uncaught exceptions
process.on('exit', () => {
    removeFile(dirs);
    console.log('Session file removed.');
});

// Catch uncaught errors and handle session cleanup
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    removeFile(dirs);
    process.exit(1);  // Ensure the process exits with error
});

export default router;
