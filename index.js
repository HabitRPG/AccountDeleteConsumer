require('dotenv').config()
const Kafka = require("node-rdkafka");
const GoogleSheets = require('./google-sheets');

const kafkaConf = {
  'group.id': process.env.CLOUDKARAFKA_GROUP_ID,
  'metadata.broker.list': process.env.CLOUDKARAFKA_BROKERS.split(","),
  'socket.keepalive.enable': true,
  'security.protocol': 'SASL_SSL',
  'sasl.mechanisms': 'SCRAM-SHA-256',
  'sasl.username': process.env.CLOUDKARAFKA_USERNAME,
  'sasl.password': process.env.CLOUDKARAFKA_PASSWORD,
  debug: 'generic,broker,security'
};

const prefix = process.env.CLOUDKARAFKA_TOPIC_PREFIX;
const topics = [`${prefix}-default`];
const consumer = new Kafka.KafkaConsumer(kafkaConf, {
  'auto.offset.reset': 'beginning',
});
const numMessages = 5;

let counter = 0;

consumer.on('error', (err) => {
  console.log(err)
})

consumer.on('ready', (arg) => {
  console.log(`Consumer ${arg.name} - ${topics} ready`);
  consumer.subscribe(topics);
  consumer.consume();
})

consumer.on('data', (m) => {
  counter++;

  const value = m.value.toString();
  const parsed = JSON.parse(value);

  GoogleSheets.writeToSheets(m.key.toString(), parsed.feedback, parsed.username);
  console.log(m.value.toString())
})

consumer.on("disconnected", function(arg) {
  process.exit();
});

consumer.on('event.error', function(err) {
  console.error(err);
  process.exit(1);
});

consumer.on('event.log', function(log) {
  // console.log(log);
});

consumer.connect();

process.on('exit', () => {
  consumer.disconnect();
})
