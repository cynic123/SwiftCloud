const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const trendService = require('./trendService');
const { connectDB } = require('./db');

const PROTO_PATH = path.resolve(__dirname, '../../../proto/trend.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const trendProto = grpc.loadPackageDefinition(packageDefinition).trend;

const server = new grpc.Server();

server.addService(trendProto.TrendService.service, trendService);

connectDB().then(() => {
  server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Trend service running on port ${port}`);
    server.start();
  });
}).catch(err => {
  console.error('Failed to connect to database', err);
});