//const https = require('https');
//const fs = require('fs');

const WebSocket = require('ws');

/*const server = https.createServer({
  cert: fs.readFileSync('ssl.cert'),
  key: fs.readFileSync('ssl.key'),
  ca: fs.readFileSync('ssl.ca')
}).listen(8443);*/

//const wss = new WebSocket.Server({ server });
const wss = new WebSocket.Server({port: 8080});
var players = {};
var projectiles = {};

var broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', function connection (ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  var playerid = (Math.random().toString(36)+'00000000000000000').slice(2, 10);
  var a = 50;
  var nex = Math.floor(Math.random()*200)+1;
  var ney = Math.floor(Math.random()*200)+1;
  Math.pythag = function(x, xx, y, yy) {
      return this.sqrt(this.pow(xx - x, 2) + this.pow(yy - y, 2));
  }
  players[playerid] = {
    name: "...",
    age: 1,
    ammo: 10,
    x: nex,
    y: ney,
    health: 100
  };
  var check = setInterval(function(){
    if (Math.floor(players[playerid].health) <= 0) {
      ws.send('["leave", {}]');
    }
  },50);
  var heal = setInterval(function(){
    if (players[playerid].health < 99) {
      players[playerid].health += 2;
    }
    if (players[playerid].ammo < 5) {
      players[playerid].ammo += 1;
    }
  },3000);
  var fn = {
    update: function({}){
      broadcast('["players", {"pl": '+JSON.stringify(players)+', "pr": '+JSON.stringify(projectiles)+'}]');
    },
    move: function({angle}){
      a = angle;
    },
    name: function({name}){
      players[playerid].name = name;
      this.update({});
    },
    left: function({}){
      if (players[playerid].ammo > 0) {
        players[playerid].ammo--;
        var pid = (Math.random().toString(36)+'00000000000000000').slice(2, 12)
        projectiles[pid] = {
          x: players[playerid].x,
          y: players[playerid].y,
          size: 20,
          owner: playerid,
          heading: 0
        }
        if (a !== 50) projectiles[pid].heading = a;
        var len = 0;
        var fly = setInterval(function(){
          var names = Object.keys(players);
          for (i=0;i<names.length;i++) {
            if (names[i] !== playerid) {
              var player = players[names[i]];
              var dist = Math.pythag(player.x, projectiles[pid].x, player.y, projectiles[pid].y);
              if (dist < (projectiles[pid].size + (player.age * 25)) / 2) {
                players[names[i]].health -= Math.round(projectiles[pid].size/1.5);
                players[playerid].age += Math.round(projectiles[pid].size)/100;
              }
            }
          }
          if (len <= 30) {
            projectiles[pid].x += 22*Math.cos(projectiles[pid].heading);
            projectiles[pid].y += 22*Math.sin(projectiles[pid].heading);
            projectiles[pid].size -= 0.5;
            fn.update({});
            len++;
          } else {
            delete projectiles[pid];
            clearInterval(this);
          }
        },50)
      }
    }
  };
  var movement = setInterval(function(){
    if (a !== 50) {
      nex += 2*Math.cos(a);
      ney += 2*Math.sin(a);
      players[playerid].x = nex;
      players[playerid].y = ney;
      fn.update({});
    }
  },50);
  ws.on('message', function message (msg) {
    var d = JSON.parse(msg);
    d[1] = d[1] || {};
    fn[d[0]](d[1]);
  });
  ws.on('close', function remove () {
    clearInterval(movement);
    clearInterval(check);
    clearInterval(heal);
    delete players[playerid];
    fn.update({});
  });
  ws.send('["one", {"id": "'+playerid+'"}]');
  fn.update({});
});
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);
