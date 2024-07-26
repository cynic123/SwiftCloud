const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const popularityService = require('./popularity-service');
const { connectDB } = require('./db');

const PROTO_PATH = path.resolve(__dirname, '../../../proto/popularity.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const popularityProto = grpc.loadPackageDefinition(packageDefinition).popularity;

const server = new grpc.Server();

server.addService(popularityProto.PopularityService.service, popularityService);

connectDB().then(() => {
  server.bindAsync('0.0.0.0:3003', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Popularity service running on port ${port}`);
    server.start();
  });
}).catch(err => {
  console.error('Failed to connect to database', err);
});