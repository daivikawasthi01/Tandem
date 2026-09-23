import { Server } from "@hocuspocus/server";

//Hocuspocus's API written in plain JS syntax

//Hocus pocus is an open source webocket backend built on top of yjs
//Merges concurrent user edits without conflicts using Conflict-free Replicated Data Types (CRDTs).
const options = { port: 1234 }; //a plain config object
const server = new Server(options); //create a new server by passing this object
server.listen();