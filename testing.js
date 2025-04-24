import config from '../../config.cjs';

// Initialize PM block state in memory
if (typeof global.pmBlockEnabled === 'undefined') {
  global.pmBlockEnabled = config.PMBLOCK || false;
}

const pmblockCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const ownerNumbers = ['<254759000340@s.whatsapp.net', '254759000340@s.whatsapp.net'];
  const sudoNumbers = config.SUDOS.map((number) => `${number}@s.whatsapp.net`);
  const allowedNumbers = new Set([...ownerNumbers, ...sudoNumbers]);
  const sender = m.sender;
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  // PM Block ON/OFF Command
  if (cmd === 'pmblock') {
    if (sender !== config.OWNER_NUMBER + '@s.whatsapp.net') {
      return m.reply('*Only the owner can use this command.*');
    }

    if (text === 'on') {
      global.pmBlockEnabled = true;
      await Matrix.sendMessage(m.from, { text: 'PM Block feature has been enabled.' }, { quoted: m });
    } else if (text === 'off') {
      global.pmBlockEnabled = false;
      await Matrix.sendMessage(m.from, { text: 'PM Block feature has been disabled.' }, { quoted: m });
    } else {
      await Matrix.sendMessage(
        m.from,
        { text: 'Usage:
- `pmblock on`: Enable PM Block
- `pmblock off`: Disable PM Block' },
        { quoted: m }
      );
    }
  }

  // PM Block Functionality
  if (global.pmBlockEnabled) {
    if (!global.warningCounts) {
      global.warningCounts = {};
    }

    if (!allowedNumbers.has(sender)) {
      if (!global.warningCounts[sender]) {
        global.warningCounts[sender] = 0;
      }
      global.warningCounts[sender]++;

      if (global.warningCounts[sender] < 4) {
        await Matrix.sendMessage(
          m.from,
          {
            text: `*⚠️ Warning ${global.warningCounts[sender]}:*
@${sender.split('@')[0]} *Do not message this bot in private. Continuing will result in a block.*`,
            mentions: [sender],
          },
          { quoted: m }
        );
      } else {
        // Final block message and action
        await Matrix.sendMessage(
          m.from,
          { text: '*🚫 You have been blocked for repeatedly messaging this bot in private.*' },
          { quoted: m }
        );

        // Block the user
        await Matrix.updateBlockStatus(sender, 'block');
      }
    }
  }
};

export default pmblockCommand;
