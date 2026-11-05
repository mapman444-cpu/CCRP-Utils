const fs = require('fs');
const path = require('path');

function loadEvents(client) {
  const eventsPath = path.join(__dirname, 'events'); 
  if (!fs.existsSync(eventsPath)) return;

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  let loadedCount = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event.name || typeof event.execute !== 'function') {
      console.log(`[WARNING] Event at ${file} is missing a "name" string or an "execute" function.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    loadedCount++;
  }

  console.log(`[EVENT LOADER] Loaded ${loadedCount} global event listener(s).`);
}

module.exports = { loadEvents };
 