const { JsonStore } = require('./store');
const path = require('path');

function serversStore(instanceDir) {
  return new JsonStore(path.join(instanceDir, '.camel-servers.json'), { list: [] });
}

function listServers(instanceDir) {
  return serversStore(instanceDir).get('list') || [];
}

function addServer(instanceDir, { name, address }) {
  if (!name || !address) throw new Error('Server needs both a name and an address.');
  const store = serversStore(instanceDir);
  const list = store.get('list') || [];
  const entry = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, address };
  store.set('list', [...list, entry]);
  return entry;
}

function removeServer(instanceDir, id) {
  const store = serversStore(instanceDir);
  const list = store.get('list') || [];
  store.set('list', list.filter((s) => s.id !== id));
}

/** Stamps "last played" for the Home page's recent-activity list. */
function touchServer(instanceDir, id) {
  const store = serversStore(instanceDir);
  const list = store.get('list') || [];
  const server = list.find((s) => s.id === id);
  if (!server) return;
  server.lastPlayedAt = Date.now();
  store.set('list', list);
}

/** Parses "host" or "host:port" into xmcl's { ip, port } launch option shape. */
function parseAddress(address) {
  const [ip, portStr] = address.split(':');
  const port = portStr ? parseInt(portStr, 10) : undefined;
  return port ? { ip, port } : { ip };
}

module.exports = { listServers, addServer, removeServer, touchServer, parseAddress };
