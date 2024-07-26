const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const searchService = require('./search-service');
const { connectDB } = require('./db');

const PROTO_PATH = path.resolve(__dirname, '../../../proto/search.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const searchProto = grpc.loadPackageDefinition(packageDefinition).search;

const server = new grpc.Server();

server.addService(searchProto.SearchService.service, searchService);

connectDB().then(() => {
  server.bindAsync('0.0.0.0:3002', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Search service running on port ${port}`);
    server.start();
  });
}).catch(err => {
  console.error('Failed to connect to database', err);
});