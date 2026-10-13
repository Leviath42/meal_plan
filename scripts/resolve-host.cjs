#!/usr/bin/env node
// scripts/resolve-host.cjs — résolution DNS de secours pour update.sh (C-036)
//
// Quand le resolver du CT (box en DHCP) est en panne, github.com ne résout
// plus et la mise à jour échoue. Ce script interroge directement un DNS
// public en IP (1.1.1.1 puis 8.8.8.8) par UDP, sans dépendre du resolver
// système, et imprime l'adresse IPv4 sur stdout (rien en cas d'échec).
//
// Usage : node scripts/resolve-host.cjs github.com
// Sortie : l'IP (une ligne), ou rien + exit 1 si non résolu.
"use strict";
const dgram = require("dgram");
const host = process.argv[2];
const servers = ["1.1.1.1", "8.8.8.8"];

if (!host) {
  process.exit(1);
}

// Construction d'une requête DNS A minimale
function buildQuery(name) {
  const parts = ["12", "34", "01", "00", "00", "01", "00", "00", "00", "00", "00", "00"];
  const header = Buffer.from(parts.map((h) => parseInt(h, 16)));
  const qname = Buffer.concat(
    name.split(".").map((label) => {
      const b = Buffer.from(label, "ascii");
      return Buffer.concat([Buffer.from([b.length]), b]);
    }).concat([Buffer.from([0x00])])
  );
  const qtail = Buffer.from([0x00, 0x01, 0x00, 0x01]); // QTYPE=A, QCLASS=IN
  return Buffer.concat([header, qname, qtail]);
}

// Parse minimal de la réponse : sauter en-tête (12 o) + question, lire la
// première réponse de type A (1) et longueur 4.
function parseAnswer(msg) {
  let answers = msg.readUInt16BE(6);
  let i = 12;
  while (msg[i] !== 0) i += msg[i] + 1;
  i += 5; // octet 0 + QTYPE(2) + QCLASS(2)
  for (let a = 0; a < answers; a++) {
    // Nom (pointeur compression ou étiquettes)
    while (msg[i] !== 0) {
      if ((msg[i] & 0xc0) === 0xc0) { i += 2; break; }
      i += msg[i] + 1;
    }
    if ((msg[i - 2] & 0xc0) === 0xc0) { /* déjà positionné */ } else { i += 1; }
    const type = msg.readUInt16BE(i);
    i += 8; // TYPE(2) + CLASS(2) + TTL(4)
    const len = msg.readUInt16BE(i);
    i += 2;
    if (type === 1 && len === 4) {
      return [msg[i], msg[i + 1], msg[i + 2], msg[i + 3]].join(".");
    }
    i += len;
  }
  return null;
}

function query(server) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const timer = setTimeout(() => {
      socket.close();
      resolve(null);
    }, 4000);
    socket.on("message", (msg) => {
      clearTimeout(timer);
      socket.close();
      try {
        resolve(parseAnswer(msg));
      } catch {
        resolve(null);
      }
    });
    socket.on("error", () => {
      clearTimeout(timer);
      try { socket.close(); } catch {}
      resolve(null);
    });
    socket.send(buildQuery(host), 53, server, (err) => {
      if (err) {
        clearTimeout(timer);
        try { socket.close(); } catch {}
        resolve(null);
      }
    });
  });
}

(async () => {
  for (const server of servers) {
    const ip = await query(server);
    if (ip) {
      console.log(ip);
      process.exit(0);
    }
  }
  process.exit(1);
})();
