const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const songService = require('./song-service');
const { connectDB } = require('./db');

const PROTO_PATH = path.resolve(__dirname, '../../../proto/song.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const songProto = grpc.loadPackageDefinition(packageDefinition).song;

const server = new grpc.Server();

server.addService(songProto.SongService.service, songService);

connectDB().then(() => {
  server.bindAsync('0.0.0.0:3001', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Song service running on port ${port}`);
    server.start();
  });
}).catch(err => {
  console.error('Failed to connect to database', err);
});